# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                    # Vite dev server — port 5174, strictPort (see below)
npm run build
npm run lint
npm run test                   # Vitest (watch)
npm run test -- --run          # single pass
npm run test -- --run src/tests/foo.test.jsx   # one file
npm run test -- --run -t "renders empty state" # one test by name
```

The dev port is pinned to **5174** with `strictPort` because it must match
`auth.additional_redirect_urls` in `supabase/config.toml` — the invite →
`/set-password` flow compares the redirect URL exactly. A port clash should fail
loudly, not drift.

Local Supabase stack (`supabase start`) uses non-default ports: API 55321,
DB 55322, Studio 55323, Inbucket 55324.

## What this app is

An internal BI dashboard over a Pipedrive CRM. Deals, organisations, contacts,
and users are **mirrored from Pipedrive into Supabase** by an edge function;
the React app reads that mirror. It is not the system of record for CRM data —
Pipedrive is.

## Architecture

**Frontend:** React 19 + Vite, React Router v7, TanStack Query, Tailwind v4.
List pages are built on the shared table system in `src/components/table/`:
a page supplies a column config and a stats function from
`src/features/<domain>/columns.jsx`, and `TableShell` + `useTableState` handle
search, sorting, pagination, column visibility and layout. Change the chrome in
`TableShell` and all four list pages move together. Column visibility persists
per user in localStorage under `flowbird.table.<name>.columns`.
`AccountSettingsPage.jsx` is still by far the largest file and hosts Pipedrive
sync, CSV import, and profile management.

**Auth flow:** `AuthProvider` (`src/contexts/AuthContext.jsx`) holds the Supabase
session and subscribes to `onAuthStateChange`. `AppRouter` puts everything except
`/login` and `/set-password` behind `ProtectedRoute` + `AppLayout`. New users are
created by invite email, land on `/set-password`, and only then become active.

**Data layer:** one Supabase client, `platform`, exported from
`src/lib/platformClient.js`. Every read goes through a hook in `src/hooks/`
(`useDeals`, `useContacts`, `useOrganisations`, `useUsers`) using TanStack Query
with the table name as the query key. Related rows are pulled with PostgREST
embeds (`contact:contacts(...)`, `organisation:organisations(...)`) rather than
separate round-trips.

**Privileged operations go through edge functions, never the browser client:**
- `supabase/functions/manage-user` — create/update/delete users. Verifies the
  caller's JWT, then gates on `users.user_permissions` containing `Admin` or
  `Developer`; the one exception is `action: 'update-self'`. Uses the service
  role key to call `auth.admin.inviteUserByEmail`.
- `supabase/functions/sync-pipedrive` — pulls Pipedrive into Supabase.

Both are invoked via `platform.functions.invoke(...)`.

### Pipedrive sync — the parts that bite

- **Pipedrive IDs are the join keys.** `contacts.organisation_id` and
  `deals.contact_id` / `deals.organisation_id` are `text` columns referencing
  `org_pipedrive_id` / `contact_pipedrive_id`, *not* the uuid PKs. All writes are
  `upsert(..., { onConflict: '<entity>_pipedrive_id' })`, so sync is idempotent.
- **Sync order matters:** organisations → contacts → deals, so FKs resolve.
- **API versions are deliberately mixed.** Record endpoints (deals, persons,
  organizations, stages, pipelines, `/search`) are v2; field-definition endpoints
  (`dealFields`, `personFields`, `organizationFields`) and `users` have no v2
  equivalent and stay on v1. Don't "modernize" the v1 calls.
- **Archived deals must be requested explicitly** — v2 filters them out by
  default, so the function fetches `is_archived=false` and `true` and dedupes.
- **Custom fields are account-specific hash keys** hardcoded at the top of
  `sync-pipedrive/index.ts` (`ORG_FIELDS`, `CONTACT_FIELDS`); enum values are
  resolved through field-definition metadata at runtime.
- Each user's Pipedrive API token lives in `users.pipedrive_api_token`, set from
  Account Settings — there is no global token secret.

### Database

Schema lives in **two places that must be kept in sync**:
- `supabase/migrations/20260101000000_schema.sql` + `…0001_policies.sql` — what
  `supabase db reset` replays into the local stack.
- `docs/database/schema.sql` + `policies.sql` — what gets pasted into the hosted
  SQL Editor when rebuilding a remote project (`docs/database/SETUP.md`).

Tables: `organisations`, `contacts`, `deals`, `users`, `import_history` — RLS
enabled on all. Most CRM columns are `text`, mirroring Pipedrive's loose typing;
don't assume numeric/date types without checking the schema. `public.users.id`
is a FK to `auth.users(id)`, with a `handle_user_delete()` trigger that removes
the auth account when the profile row is deleted.

Seeds (`docs/database/auth_users.sql` then `seed.sql`, plus
`supabase/seed_local_admin.sql`) run automatically on `supabase db reset` via
`[db.seed]` in config.toml. Local admin login: `admin@flowbird.test` /
`flowbird-local` — local only, never against a hosted project.
`docs/database/migration_*.sql` files are historical and already folded into
schema.sql; do not run them on a fresh project.

## Conventions

`docs/conventions.md` is the authoritative style guide (862 lines) and is
auto-injected into context by the `PreToolUse` hook in `.claude/settings.json`
before any Edit/Write, along with the matching module spec from
`docs/spec/modules/`. Follow what it says over anything summarized here.

The short version of what the existing code actually does:
- Functional components, default export, PascalCase filename.
- Form state as a single object: `setForm(f => ({ ...f, [key]: val }))`.
- Theming via CSS variables in `src/index.css` (`--nav`, `--accent`, `--red`, …);
  inline styles carry dynamic values. Tailwind is available but used sparingly.
- Icons are inline local SVG components — no icon library.
- Never raw `fetch`/`useEffect` for server data; always a TanStack Query hook.
- `@` aliases `./src`.
- Tests go in `src/tests/` mirroring `src/`. The table system and all four list
  pages are covered (156 tests); `AccountSettingsPage`, the detail pages and the
  auth flow are not. `passWithNoTests` is still on, so check files actually ran.

## Skills

`.claude/skills/` holds project workflows — `local-dev`, `build-feature`,
`migration-review`, `ship`, `seed-local`, `write-tests`, `platform-audit`, and
others. They encode this repo's guardrails (notably: local work must never point
at a remote Supabase project, and migrations are written but not applied until
the user says go). Prefer them over improvising equivalent steps.
