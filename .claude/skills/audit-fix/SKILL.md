---
name: audit-fix
description: Work the audit findings ledger — pick finding(s) from docs/audit/findings.md, re-confirm each still reproduces, fix it following project conventions (app layer first, migrations last), gate with tests + /qa, and update the ledger status. Use proactively whenever work touches audit findings — fixing, re-checking, or closing out anything tracked in docs/audit/findings.md, including when the user names a finding ID or reports a bug the ledger already covers.
---

# Audit Fix

Consumes `docs/audit/findings.md` (the ledger written by `/platform-audit`). One
invocation works one finding or one tightly-related cluster — not the whole list.

## Selecting what to fix

- If the user named ID(s), fix those.
- If the user said "next", pick from the ledger in this order:
  1. Anything in the latest report's **NOW** roadmap section, top to bottom.
  2. `open` Criticals, then Highs — but prefer a **cluster with one root cause** over
     severity order (e.g. CR-1 + CR-2 + S2 are one migration; D2 + CC-4 are one refactor).
- State the selection and why before touching anything. Skip `accepted-risk` rows unless
  the user explicitly reopens them.

## Per-finding process

1. **Re-confirm it reproduces.** Re-run the finding's evidence probe (read the file, run
   the SELECT, check the logs). If it no longer reproduces, mark the ledger row `fixed`
   with a note pointing at what changed, tell the user, and pick again — never "fix" a
   ghost.
2. **Branch.** `fix/<ledger-id>-<slug>` off main (or the current release branch if the
   user says so). One cluster per branch/PR.
3. **Plan the minimal fix.** The audit reports carry remediation direction — follow it
   unless the code says otherwise, and say so when it does. Push back on scope creep:
   fixing CR-1 does not mean redesigning invoicing.
4. **Order of work — app layer first, migrations last.** Build and test UI/edge-function
   changes before any DB change. When a migration is required:
   - Write it under `supabase/migrations/` with a timestamped name.
   - If it touches a cron-invoked SQL function, `npm run cron-guard` will flag it — the
     **whole function body** must be re-read against the original, not just the diff
     (this exact class of change has silently regressed generators before).
   - Do **not** apply it yourself. The pipeline applies it: Branching on merge to
     preprod, `release-prod.yml` on a version tag. Route it through **/ship**. Never
     `mcp__supabase__apply_migration`, never `supabase db push`.
   - RLS changes must also update `docs/security/rls-audit.md`.
5. **Gate.** `npx vitest run` and `npm run lint` clean; new behaviour gets tests
   (especially money math and idempotency — a generator dedup fix without a
   concurrent-call test is not done). Then run `/qa`, and `/verify` when the change has a
   runtime surface.
6. **Prove the finding is dead.** Re-run the original evidence probe and show it now
   comes back clean. For security fixes, attempt the exploit path (e.g. call the RPC as
   `anon` and show the denial). This proof goes in the PR body.
7. **Ledger.** Update the row: `in-progress` when the branch exists, `fixed` on merge,
   with the PR/commit ref in Notes. Never self-promote to `verified-fixed` — only a later
   `/platform-audit` re-probe does that.
8. **Spec.** If the fix changed module behaviour, run `/sync-spec`.

## Safety rails

- Prod is live and single-environment: schema changes ship with the code that expects
  them, additive-first (add column → backfill → switch reads → drop later).
- Anything touching invoice generation, Xero push, or RLS on money/HR tables: confirm the
  rollout order with the user before applying the migration, even mid-flow.
- If re-confirming a finding reveals it was wrong or mis-scoped, correct the ledger row
  (severity/claim) rather than fixing a misdiagnosis.

## Done looks like

A merged PR whose body cites the ledger ID, shows the before/after probe, and a ledger
row moved to `fixed`. Report to the user: what shipped, proof, what's next on the list.
