# Audit Dimensions — probes and failure classes

One section per dimension. Each finder agent gets exactly one section (plus the rules in
SKILL.md). Probes are starting points, not the ceiling — an agent that only runs the listed
probes and stops is under-performing. Every claim needs primary evidence: a `file:line`, a
SQL result, or a log excerpt.

**Read-only discipline for all probes:** `execute_sql` may run SELECT-only statements.
Never INSERT/UPDATE/DELETE/DDL, never `apply_migration`, never deploy. Advisors and logs
are read-only by nature.

---

## 1. security-db — Database security

RLS quality, function grants, storage, auth settings.

Probes:
- `get_advisors` (security) — full sweep, note ERROR vs WARN.
- `select schemaname, tablename, policyname, roles, qual, with_check from pg_policies order by tablename` — flag `using(true)/with check(true)` for `authenticated`; flag permissive-policy stacking (multiple permissive policies OR together).
- `select p.proname, p.prosecdef, pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef` — for each SECURITY DEFINER fn, check `has_function_privilege('anon', p.oid, 'execute')` and mutable `search_path`.
- `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity` — RLS-disabled tables.
- Storage: `select * from storage.buckets`; check public buckets for list/enumeration policies.
- Tables with RLS enabled but zero policies (service-role-only locks) — confirm intentional.

Failure classes: flat-trust policies on sensitive tables (money, HR, comms); anon-executable definer functions; blanket policies defeating scoped ones; capability flags (`access_billing`, `manages_hr`, `is_admin`) not referenced by any policy.

## 2. security-edge — Edge-function security

`verify_jwt=true` is NOT authorization (the anon key is public). Real checks are in-function.

Probes:
- For every function in `supabase/functions/*/index.ts`: does it import `requireAdmin`/`requireBilling`/portal-token verification, or check the caller at all? Which client does it build (service role vs caller JWT)?
- Cross-reference `supabase/config.toml`: every deployed function has a stanza? `verify_jwt=false` functions self-verify (webhook signatures, tokens)?
- Header/injection hygiene in `_shared/` (CRLF in email fields, upstream error bodies echoed).
- OAuth flows: `state` validated? Tokens stored where, readable by whom?

Failure classes: service-role state mutation with no caller check; fail-open signature checks; public endpoints leaking internal data; missing config.toml stanzas (also breaks cron callers — see dimension 7).

## 3. security-frontend — Frontend security

Probes:
- `grep -rn "dangerouslySetInnerHTML" src/` — for each site: is output sanitized (DOMPurify or equivalent in package.json)? Who can write the source field (cross-check RLS)? Who views it (staff vs external portal clients)?
- Token storage (localStorage vs cookie), what XSS could steal.
- Public routes (`/approve`, `/portal`, `/tv`): auth design, token entropy/expiry/revocation, error handling.
- `grep -rn "VITE_" src/ .env*` — nothing secret shipped to the bundle.

## 4. performance — Performance & scalability

Probes:
- `npm run build` → bundle sizes; count `React.lazy` vs static imports in `AppRouter.jsx`; heavyweight deps (`@react-pdf/renderer`, TipTap) eagerly loaded?
- Fetch duplication: `grep -rl "from('team_members')" src/ | wc -l` (repeat for hottest tables); refetch-after-write sites vs targeted invalidation.
- Pagination: `grep -rc "\.range(" src/` vs total `.from(` calls; find unbounded reads on high-volume tables (`time_entries`, `activity_log`, `email_logs`, `invoices`).
- Indexes: `get_advisors` (performance); `select * from pg_stat_user_indexes` for unused; unindexed FKs; partial-index predicates match the hot path (`archived_at is null`, not `is not null`).
- Context providers: non-memoized `value={}`; tickers/pollers; realtime subscriptions with `event:'*'` and no filter.

Calibrate: "fine today, linear degradation" is Medium unless a page already pulls an entire high-volume table on every visit for every user.

## 5. data-integrity — Data integrity & UI flows

Probes:
- Soft-delete coverage: for each table with `archived_at`, grep every `.from('<table>')` list read for `.is('archived_at', null)` — money/reporting paths are High.
- Destructive save patterns: delete-then-reinsert without transaction; `.delete()` calls whose `error` is ignored.
- `window.confirm` vs `useConfirm`; unchecked multi-step writes.
- Schema drift: rename residue, status text columns without CHECK constraints, duplicate migration timestamps.

## 6. financial — Financial correctness

Money is the highest-stakes dimension. Verify against live data, not just code.

Probes:
- Column types: `select column_name, data_type from information_schema.columns where table_name in ('invoices','invoice_line_items','quotes',...)` — money must be `numeric`.
- Header-vs-lines: `select i.id, i.invoice_number, i.subtotal, i.tax_amount, i.total, sum(li.amount) from invoices i join invoice_line_items li ... group by ... having ...` — find live corruption.
- Enumerate every tax-calculation code path (builders, SQL generators, Xero push) — do they round identically? Compare to Xero's per-line `LineAmountTypes` semantics.
- Currency handling: any non-GBP rows live? Do dashboards sum across currencies?
- CHECK constraints on money/hours columns: `select conname, pg_get_constraintdef(oid) from pg_constraint where contype='c'`.
- Rounding of time→hours→money conversions.

## 7. cron-idempotency — Scheduled jobs & double-billing

Probes:
- `select jobid, jobname, schedule, command from cron.job` — malformed URLs/headers, missing Authorization where the target has `verify_jwt=true`, functions that exist but are never scheduled.
- `select * from cron.job_run_details order by start_time desc limit 200` — failures cron reports vs what `cron_run_log` recorded (dispatch-vs-response divergence).
- For every cron-invoked SQL function (`scripts/` cron-guard list is the inventory): `pg_get_functiondef` — atomic dedup guard? (`FOR UPDATE`, advisory lock, or unique constraint on the period). Read-then-stamp without a lock = double-billing race.
- `has_function_privilege('anon', ...)` on every generator.
- Per-item error handling — does one poison-pill row abort the whole batch?
- Manual-trigger paths ("Generate now" buttons) calling the same RPCs concurrently with cron.

## 8. concurrency — Races & lost updates

Probes:
- Optimistic locking: any `.eq('updated_at', ...)` preconditions on writes? (Expect none — verify.)
- Number generators: `pg_get_functiondef` on every `generate_*_number` — advisory lock vs unlocked `max()+1`.
- Client-side singletons enforced only in localStorage (active timer).
- Trigger-based limit checks that read-then-decide non-atomically.

## 9. integrations — Integration reliability

Probes:
- `get_logs` for edge functions — sustained 4xx/5xx on any poller/sync.
- Token lifecycle per integration (Xero, Gmail, HubSpot, GoCardless): refresh cadence, rotation concurrency guard, expiry state of the live connection row.
- Webhook idempotency: replay-safe? Timestamps re-stamped on replay?
- Clear-then-rebuild sync patterns without a transaction.
- Remote-write + local-update pairs: what happens when the remote succeeds and the local write fails? Any reconciler?
- Which syncs have no scheduled cadence at all (mirror staleness)?

## 10. observability — Alerting & incident visibility

Probes:
- Read `_shared/alert.ts` — what layer does `withAlert` wrap? Gate-level 401/403, cold-start, and net-layer failures are outside the handler body and invisible to it.
- Cross-check the three channels (Slack webhook, `cron_run_log`, in-app notification) against the failure classes found in dimensions 7/9: which failures reach no channel?
- AutomationHealth (or equivalent): does it check expected cadence/staleness, or just render the last logged row?
- Client error tracking: are the `VITE_FB_ERROR_*` env vars actually provisioned in the deploy target?

## 11. gdpr — GDPR / privacy / data lifecycle (UK)

Probes:
- Erasure: any purge/retention cron? Can a subject's PII actually be deleted (walk `delete-user` FK graph: `select confrelid::regclass, confdeltype from pg_constraint where contype='f' and confrelid in (...)`).
- Audit trail integrity: who can write/edit `activity_log`, is `actor_id` server-stamped?
- PII exposure: special-category-adjacent columns (`date_of_birth`, `home_address`, ...) — who can read them given the RLS state?
- Third-party data (inbound email bodies), retention, lawful basis docs, DSAR export path, sub-processor register, portal privacy notice.

## 12. backup-dr — Backup / DR / source of truth

Probes:
- Can prod be rebuilt from the repo? `select version from supabase_migrations.schema_migrations` vs `ls supabase/migrations/` — count exact matches. Any live table created by no repo migration (`grep -ril "create table <name>" supabase/migrations/`)?
- Hand-applied SQL outside the ledger (repo root, scripts/).
- DR runbook, RPO/RTO, restore procedure, storage-bucket backup path — do the documents exist?

## 13. testing-ci — Testing & CI/CD

Probes:
- `.github/workflows/` — what blocks, what's `continue-on-error`? Is there any gate between a migration/edge-function change and prod?
- Test inventory: unit vs integration vs RLS/auth vs e2e. Do money-math and generator-idempotency paths have tests? Do edge-function tests exercise the real module or a hand-copied duplicate?
- Static analysis coverage of `.ts` (service-role code).

## 14. accessibility — Accessibility & mobile

Probes:
- Label coverage: count `<input`/`<select`/`<textarea` vs `htmlFor=`/`aria-label` across `src/`.
- Modals: `role="dialog"`, focus trap, Esc, focus return — sample 10, extrapolate honestly.
- Keyboard: dnd-kit sensors (`KeyboardSensor` registered?), focusable cards, combobox ARIA.
- Contrast: compute ratios for the token palette in `src/index.css` (both themes).
- Responsive: media-query count vs data-table count; try the hottest 3 list views at 375px.

## 15. input-validation — Input validation & resilience

Probes:
- DB CHECK constraints on money/hours/percent columns (share probe with dimension 6).
- Error-swallowing reads: grep the `.then(({ data }) => set…(data || []))` pattern — count sites where `error` is never read.
- Validation library present? Consistency of hand-rolled validation across forms for the same field.
- ErrorBoundary placement vs public routes; file-upload size/type/mime validation (SVG upload = stored-XSS vector).

## 16. supply-chain — Dependencies

Probes:
- Edge functions: import specifiers (floating majors from CDNs?), `deno.lock` coverage of the transitive graph.
- Frontend: `npm audit --json` — then **assess reachability honestly** (a scanner High in an unreachable path is a ledger Low).
- Version drift of the same dep across pin points.
