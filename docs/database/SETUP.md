# Flowbird BI v2 — Backend Setup From Scratch

How to reconstruct the entire Supabase backend in a fresh account/project
(e.g. moving from a personal account to the team account).

> **TL;DR** — a fresh rebuild needs only `schema.sql` + `policies.sql`, the two
> edge functions, auth URL config, and a bootstrapped first user. The
> `migration_*.sql` files are historical fixes already folded into
> `schema.sql` — do **not** run them on a new project.

---

## 1. Create the project

1. supabase.com → team organisation → **New project**.
2. Pick the region closest to users (e.g. London), set a strong database
   password and store it safely (it cannot be retrieved later).
3. From **Settings → API**, note:
   - **Project URL** — frontend + CLI
   - **anon (public) key** — frontend
   - **service_role key** — never in the frontend; edge functions receive it
     automatically

## 2. Tables, functions, triggers

SQL Editor → New query → paste and run **`schema.sql`**.

Creates:
- Tables: `organisations`, `contacts`, `deals`, `users`, `import_history`
  (RLS enabled on all)
- Indexes on FK/search columns
- `handle_user_delete()` trigger — deleting a `public.users` row also removes
  the matching `auth.users` account
- `create_user_with_auth()` RPC — atomic auth + profile user creation

## 3. Row Level Security policies

Run **`policies.sql`**.

Grants:
- SELECT on organisations/contacts/deals/users to `anon` + `authenticated`
- INSERT/UPDATE on organisations/contacts/deals to `authenticated`
  (required by the Import feature)
- import_history read/insert/delete to `authenticated`
- users delete + self-update policies

Without this step every query from the app fails or returns nothing.

### Optional — development test data only

| Order | File            | Purpose                                          |
|-------|-----------------|--------------------------------------------------|
| 1     | `auth_users.sql`| Auth accounts for 10 test users (`Flowbird2024!`)|
| 2     | `seed.sql`      | Sample orgs, contacts, deals, users              |

Skip both for a production/team rebuild — real data arrives via Pipedrive
sync or CSV import, and real users via the invite flow.

## 4. Auth configuration

**Authentication → URL Configuration**:
- **Site URL**: the app URL (`http://localhost:5173` during development)
- **Redirect URLs**: add `<app-url>/set-password` — invite emails send new
  users there to choose a password

Email/password sign-in is enabled by default. The built-in email service
only sends a handful of emails per hour — configure custom SMTP
(**Authentication → Emails**) before inviting the whole team.

## 5. Edge functions

From the repo root (Supabase CLI installed):

```bash
supabase login
supabase link --project-ref <new-project-ref>
supabase functions deploy sync-pipedrive
supabase functions deploy manage-user
```

No manual secrets required: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are injected into every function automatically. The Pipedrive API token is
stored per-user in `users.pipedrive_api_token` (saved from Account Settings →
Integrations), not as a function secret.

| Function        | Purpose                                                        |
|-----------------|----------------------------------------------------------------|
| `sync-pipedrive`| Full + single-record sync of orgs/contacts/deals from Pipedrive|
| `manage-user`   | Invite, edit, delete users (Admin/Developer only), self-update |

## 6. Point the frontend at the new project

`.env.local` in the project root:

```
VITE_SUPABASE_URL=<Project URL>
VITE_SUPABASE_ANON_KEY=<anon key>
```

Restart `npm run dev` after changing it.

## 7. Bootstrap the first user

The Users page requires an Admin/Developer to already be logged in, so the
first user is created manually:

1. **Authentication → Users → Add user** — email + password, auto-confirm.
2. Copy the created user's UUID, then in SQL Editor:

```sql
insert into public.users (id, name, email, user_permissions, user_status)
values ('<auth-user-uuid>', 'Your Name', 'you@flowbird.co.uk',
        ARRAY['Developer'], 'active');
```

3. Log in. Developer permission shows every feature (Admin sees Import but
   not Integrations; Staff sees only My Profile and read-only pages).

## 8. Repopulate data

1. Account Settings → **Integrations** → save the Pipedrive API token.
2. Sync in FK order: **Organisations → Contacts → Deals**
   (contacts reference organisations, deals reference both — all by
   Pipedrive ID).
3. Alternatively use Account Settings → **Import** with CSVs in the same
   order. Every import must map the relevant Pipedrive ID column
   (`org_pipedrive_id` / `contact_pipedrive_id` / `deal_pipedrive_id`).
4. Invite the rest of the team from the Users page.

## Post-rebuild checklist

- [ ] Log in works (first user)
- [ ] Deals/Organisations/Contacts pages load without RLS errors
- [ ] Pipedrive sync succeeds in order orgs → contacts → deals
- [ ] CSV import works and Import History records entries
- [ ] Inviting a user sends an email that lands on `/set-password`
- [ ] A Staff test user sees read-only Users page and only My Profile in
      Account Settings
