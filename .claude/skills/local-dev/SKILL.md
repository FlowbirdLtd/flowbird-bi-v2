---
name: local-dev
description: Run and develop Flowforce against the LOCAL Supabase stack only — start the stack, wire .env.local, run `npm run dev`, apply migrations locally, and serve edge functions, with hard guardrails that keep every command off preprod and prod (no 1Password-wrapped scripts, no `supabase link`, no db push, no MCP applies). Use whenever the task is running the app locally, testing changes locally, standing up or resetting the local database, or iterating on schema/edge functions before anything ships. If a request would point local work at a remote project, this skill is the checklist that stops it.
---

# Local dev

Develop against the **local Supabase stack** (`supabase start` on 127.0.0.1) and
nothing else. Everything remote — preprod (`cbpygbhedyhcqtjutuwz`) and prod
(`qhburcctdlpauqvdecbu`) — is reached only by the pipeline (merge to `preprod`,
version tag → `release-prod.yml`), never from a dev loop. See `/ship` and
`docs/sdlc-sop.md` for how changes leave your machine.

## Ground rules — the remote-touch vectors (never cross these)

There are exactly four ways a "local" session can accidentally touch a real
environment. Guard all four:

1. **1Password-wrapped npm scripts.** `dev:preprod`, `dev:prod`, `build:preprod`,
   `build:prod`, `preview`, `preview:prod` all run under `op run`, which injects
   real `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` that **override `.env.local`**.
   The app then reads and **writes real preprod/prod data** through the anon key +
   the user's session. For development work use **`npm run dev` only**. The wrapped
   scripts are for deliberate, user-requested verification against a shared
   environment — never a default, never "to get data to test with" (that's
   `/seed-preprod`, on preprod, via its own guardrails).

2. **`supabase link`.** This repo is deliberately **unlinked**
   (`supabase/.temp/project-ref` does not exist). Unlinked, `supabase db push`,
   `supabase functions deploy`, and friends have no remote target and fail loudly.
   **Never run `supabase link`**, and never pass `--project-ref`/`--linked` to any
   command. If a command complains it needs a linked project, that command was
   about to touch a remote — stop, it's the wrong command for local work.

3. **`supabase db push` / `supabase functions deploy` / `supabase secrets set`.**
   Never, in any environment, from a dev session. Migrations and functions reach
   preprod by **merging to `preprod`** (Branching applies them) and reach prod by
   the **version-tag workflow**. There is no local variant of `db push` you need —
   local applies use `db reset` / `migration up` (below).

4. **Supabase MCP tools.** Both MCP servers (`mcp__supabase__*` = prod,
   `mcp__supabase-preprod__*` = preprod) point at **real remote projects** — there
   is no "local" MCP. During local dev use them read-only for comparison at most
   (`list_migrations`, `list_tables`); never `apply_migration` or `execute_sql`
   writes as part of a local workflow. The local database is reached via the CLI
   or `psql`, not MCP.

## Step 0 — Preflight (run before starting anything)

```bash
cd /Users/sanskar/Desktop/flow_force/flow_force

# 1. CLI must be unlinked — this file must NOT exist
test -f supabase/.temp/project-ref && echo "LINKED — STOP" || echo "unlinked OK"

# 2. .env.local must exist and point at the local stack
grep -H '^VITE_SUPABASE_URL=' .env.local
```

- If `LINKED — STOP`: do not proceed. Report to the user; removing a link
  (`supabase unlink`) is their call — something linked it deliberately or by
  accident, and they need to know either way.
- If `.env.local` is missing: `cp .env.local.example .env.local` (gitignored,
  per-engineer; the example holds the CLI's shared local-dev defaults — public,
  not secrets). After `supabase start`, replace the placeholder anon key with the
  **Publishable key** printed by `supabase status`.
- If `VITE_SUPABASE_URL` is anything other than `http://127.0.0.1:54321`: stop and
  flag it. A remote ref in `.env.local` means plain `npm run dev` — the "safe"
  script — is pointed at a real environment.

## Step 1 — Start the stack

```bash
supabase start     # needs Docker running; first run pulls images (slow)
supabase status    # prints API URL, DB URL, Studio URL, and the keys
```

The local stack: API `127.0.0.1:54321`, Postgres `127.0.0.1:54322`, Studio
`127.0.0.1:54323`. Copy the Publishable key from `supabase status` into
`.env.local` if it differs.

Then build the schema — **the migrations in the repo ARE the schema**:

```bash
supabase db reset   # replays supabase/migrations/* + seed layers (see below) from scratch
```

If `db reset` fails on a migration, that's a real finding (repo↔schema drift —
see `docs/audit/findings.md`); report it, don't hand-patch the local DB to limp
past it.

### Seed data

`db reset` seeds in two layers (configured via `[db.seed] sql_paths` in
`supabase/config.toml`):

1. **`supabase/seed.sql`** — the shared, committed baseline. It creates a test
   admin login — **`admin@flowforce.test` / `flowforce-local`** — with every
   access flag on (`is_admin`, `access_billing`, `manages_hr`, `manages_huddle`,
   `access_portal_invites`, team `tech`), plus a small dataset: 3 clients, 4
   contacts, 3 engagements, 2 agreements, 5 tasks, 3 support tickets, and 4 time
   entries. It also runs on Branching preview branches, so keep it idempotent
   (fixed UUIDs + `ON CONFLICT DO NOTHING`) and never put anything
   environment-specific or secret in it.
2. **`supabase/seeds/*.sql`** — gitignored, per-engineer extensions. Any `.sql`
   file dropped here runs after the baseline on every reset. Same idempotency
   style as the baseline, so repeated resets stay clean. Local-only by
   definition — these files never ship.

**After every `db reset`, tell the user the baseline seed ran** (the admin login
above and the dataset summary), **and ask whether they want a personal seed in
`supabase/seeds/` for whatever they're currently working on** — e.g. rows for
the module or edge case their branch touches. If yes, introspect the relevant
tables' columns and check constraints first (via local `psql`), write an
idempotent file like `supabase/seeds/<topic>.sql`, and prove it with another
`db reset`. Seed the local DB through `seeds/` files rather than one-off SQL
inserts — ad-hoc rows vanish on the next reset and then "missing data" bugs get
chased that aren't real.

## Step 2 — Run the app

```bash
npm run dev         # Vite on the local stack via .env.local — the ONLY dev script
```

Sanity check in the browser: the network tab / URL bar should show only
`127.0.0.1`. If you ever see `qhburcctdlpauqvdecbu` or `cbpygbhedyhcqtjutuwz` in a
request, kill the server and re-run Step 0.

Tests (`npm run test`, `npx vitest run`) are mocked and need no stack.

## Step 3 — Local database work

- **Apply committed migrations**: `supabase db reset` (full replay, includes
  `seed.sql`) or `supabase migration up` (pending only). Both default to local —
  keep it that way (no `--linked`).
- **Iterate on schema**: run SQL directly against local Postgres —
  `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres` or
  `supabase db query --local` (CLI ≥ 2.79). Iterate freely; the local DB is
  disposable.
- **Commit the change as a migration**: `supabase migration new <descriptive_name>`
  to create the timestamped file, write the final SQL into it, then prove it
  replays: `supabase db reset`. Never invent filenames or reuse a version
  timestamp (preprod/prod ledgers require unique versions).
- **New/changed migration files** → run `/migration-review` before any PR, and
  `npm run cron-guard` if the SQL touches cron-invoked functions. Shipping them is
  `/ship`'s job — from this skill, migrations only ever apply to 127.0.0.1.

## Step 4 — Edge functions locally

```bash
supabase functions serve <name>   # hot-reloads; runs against the local stack
```

Functions needing secrets (Slack webhooks, Xero keys, …) read them from an
`--env-file`: create a gitignored `supabase/functions/.env` with placeholders or
test values — **never** paste real prod secrets into it, and never `supabase
secrets set` (that writes to a remote project). Shared-helper behaviour like
`withAlert` no-ops when its secret is unset, which is exactly right locally.

Invoke locally with the local anon key:

```bash
curl -s http://127.0.0.1:54321/functions/v1/<name> \
  -H "Authorization: Bearer $LOCAL_ANON_KEY" -H "Content-Type: application/json" -d '{}'
```

## Step 5 — Shut down

```bash
supabase stop            # keeps data volumes
supabase stop --no-backup  # discard local data entirely (it's disposable)
```

## Red flags — stop immediately if you're about to run…

| Command / sight | Why it's a stop |
|---|---|
| `npm run dev:preprod`, `dev:prod`, `build:*`, `preview*` | `op run` points the app at real data |
| `supabase link`, `--project-ref`, `--linked` | creates/uses a remote target |
| `supabase db push` | applies migrations to a remote ledger — merge-only pipeline owns that |
| `supabase functions deploy`, `supabase secrets set` | deploys/writes to a remote project |
| `mcp__supabase*__apply_migration` / `execute_sql` (write) | both MCP servers are remote |
| A remote project ref in `.env.local` or the browser network tab | the "safe" path is compromised — re-run Step 0 |

When in doubt: if a command's target isn't `127.0.0.1`, it doesn't belong in
local dev.
