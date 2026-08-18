# Flowbird BI v2 — Backend Setup From Scratch

How to reconstruct the entire Supabase backend in a fresh account/project
(e.g. moving from a personal account to the team account).

> Running the backend **on your own machine** instead? Skip to
> [Local development](#local-development) at the bottom — it's a single
> `supabase start` + `supabase db reset`, no dashboard steps.

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

`sync-pipedrive` calls Pipedrive's **API v2** for all record endpoints
(deals, persons, organizations, stages, pipelines, search) — v1 record
endpoints are deprecated end of July 2026. Field-definition endpoints
(`dealFields`, `personFields`, `organizationFields`) and `/users` have no
v2 equivalent and intentionally remain on v1; see the comment at the top
of the function file.

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

3. Log in. Developer permission shows every feature, including
   Integrations (its own sub-menu: **APIs** for the Pipedrive token,
   **Sync** for full/single-record sync). Admin sees Import but not
   Integrations. Staff sees only My Profile and read-only pages.

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

---

# Local development

Everything above is for a **hosted** project. To run the whole backend on your
own machine, use the Supabase CLI — no dashboard, no `supabase link`, nothing
remote. The repo is deliberately **unlinked**; never run `supabase link`,
`supabase db push`, or `supabase functions deploy` from a dev session.

## What's committed

| Path | Role |
|------|------|
| `supabase/config.toml` | Local stack config — ports, auth URLs, seed order, function registration |
| `supabase/migrations/20260101000000_schema.sql` | Mirror of `schema.sql`, replayed by `db reset` |
| `supabase/migrations/20260101000001_policies.sql` | Mirror of `policies.sql` |
| `supabase/seeds/` | Gitignored — drop your own `*.sql` here for per-branch test data |

The migrations are **copies** of `schema.sql` / `policies.sql`. Change one, change
the other — `docs/database/` stays the artefact you paste into a hosted SQL Editor,
`supabase/migrations/` is what the local stack replays.

## Ports

This project runs on **55321–55327**, not the CLI defaults, so it can coexist
with another local Supabase stack on the same machine.

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:55321 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:55322/postgres |
| Studio | http://127.0.0.1:55323 |
| Mailpit (email) | http://127.0.0.1:55324 |

## Bring it up

```bash
supabase start          # needs Docker running; first run pulls images
supabase db reset       # replays both migrations, then seeds
supabase status         # prints the URLs + keys
```

`db reset` seeds in this order (wired in `config.toml` under `[db.seed]`):

1. `docs/database/auth_users.sql` — 10 auth accounts, all `Flowbird2024!`
2. `docs/database/seed.sql` — 10 orgs, 12 contacts, 12 deals, 10 profiles
3. `supabase/seed_local_admin.sql` — the local admin login below
4. `supabase/seeds/*.sql` — your own additions, if any

`auth_users.sql` must stay first: `public.users.id` FKs to `auth.users(id)`.

## Logging in

Use the dedicated local admin — it holds all three permissions
(`Staff`, `Admin`, `Developer`), so every feature is visible, including
Integrations (APIs + Sync), Import, and user management:

```
admin@flowbird.test
flowbird-local
```

It's re-created by every `db reset` from `supabase/seed_local_admin.sql`
(idempotent, so it's also safe to run by hand). Known committed credential —
**local only**, never run that file against a hosted project.

The 10 `@pfgl.co.uk` accounts from `seed.sql` also work (all `Flowbird2024!`)
and are useful for checking permission tiers — e.g. a Staff-only account should
see read-only pages and just My Profile under Account Settings.

## Point the app at it

`.env.local` (gitignored) — take the anon key from `supabase status`:

```
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=<anon key from supabase status>
```

Then `npm run dev` (pinned to port 5174 in `vite.config.js`). The browser network tab should only ever show `127.0.0.1` —
if a hosted project ref appears there, `.env.local` is wrong.

## Edge functions

```bash
supabase functions serve      # separate terminal; hot-reloads both functions
```

Both are registered in `config.toml` with `verify_jwt = true`, and read only
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, which the runtime injects — there
are no local secrets to set.

- `manage-user` works fully offline. Invite emails go to **Mailpit**
  (http://127.0.0.1:55324), not a real inbox; the invite link redirects to
  `http://localhost:5174/set-password`, which is allow-listed in
  `config.toml` under `auth.additional_redirect_urls`.
- `sync-pipedrive` calls the **live** Pipedrive API using the token in
  `users.pipedrive_api_token`. Without a real token it does nothing useful
  locally — the seed data covers UI work instead.

## Notes / gotchas

- **`crypt()` needs the `extensions` schema on the search_path.** pgcrypto is
  installed into `extensions` by `schema.sql`; the hosted SQL Editor has it on
  the path but `psql` / `db reset` does not. `auth_users.sql` sets it explicitly
  at the top — don't remove that line.
- **Rows written straight into `auth.users` must not leave GoTrue's token
  columns NULL** (`email_change`, `email_change_token_new`, …). GoTrue scans
  them into non-nullable strings, so a NULL makes every login fail with a 500
  "Database error querying schema". Both writers handle this: `auth_users.sql`
  normalises them in STEP 3, and `create_user_with_auth()` inserts `''`.
- **RLS is permissive.** `anon` can read every table including `users`, and any
  authenticated user can update any organisation/contact/deal. Fine locally;
  worth revisiting before this schema is treated as production-hardened.
- **Shut down** with `supabase stop` (keeps data) or `supabase stop --no-backup`
  (discards it — the local DB is disposable).
