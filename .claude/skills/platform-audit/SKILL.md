---
name: platform-audit
description: Run the full CTO-level platform audit — 16 dimensions (security, financial correctness, cron idempotency, observability, GDPR, DR, a11y, supply chain, …) via parallel finder agents, adversarial verification of every High/Critical against the live Supabase project, delta against docs/audit/findings.md, and a dated report. Read-only — never changes code or data. Use when the user asks for a platform-wide audit, full health check, or CTO-level review. Expensive multi-agent run — reserve for whole-platform intent, not single-module questions.
---

# Platform Audit

Reproduces the process that built `docs/audit/platform-audit-2026-06-11.md` (V1) and
`platform-audit-v2-2026-06-11.md` (V2), designed to run on **any model** (Opus included) —
the methodology lives here, not in the model.

## Hard rules (apply to you and every agent you spawn)

1. **Read-only.** No code changes, no `apply_migration`, no `deploy_edge_function`, no
   fixes "while you're in there". `execute_sql` is SELECT-only. Findings are the output.
2. **Evidence or it doesn't exist.** Every finding carries primary evidence: `file:line`,
   a SQL result, or a log excerpt. "Likely", "probably", "typically" without a probe = not
   a finding.
3. **Work from primary sources.** The knowledge graph and specs may be stale — use them
   for orientation only, never as evidence.
4. **Calibrate honestly.** Verification is allowed to downgrade and refute. A scanner
   severity in unreachable code is a Low. Record refutations — they're signal the audit is
   working.
5. **Preserve what's good.** Every report has a "What's genuinely good" section so sound
   engineering isn't churned by later fixes.

Requires the Supabase MCP server (`mcp__supabase__*`). If it isn't connected, stop and
tell the user — a code-only audit misses the live-database half of the method (which is
where V2's worst findings came from).

## Model policy

Finders and verifiers **inherit the session model** — do not tier them down. Verification
(Phase 2) only catches overcalled findings; nothing downstream catches what a weaker
finder never surfaces, and audits run rarely enough that finder quality is cheap
insurance. The cost lever for this skill is **scope** (delta audit vs full sweep), not
model tier. One exception: delta **re-probes of known ledger rows** are mechanical
(re-run the recorded probe, compare) — those agents may run one tier below the session
model with `effort: 'low'` when orchestrated via the Workflow tool. New-finding hunts and
all verification stay on the session model at inherited effort.

## Severity scale

- **Critical** — actively broken in production, losing money/data now, or exploitable by
  an unauthenticated party.
- **High** — exploitable by any authenticated user, financial-integrity risk, or a
  compliance/DR gap with board-level consequences.
- **Medium** — real defect, needs a trigger or scale to bite.
- **Low** — hygiene, drift, minor over/under-billing at the pennies level.

---

## Phase 0 — Baseline (inline, before any agents)

1. Read `docs/audit/findings.md` (the ledger) and skim the two most recent
   `docs/audit/platform-audit-*.md` reports.
2. `git log --oneline --since=<last audit date>` — note shipped work that plausibly
   touched open findings; these rows need re-probing, not trusting.
3. Confirm scope with what the user asked: **full audit** (all 16 dimensions) or
   **delta audit** (re-probe every non-`verified-fixed` ledger row + sweep dimensions with
   recent churn). Default to full if this is the first run in >2 months, delta otherwise.
4. Snapshot quick facts agents will need: current commit, prod project ref, date.

## Phase 1 — Finder fan-out (one agent per dimension)

Dimensions and their probe playbooks live in
[references/dimensions.md](references/dimensions.md): security-db, security-edge,
security-frontend, performance, data-integrity, financial, cron-idempotency, concurrency,
integrations, observability, gdpr, backup-dr, testing-ci, accessibility,
input-validation, supply-chain.

Spawn **one finder agent per dimension**, in parallel (batches of 4–6 via the Agent tool
are fine; if the Workflow tool is available, orchestrating Phases 1–2 as a single
pipeline-style workflow is the better option — this skill's instruction counts as the
opt-in). Each finder prompt must contain:

- The verbatim text of its section from `references/dimensions.md`.
- The hard rules above (read-only, SELECT-only, evidence required).
- The ledger rows already known for its dimension, with instruction: *re-probe rows marked
  `open`/`fixed` that recent commits may have touched; report status `still-open`,
  `appears-fixed`, or `regressed` with evidence — and then hunt for NEW findings the
  previous audits missed. Do not pad the report by re-describing known findings.*
- The required return format:

```
FINDING
id: <dimension-prefix>-NEW-<n>   (or existing ledger ID when re-probing)
severity: Critical|High|Medium|Low
claim: <one sentence>
evidence: <file:line | SQL + result | log excerpt>
scenario: <concrete failure/exploit path — inputs/state → consequence>
confidence: probed|inferred
```

Finders on live-database dimensions (financial, cron-idempotency, backup-dr,
security-db, integrations, observability) must run their SQL probes, not reason from the
migrations folder — the repo provably diverges from prod (BD-1/BD-2).

## Phase 2 — Adversarial verification

For **every Critical and High** from Phase 1 (new or regressed), spawn a fresh skeptic
agent that did not produce the finding. Its brief:

> Try to REFUTE this claim. Reproduce the evidence yourself (run the SQL, read the file,
> pull the logs). Check the exploit path end-to-end — does the precondition actually hold?
> Verdict: CONFIRMED (evidence reproduced, path holds), DOWNGRADED (real but overstated —
> give the corrected severity and why), or REFUTED (evidence doesn't reproduce / path
> blocked — show what blocks it).

Post-verification severity is the one that ships. Mediums/Lows go through on the finder's
evidence unless they contradict a ledger row. Keep a count of downgrades/refutations for
the report's calibration note.

## Phase 3 — Delta & ledger update

Merge everything against `docs/audit/findings.md`:

- `appears-fixed` + evidence → status `verified-fixed`, note the commit/probe.
- `regressed` → back to `open`, note what regressed.
- New confirmed findings → new rows with the next free ID in their dimension's series.
- Dedup ruthlessly: one root cause = one finding (cross-reference, don't repeat).
- Never delete rows; `obsolete` is a status.

## Phase 4 — Report

Write `docs/audit/platform-audit-YYYY-MM-DD.md` in the established house style (V2 is the
template):

1. Header: date, scope (full/delta), how produced (N finder + M verifier agents, live
   project probed), **"No code was changed."**, calibration note (X downgraded, Y refuted).
2. **Executive summary** — the headline in plain language; lead with anything actively
   broken in production.
3. **Live incidents** (if any) — broken *right now*, with evidence and since-when.
4. **Delta since last audit** — verified-fixed / regressed / new, as three short lists.
5. **Findings by dimension** — post-verification severities, ledger IDs, evidence.
6. **Prioritized remediation roadmap** — NOW (days) / Weeks 1–4 / Month 2+, each item
   citing ledger IDs.
7. **What's genuinely good.**

Then give the user a five-line verbal summary: headline, counts by severity, top 3 NOW
items, and the suggested next step (`/audit-fix` on the NOW list).

## What this skill is not

It does not fix anything — that's `/audit-fix`, which consumes the ledger this run
updates. Keeping the runs separate keeps the auditor honest: the same session should
never both report a finding and mark it fixed.
