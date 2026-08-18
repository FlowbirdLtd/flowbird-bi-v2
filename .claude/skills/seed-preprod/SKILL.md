---
name: seed-preprod
description: Seed realistic, cleanly-removable test data into the PRE-PROD Supabase project (cbpygbhedyhcqtjutuwz) so features can be tested end-to-end before release. Introspects the live preprod schema, generates FK-consistent data scoped to a module or scenario, registers every row for precise cleanup, and never touches production. Use whenever testing needs data in preprod — seeding a module or scenario, or cleaning up a previous seed run. Reach for it proactively when an end-to-end test can't proceed for lack of data.
---

# Seed Preprod

Creates test data in **pre-prod only** so a feature can be exercised with realistic
records (clients with engagements, agreements with periods, tasks with time entries,
invoices in various states) instead of an empty database.

## Hard rules

1. **Preprod only — verified, not assumed.** All SQL goes through the
   `supabase-preprod` MCP server (`mcp__supabase-preprod__execute_sql`). Before the
   first write of a run, call `mcp__supabase-preprod__get_project_url` and confirm the
   host is exactly `cbpygbhedyhcqtjutuwz.supabase.co`. Any other value → **stop**.
2. **Never fall back to the prod server — or to env vars.** If `supabase-preprod` tools
   are missing or unauthenticated, stop and give the user the connection steps (Step 0).
   Do not substitute `mcp__supabase__*` (that is production; a PreToolUse hook blocks
   writes through it — a blocked call there means you are on the wrong server, not that
   you should work around the hook). Do not go looking for a database URL in `.env.local`
   (doesn't exist by design), 1Password, or `VITE_*` vars — those are *frontend* anon-key
   credentials, RLS-bound and the wrong layer entirely. This skill needs no URL or secret:
   the MCP server's project ref is pinned in `.mcp.json`.
3. **No seed data via repo migrations.** Files in `supabase/migrations/` replay onto
   preprod automatically *and ship to prod at release*. Seed SQL is executed directly
   against preprod and never committed as a migration.
4. **Every seeded row is registered and identifiable.** Deterministic UUIDs with the
   `5eed0000-` prefix, human-visible `[TEST]` name prefixes, and a row in
   `_seed_registry` per insert. Data you can't cleanly remove is data you don't create.
5. **Never create auth users.** `team_members` mirrors `auth.users` — reference the
   team members that already exist in preprod; if none exist, stop and say so.
6. **Cleanup deletes only what the registry lists**, children before parents. Never a
   bare `delete from <table>` on shared tables.
7. **Idempotent inserts.** Deterministic IDs + `on conflict (id) do nothing` — re-running
   a scenario must not duplicate data.

Rules 1, 3, and 6 are also enforced mechanically by a PreToolUse hook
(`.claude/hooks/guard-preprod-sql.sh`): it verifies `.mcp.json` still pins the preprod
ref, blocks `apply_migration` and all DDL except `create table if not exists
_seed_registry`, and rejects any DELETE/UPDATE that doesn't reference `_seed_registry`
or `5eed0000`. A blocked call means the operation is out of contract — restructure it
(usually register-then-delete); never ask for the `.claude/allow-preprod-ddl` override
to make seeding "work".

## Step 0 — Environment gate

```
mcp__supabase-preprod__get_project_url   → must return https://cbpygbhedyhcqtjutuwz.supabase.co
```

**If `mcp__supabase-preprod__*` tools don't exist in this session**, the server isn't
connected — stop and tell the user exactly this, then wait:

> The `supabase-preprod` MCP server isn't connected in this session. Run `/mcp` — if
> `supabase-preprod` isn't listed, restart the session so `.mcp.json` is re-read and
> approve the server when prompted. Then select it in `/mcp` and complete the one-time
> browser sign-in (same Supabase account as the prod server). Re-run `/seed-preprod`
> afterwards.

There is no workaround via env vars, `.env.local`, 1Password, or the prod server (rule 2).

Then ensure the registry exists (execute on **preprod**, never as a migration):

```sql
create table if not exists _seed_registry (
  run_id     text not null,
  scenario   text not null,
  table_name text not null,
  row_id     uuid not null,
  fk_depth   int  not null default 0,   -- higher = deeper child; delete depth desc
  created_at timestamptz not null default now(),
  primary key (table_name, row_id)
);
```

`run_id` is `seed-YYYYMMDD-<n>` (date from the environment, `<n>` increments past any
existing run that day).

## Step 1 — Scope the scenario

From `$ARGUMENTS` or the conversation, pin down **what is being tested** — that decides
the shape, not volume. Typical scenarios: `crm` (clients, contacts, deals, activities),
`billing` (agreements, periods, invoices across draft/sent/paid), `work` (engagements,
tasks, time entries), `support`, `agreements`, or a feature-specific ask ("an engagement
with 3 overdue tasks and a running hour pack"). Small and pointed beats big and generic
— default to ~3–5 parent rows per scenario with realistic children, not hundreds.

If the ask is `cleanup`, skip to Step 5.

## Step 2 — Introspect the live schema

Never generate inserts from memory or from the migrations folder — preprod is the
source of truth for its own schema:

- `mcp__supabase-preprod__list_tables` (verbose) for the scenario's tables → columns,
  NOT NULLs, FKs. The FK constraints give the insert order and `fk_depth`.
- Sample 2–3 real rows per table (`select … limit 3`) to copy realistic shapes: status
  enums actually in use, jsonb structure, numbering formats.
- Check soft-delete columns (`archived_at`) and any numbering sequences — let defaults
  and triggers fire rather than hand-setting sequence-owned values.
- Fetch existing `team_members` ids for owner/assignee columns.

## Step 3 — Plan, then show before writing

Present a short table — scenario, tables touched, rows per table, run_id — and the one
non-obvious consequence: **preprod cron jobs are live** (env-aware URLs are seeded), so
e.g. seeded agreements with active hour packs *will* be picked up by the invoice
generators. That's usually the point of testing in preprod; call it out so it's chosen,
not discovered. Get a nod if the scenario wasn't explicitly specified.

## Step 4 — Apply

Per table, parents first:

```sql
insert into clients (id, name, …)
values ('5eed0000-0000-4000-a000-000000000001', '[TEST] Acme Rockets Ltd', …)
on conflict (id) do nothing;

insert into _seed_registry (run_id, scenario, table_name, row_id, fk_depth)
values ('seed-…', '<scenario>', 'clients', '5eed0000-0000-4000-a000-000000000001', 0)
on conflict do nothing;
```

- UUIDs: `5eed0000-0000-4000-a000-<12-digit serial>` — unique serial per row across
  the run.
- Realistic values: plausible UK company/contact names, dates spread over recent
  months, money values that exercise the feature (round and non-round amounts) —
  matching the shapes sampled in Step 2.
- Batch related inserts into one `execute_sql` call per table where practical.

Verify: count registry rows vs planned, and run one scenario-level join (e.g. seeded
client → engagements → tasks) to prove the FK chain is navigable.

## Step 5 — Cleanup (`/seed-preprod cleanup [run-id]`)

1. Environment gate (Step 0) again.
2. `select distinct run_id, scenario, count(*) from _seed_registry group by 1, 2` —
   if no run-id was given, show this and ask which to remove.
3. Delete children first:
   ```sql
   -- per table, ordered by fk_depth desc:
   delete from <table> where id in
     (select row_id from _seed_registry where run_id = $1 and table_name = '<table>');
   delete from _seed_registry where run_id = $1;
   ```
4. Report rows deleted per table; flag any row the delete couldn't remove (an FK from
   data created *outside* the run — e.g. a cron-generated invoice referencing a seeded
   agreement). Remove those by **registering them first**: INSERT the orphan's
   table/row_id into `_seed_registry` under the same run_id, then delete via the
   registry as normal. This is not just bookkeeping — the preprod guard hook only
   permits DELETEs that select their rows through `_seed_registry` or the `5eed0000`
   marker.

## Report format

```
SEEDED (run_id: seed-…)
- <table>: N rows — <one line on shape>
- verification: <join query result — FK chain navigable>
- cron note: <which generators may act on this data, or "none">

TEST IT
- <where to look in the preprod app — route + what should be visible>

CLEANUP
- /seed-preprod cleanup seed-…
```

## What this skill is not

Not a load-testing tool (volumes stay small), not a prod data fixer (the prod MCP is
SELECT-only by hook), and not a fixtures library for Vitest — unit tests keep their
inline mocks per `docs/conventions/testing.md`.
