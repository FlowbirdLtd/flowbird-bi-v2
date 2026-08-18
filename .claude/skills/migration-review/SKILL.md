---
name: migration-review
description: Deep safety review of pending (unapplied) Supabase/Postgres migrations before they touch production — cron regression, RLS coverage, destructive ops, idempotency, function correctness, cross-migration coherence, and a per-migration SAFE / NEEDS SIGN-OFF / BLOCKED verdict. Read-only: it reviews and reports, it never applies. Use proactively before ANY pending migration is applied or shipped, and whenever migration safety comes up — if a diff adds files under supabase/migrations/, run this without waiting to be asked.
---

# Migration Review

A pre-flight safety review of **pending** (unapplied) migrations in
`supabase/migrations/`. The output is a verdict table with evidence and a
recommended apply order — nothing more.

## Hard rules

1. **Read-only. You never apply anything.** No `mcp__supabase__apply_migration`,
   no `supabase db push`, no `mcp__supabase__deploy_edge_function`, no editing
   migration files. Every `mcp__supabase__execute_sql` call is **SELECT-only**
   (including `pg_get_functiondef`, `pg_policies`, `pg_class`). You inspect the
   live schema; you never mutate it.
2. **Applied migrations are immutable.** In this repo a migration that the pipeline
   has applied (Branching on merge to preprod; `release-prod.yml` on a version tag)
   is never edited — fixes roll forward as a *new* migration. So if a pending file edits or supersedes an already-applied
   object, that is correct-by-design; review the new file on its own merits, do
   not suggest rewriting the applied one.
3. **RLS is the security boundary, not route guards.** Route guards in
   `AppRouter.jsx` are UX only; the Supabase anon key ships in the client bundle
   (see `docs/security/rls-audit.md`). A new `CREATE TABLE` with no
   `ENABLE ROW LEVEL SECURITY` + policies is a **Critical / BLOCKED** finding,
   never a note.
4. **Evidence or it isn't a finding.** Every line in the report cites
   `file:line`, a SQL result, or `cron-guard` output. "Probably fine" is not a
   verdict.
5. **Read the FULL file, never a diff.** These files are append-only and small.
   A whole-body function rewrite has silently regressed a cron generator before
   — the bug was in the part of the body the diff didn't touch.

Requires the Supabase MCP (`mcp__supabase__*`). If it isn't connected, say so and
stop — half of this review (cron live-definition diff, live-schema sanity, RLS
verification) is impossible without it.

## Verdict scale

- **SAFE** — additive, idempotent, RLS-complete, no cron/destructive/lock risk.
- **SAFE WITH NOTES** — safe to apply, but carries hygiene issues or a
  recommendation (missing index, missing `updated_at` trigger, style drift).
- **NEEDS SIGN-OFF** — correct but consequential: touches a cron function, adds a
  policy that widens exposure, or a lock-time risk on a large table. Requires the
  user to explicitly approve before it's applied.
- **BLOCKED** — a defect or data-loss/security risk: table with no RLS,
  destructive op without sign-off, references an object that doesn't exist yet,
  `CONCURRENTLY` inside a transaction. Must not be applied as written.

---

## Step 1 — Inventory the pending set

Pending = migration files this branch adds that are **not yet applied**. Two
sources, unioned:

```bash
# a) files this branch introduces/changes vs main
git diff origin/main...HEAD --name-only -- supabase/migrations/
git status --porcelain -- supabase/migrations/   # uncommitted / untracked too
```

```
# b) folder contents minus what the live project reports as applied
mcp__supabase__list_migrations        # → the applied version list
```

List every `.sql` file in `supabase/migrations/`, subtract the versions
`list_migrations` reports as applied, and union with (a). The result is the
pending set.

**Order by timestamp filename** (they apply in lexicographic order). Then flag
**ordering anomalies**:

- A pending file whose timestamp is **earlier** than an already-applied
  migration (it will apply out of order relative to history) — flag it.
- Two pending files with the same timestamp prefix — flag the collision.

If the pending set is empty, report "No pending migrations — nothing to review."
and stop.

---

## Step 2 — Per-migration checks

Read the **entire** file for each pending migration, then run every check below.

### 2a. Cron regression (highest blast radius)

```bash
npm run cron-guard
```

`scripts/check-cron-migrations.mjs` derives the watched set from every
`select public.<fn>()` wired into a cron job (plus `cron_run`) and flags any
pending migration that redefines/alters/drops one, or changes `cron.schedule` /
`cron.unschedule`. For **each flagged function**, pull the live, currently-applied
definition and diff it *mentally* against the new body:

```
mcp__supabase__execute_sql:
  SELECT pg_get_functiondef('public.generate_hour_pack_reorders'::regproc);
```

Compare the whole applied body against the whole new body and **enumerate every
behavioural difference** — not just the textual diff. Pay special attention to:

- which table / which `type` value each branch writes (the historical bug wrote
  `type='quote'` into `public.invoices`, rejected by `invoices_type_check`),
- dropped or reordered branches, changed `WHERE` predicates, changed dedup keys,
- money math and rounding, date-window boundaries, `ON CONFLICT` targets.

Any cron-function change is **NEEDS SIGN-OFF** at minimum; a behavioural
regression against the live body is **BLOCKED**. Cite the function name and the
specific differing lines.

### 2b. RLS coverage (new tables)

For every `CREATE TABLE public.<t>` in the pending set:

- Is there an `ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY` in the same or a
  later pending migration? If not → **BLOCKED (no RLS)**.
- Are there `CREATE POLICY` statements covering the operations the app performs
  (select / insert / update / delete)? A deny-all table (RLS on, no policy) is
  acceptable only if it's service-role-only by design — confirm against
  `docs/security/rls-audit.md` sections C/F.
- **Policy style vs house pattern.** Compare against recent migrations. The
  current convention is `... for <op> to authenticated using (...)` with a role
  target — **never** an untargeted `for all using (true) with check (true)`,
  which is reachable by `anon` and is exactly the backlog `docs/security/rls-audit.md`
  section A is clearing. Flag a new bare `using (true)` PUBLIC policy as
  **NEEDS SIGN-OFF** (widens anon exposure) and note the models to copy
  (`notifications`, `huddle_votes`, `team_members`, `audit_log`).
- Prefer the scoped `is_admin` idiom where the table is admin-only:
  `coalesce((select t.is_admin from public.team_members t where t.id = auth.uid()), false)`
  (see `20260729000001_audit_log.sql`).
- **House-pattern extras.** Does the new table want a soft-delete pair
  (`archived_at` + `archived_by`, per `src/lib/softDelete.js`) or an `updated_at`
  trigger, given its siblings have them? Missing → **SAFE WITH NOTES**.

Verify your RLS reading against the live catalog rather than grepping the
append-only files (superseded `USING (true)` lines still physically exist):

```
mcp__supabase__execute_sql:
  SELECT schemaname, tablename, policyname, roles, cmd
  FROM pg_policies WHERE schemaname='public' AND tablename='<t>';
```

### 2c. Destructive operations (each is NEEDS SIGN-OFF or BLOCKED)

Scan for and call out every one of these — each needs explicit user sign-off:

- `DROP TABLE`, `DROP COLUMN`, `DROP CONSTRAINT` on a populated object — data loss.
- `TRUNCATE`, `DELETE ... ` / `UPDATE ...` **without a `WHERE`** — mass mutation.
- `ALTER TABLE ... ALTER COLUMN ... TYPE ...` — table rewrite + exclusive lock.
- `ADD COLUMN ... NOT NULL` **without a `DEFAULT`** on an existing table — fails
  if rows exist; a `NOT NULL` add with no backfill step is **BLOCKED**.
- `ALTER TYPE` on an enum in use (see idempotency notes below).

For each, assess **data-loss risk** (is it recoverable?) and **lock-time risk**
(does it rewrite the table / hold `ACCESS EXCLUSIVE` while a large table is
scanned?). Size the table before judging lock risk — see Step 4.

### 2d. Idempotency & safety

- `create table if not exists`, `create or replace function`,
  `drop policy if exists` before `create policy`,
  `drop trigger if exists` before `create trigger`,
  `drop constraint if exists` before re-adding — this is the house idiom (see any
  recent migration). Missing guards → **SAFE WITH NOTES** (re-run would error).
- **Enum changes:** `ALTER TYPE ... ADD VALUE` cannot run inside a transaction
  block in older PG and cannot be used immediately in the same transaction —
  flag. Prefer a `CHECK`-constrained `text` column (the house style, e.g.
  `actor_type text ... check (... in (...))`) over native enums.
- **New FK columns need an index.** A `references` column with no matching
  `create index if not exists` → **SAFE WITH NOTES** (unindexed FK = slow
  cascades / joins). Recent tables always add
  `create index if not exists <t>_<col>_idx on public.<t> (<col>)`.
- **`CONCURRENTLY` is illegal in a transactional migration.** Supabase applies
  each migration in a transaction; `CREATE INDEX CONCURRENTLY` / `DROP INDEX
  CONCURRENTLY` will error at apply time → **BLOCKED**. If a concurrent index is
  genuinely needed on a large table, that's an out-of-band operation, not a
  migration — note it.

### 2e. Function / trigger correctness

- **SECURITY DEFINER functions must pin `search_path`.** Every
  `security definer` function needs `set search_path = public, pg_temp` (or `= ''`
  with fully schema-qualified references) — the house pattern. A definer function
  without it is privilege-escalation-prone → **BLOCKED**. Confirm each definer
  function also `revoke all ... from public` and grants execute only where
  intended (see `log_audit_event`).
- **Triggers reference existing functions.** Every `execute function public.<fn>`
  must name a function created earlier in the pending set or already live. Verify
  the latter:
  `SELECT to_regprocedure('public.<fn>()') IS NOT NULL;`
- Trigger-target **tables and columns must exist** — verify with `list_tables` /
  `execute_sql` (Step 4), especially any column the function reads via
  `TG_ARGV`/`->>` or a static reference.

### 2f. Grants & exposure

- Any `GRANT ... TO anon` or `TO authenticated` — review against intent. A grant
  to `anon` on a table/function is anon-reachable via the shipped key; treat a new
  one as **NEEDS SIGN-OFF** unless it's a deliberately public read-only view
  (see `docs/security/rls-audit.md` section E).
- Any `revoke` that removes a grant the app or an edge function still relies on →
  flag; grep `src/` and `supabase/functions/` for the affected object.

---

## Step 3 — Cross-migration coherence

- **Forward-reference check.** Applied in timestamp order, no file may reference
  an object (table, column, function, policy, type) that a *later* file creates.
  Walk the set in order; flag any forward reference as **BLOCKED**.
- **App-code dependency & ship order.** For each new table/column/function name,
  grep the branch's app code for consumers:

  ```bash
  grep -rn "<new_table_or_column>" src/ supabase/functions/ --include="*.js" --include="*.jsx" --include="*.ts"
  ```

  The house default is **app layer first, migrations last** — but code that
  *reads a new column* needs the migration applied first or it 500s. Resolve the
  tension **per case** and state it:
  - New table/column that code only *writes to behind a new UI path* → app can
    ship first (dead code) then migration; low risk either way.
  - Code that *selects* a new column on an existing render path → **migration
    must be applied before that code is deployed**; call this out explicitly and
    recommend the order.
  - A `select('new_col')` already merged to main with no backing migration in the
    pending set → **BLOCKED** (already broken or about to be).

---

## Step 4 — Live-schema sanity (SELECT-only)

Confirm the assumptions your findings rest on against the real database:

- Object existence for altered/indexed/trigger-targeted tables & columns:
  ```
  mcp__supabase__list_tables    # schema overview
  mcp__supabase__execute_sql:
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='<t>';
  ```
- **Lock-risk sizing** before judging any rewrite/`NOT NULL`/type-change:
  ```
  mcp__supabase__execute_sql:
    SELECT reltuples::bigint AS est_rows
    FROM pg_class WHERE relname='<t>';
  ```
  A rewrite on a table with millions of estimated rows is a production-lock
  hazard → escalate to **NEEDS SIGN-OFF** with the row estimate as evidence; on
  an empty/tiny table the same op is fine.
- Optionally cross-check `mcp__supabase__get_advisors` (security/performance) for
  the touched tables — but treat it as a hint, not primary evidence.

---

## Step 5 — Report

Lead with the verdict table, then the evidence, then the recommended apply order,
then the exact apply instruction for each (which you do **not** run).

### Verdict table

| # | Migration | Verdict | Headline |
|---|-----------|---------|----------|
| 1 | `20260731000001_add_widgets.sql` | BLOCKED | Table `widgets` has no RLS (L14) |
| 2 | `20260731000002_widget_rls.sql` | SAFE WITH NOTES | RLS ok; FK `widgets.owner_id` unindexed (L9) |
| 3 | `20260801000001_reorder_fn.sql` | NEEDS SIGN-OFF | Rewrites cron `generate_hour_pack_reorders` |

### Findings (grouped by migration, each with evidence)

> **[NO RLS]** `20260731000001_add_widgets.sql:14` — `create table public.widgets`
> with no `enable row level security`. Anon key can read/write every row. Add
> RLS + `to authenticated` policies before applying. **BLOCKED.**

> **[CRON REGRESSION]** `20260801000001_reorder_fn.sql:22` rewrites
> `generate_hour_pack_reorders()`. vs live `pg_get_functiondef`, the `no_charge`
> branch now writes `type='quote'` (line 40) — `invoices_type_check` rejects it,
> exactly the 3-day outage of the past. **BLOCKED** pending correction.

> **[LOCK RISK]** `...:8` `alter column amount type numeric` on `invoices`
> (est. 412k rows) rewrites the table under `ACCESS EXCLUSIVE`. **NEEDS SIGN-OFF.**

### Recommended apply order

Timestamp order, with any dependency/ship-order caveats spelled out:

```
1. 20260731000002_widget_rls.sql   (only after 20260731000001 is fixed to include RLS)
2. 20260801000001_reorder_fn.sql   (deploy nothing that calls it until sign-off)
```

Explicitly state where **app code must ship before / after** a given migration.

### How the cleared migrations get applied (you do NOT apply them)

"Apply" is done by the pipeline, not by an MCP call. A migration that clears review
reaches **preprod** when its feature PR merges (Supabase Branching applies it and the
Supabase Preview check has already proven it replays), and **prod** when a version tag
runs `release-prod.yml` (`supabase db push`). Route cleared migrations to **/ship** —
it drives that path with the gates and stop points.

Never `mcp__supabase__apply_migration`, never `supabase db push` by hand. Never merge a
PR carrying a BLOCKED migration; NEEDS SIGN-OFF migrations wait for the user's explicit
go-ahead before merge. If a fix is required, it rolls forward as a **new** timestamped
migration — the pending file, if already committed/applied elsewhere, is never edited
in place.

### Close-out

End with the one-line bottom line: how many SAFE, SAFE WITH NOTES, NEEDS
SIGN-OFF, BLOCKED — and the single most important thing to fix first. If every
pending migration is SAFE, say so plainly and give the clean apply order.
