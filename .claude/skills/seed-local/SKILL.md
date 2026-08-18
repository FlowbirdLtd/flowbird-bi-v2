---
name: seed-local
description: Seed behaviorally-faithful test data into the LOCAL Supabase stack (127.0.0.1 only) as durable, idempotent supabase/seeds/*.sql files — data whose links, foreign keys, and source rows match exactly what the app's real runtime writers (triggers, edge functions, mutations) would produce, so features render and navigate as they do in production. Use whenever local testing needs data — seeding a module, scenario, or edge case into the local database, adding rows for a feature under development, or fixing seeded data that makes a working feature look broken. LOCAL-ONLY, distinct from /seed-preprod (which targets the preprod project); never touches any remote environment.
---

# Seed Local

Creates test data in the **local Supabase stack only** so a feature can be exercised
against `npm run dev` with realistic records. The output is always a durable
`supabase/seeds/<topic>.sql` file, never one-off SQL.

The one principle everything below serves: **seed data must be relationally and
behaviorally faithful.** Every seeded row must satisfy the same invariants the app's
real runtime writer produces for that row type, so the feature renders and navigates
exactly as it does in production. Data that is structurally valid (passes FK / NOT
NULL constraints) but behaviorally wrong — dangling links, missing deep-link ids,
leaf rows with no source row — makes a working feature look broken and sends people
debugging code that is fine. This skill exists because exactly that happened: a
`task_mention` notification was seeded with `link='/work'` and no `task_id`, clicking
it went nowhere, and the notifications feature was suspected broken when only the
seed was.

## Hard rules

1. **Fidelity over validity.** Before seeding any table, find the code that writes it
   at runtime and copy its exact column contract (Step 2). Never invent row shapes
   from the table definition alone — a nullable column is not a column the app
   tolerates as null; the real producer may set it every time.
2. **Every reference resolves.** Deep-link columns (`link`, `url`, `href`) and every
   `*_id` must point at a row that actually exists — prefer the committed baseline's
   records (Step 3). A link to a generic list route or a made-up id is the exact
   failure mode this skill prevents.
3. **Local only.** All SQL targets 127.0.0.1 (via `db reset` or the
   `supabase_db_local` container). None of the four remote-touch vectors from
   `/local-dev` — `op`-wrapped npm scripts, `supabase link`/`--project-ref`/`--linked`,
   `db push`/`functions deploy`/`secrets set`, or Supabase MCP writes (both MCP
   servers are remote; there is no local MCP). Remote seeding is `/seed-preprod`.
4. **No seed data via repo migrations.** `supabase/migrations/` ships to prod. Local
   test data lives in gitignored `supabase/seeds/*.sql` files, full stop.
5. **Durable file first, apply second.** Write the `seeds/<topic>.sql` file, then
   apply it. Ad-hoc inserts vanish on the next `supabase db reset` and the missing
   data gets mis-debugged as a bug.
6. **Idempotent inserts.** Fixed UUIDs + `on conflict (id) do nothing`, so repeated
   resets stay clean.
7. **Depend only on the baseline.** `supabase/seed.sql` always runs first, so a
   personal seed may reference its rows. Sibling `seeds/*.sql` files run in
   alphabetical order among themselves — never depend on rows from another personal
   seed file.

## Step 0 — Preflight

Run `/local-dev` Step 0 (unlinked CLI, `.env.local` pointing at
`http://127.0.0.1:54321`) and confirm the stack is up (`supabase status`). If the
stack isn't running, start it per `/local-dev` Step 1 before seeding.

## Step 1 — Scope what's being tested

Pin down the feature or edge case the data must exercise — that decides the shape,
not volume. "Notifications panel with unread task mentions", "an engagement with
overdue tasks", "a ticket thread with a client reply". Small and pointed: a handful
of rows that hit the states the UI branches on, not hundreds.

## Step 2 — Find the real writer(s) and copy their contract

For **each table** the scenario seeds, locate what creates that row at runtime:

- A Postgres trigger — grep `supabase/migrations/` for `create trigger` /
  `create or replace function` on the table.
- An edge function — grep `supabase/functions/` for `.from('<table>').insert`.
- A frontend mutation — grep `src/` for the same.

Read the writer's INSERT and copy its exact column contract, especially deep-link
columns and every foreign key it sets. Worked example: the notifications writer
`notify_task_mentions` (an `after insert` trigger on `task_comments`, defined in
`supabase/migrations/20260722120001_notification_body_plaintext.sql`) always writes
`link='/tasks/'||task_id` with `task_id` and `comment_id` set, backed by a real
`task_comments` row on a real task. A faithful `task_mention` seed row therefore has
all three — `link='/tasks/<task_id>'`, `task_id`, `comment_id` — never `link='/work'`
with null ids.

Two corollaries:

- **Back derived rows with their source rows.** A notification about a comment needs
  the comment to exist; a "client replied" needs the thread/ticket. Don't fabricate
  the leaf without its branch.
- **Be trigger-aware.** If inserting the source row fires a trigger that creates the
  derived row, choose one path and note it in the seed file's header comment:
  (a) let the trigger create the derived row, then control demo state (timestamps,
  read/unread) with a follow-up `UPDATE`; or (b) suppress the trigger and hand-insert
  the derived row for full column/timing control. The notifications seed used (b):
  insert `task_comments` with `mentioned_ids='{}'` (trigger no-ops on empty array) →
  hand-insert `notifications` rows with controlled `created_at`/`read_at`/`link`/
  `task_id`/`comment_id` → backfill `mentioned_ids` with an `UPDATE` (the trigger is
  AFTER INSERT only, so the update doesn't re-fire it). Choosing neither — inserting
  a mention-bearing source row *and* hand-inserting the notification — silently
  double-creates rows.

## Step 3 — Write the idempotent `seeds/<topic>.sql` file

Target `supabase/seeds/<topic>.sql` (gitignored, runs after the baseline on every
reset). Anchor to the committed baseline in `supabase/seed.sql` wherever possible:

- Admin login `admin@flowforce.test` / `flowforce-local`, `team_members.id`
  `10000000-0000-0000-0000-000000000001` — use as recipient/owner for anything the
  tester should see.
- Clients `20000000-…{1..3}`, engagements `30000000-…{1..3}`, tasks
  `50000000-0000-0000-0000-00000000000{1..5}`, support tickets `60000000-…{1..3}`.

If the scenario needs a distinct **actor** (someone other than the admin doing the
mentioning/assigning), creating local auth users is allowed — a deliberate
difference from `/seed-preprod`, which forbids it. `team_members.id` FKs
`auth.users(id)`, so insert the minimal `auth.users` row first, then `team_members`
(copy the exact shape from the top of `supabase/seeds/notifications.sql` — no
password, referenced only as an actor). Local `auth.users` is disposable.

Style: fixed UUIDs, `on conflict (id) do nothing` on every insert, realistic values
spread over recent dates, and a header comment stating what the file demos and which
trigger path (Step 2) it takes.

## Step 4 — Apply

Two ways:

- **Canonical:** `supabase db reset` — replays all migrations + `seed.sql` + every
  `seeds/*.sql` from scratch. Wipes local data; that's expected, local is disposable.
  This is the proof the file is self-contained and idempotent.
- **Fast in-place refresh** (no wipe): there is no local `psql` on PATH — run it
  inside the DB container `supabase_db_local`:

  ```bash
  # apply a file
  docker exec -i supabase_db_local psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
    < supabase/seeds/<file>.sql

  # run a query
  docker exec -i supabase_db_local psql -U postgres -d postgres -c "<sql>"
  ```

  (If a tool does have psql, the DSN is
  `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.)

  Because inserts are `on conflict do nothing`, a re-apply will NOT overwrite
  existing rows with the same id — to change already-seeded rows, delete them first
  with a narrowly-scoped delete (e.g. `delete from notifications where recipient_id
  = '10000000-0000-0000-0000-000000000001'`), then re-apply. And remember: an
  in-place refresh only changes the running DB — the `seeds/` file is what makes the
  data survive the next reset, so edit the file, not just the database.

## Step 5 — Verify: invariant query, then click-through

Both, in order:

1. **Query the fidelity invariant back.** Write a SQL assertion that the Step 2
   contract holds and run it. Worked example:

   ```sql
   select count(*) from notifications
   where type like 'task_%' and (task_id is null or link not like '/tasks/%');
   -- must be 0
   ```

2. **Click through in the running app.** Open `npm run dev`, log in as the admin,
   navigate to the feature, and click a seeded row — it must land on a **real
   record** (the task, the ticket), not a list page or a 404. A green count is
   necessary but not sufficient; the click-through is the real proof.

Cleanup, when a topic's data should go: delete the `seeds/<topic>.sql` file and
`supabase db reset`, or (in place) run a scoped delete for that topic's rows via the
container.

## Report format

```
SEEDED (supabase/seeds/<topic>.sql)
- <table>: N rows — <one line on shape>
- writer contract: <which runtime writer was mirrored; trigger path (a)/(b) if any>
- invariant check: <the assertion query and its result — must pass>

TEST IT
- <route> → click <seeded item> → should open <the real record it links to>
```

## What this skill is not

Not preprod seeding — data in the shared preprod project goes through
`/seed-preprod` and its registry/cleanup contract. Not a Vitest fixtures library —
unit tests keep their inline mocks per `docs/conventions/testing.md`. Not a
load-testing tool (volumes stay small). And never a way to touch remote: if a
command's target isn't 127.0.0.1, it belongs to another skill.
