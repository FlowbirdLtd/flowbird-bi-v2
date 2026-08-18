---
name: ship
description: End-to-end release procedure that takes work from "code complete" to "live" on the Supabase Branching pipeline — feature branch → preprod (Branching applies), then a release PR preprod → main and a version tag that runs the gated release-prod workflow. Encodes Flowforce's post-2026-07-16 SDLC: one applier per environment, releases flow one-way preprod → main, and schema reaches prod only through the human-gated tag workflow — never MCP apply, never manual db push. Use whenever the user wants work released, deployed, staged to preprod, or made live — every release goes through this procedure, never ad-hoc merge/deploy steps.
---

# Ship

Drive work from code-complete to live along the **Supabase Branching pipeline**, in
order, stopping at every irreversible step. This is a **procedure**, not a suggestion
list — work the steps top to bottom, never reorder them.

```
feature branch ──PR──▶ preprod ──release PR──▶ main ──tag vX.Y.Z──▶ prod
       │                  │                       │                    │
       │                  │ merge: Branching       │ merge: Vercel      │ tag: release-prod.yml
       │                  │ applies migrations +    │ deploys frontend,   │ (human-gated) db push
       │                  │ changed functions to    │ seeds prod cron URL │ + deploy ALL functions
       │                  │ preprod; crons swept     │ (migrations NOT     │ to the prod project
       │                  └ off                      └ applied yet)        └
       └ PR checks: CI (lint/test/build), cron-guard, Deno check,
         + Supabase Preview (ephemeral replay) when the PR touches supabase/
```

There are **two hops**, and "ship" may mean either — establish which the user wants:

- **Hop 1 — get work onto preprod** (feature branch → `preprod`). Merging applies the
  migrations and changed functions to the pre-prod project automatically (Supabase
  Branching). This is Steps 1–5.
- **Hop 2 — release preprod → prod** (`preprod → main`, then tag `vX.Y.Z`). This is
  Steps 6–9. Do it once preprod has soaked the change.

If the user says "release / deploy / go live" from a feature branch, they usually mean
**run Hop 1 now, and Hop 2 when preprod is green**. Confirm the version tag up front.

## Ground rules (encode these exactly — they are team decisions, not preferences)

- **One applier per environment. Never apply migrations yourself.** Supabase Branching
  (the GitHub integration) owns preprod — migrations and changed functions apply on
  **merge to `preprod`**. `release-prod.yml` owns prod — migrations and all functions
  apply on a **version tag**, behind a required-reviewer gate. **Never
  `mcp__supabase__apply_migration`, never `supabase db push`, never
  `supabase functions deploy` by hand** as part of a release. The MCP is for
  *verification only* (`list_migrations`, `get_advisors`, `get_logs`).
- **A migration reaches an environment by merging, not by applying.** A direct MCP
  apply stamps a ledger version generated at apply time that can diverge from the
  committed filename and later confuse Branching / `db push`. Merge the PR; the
  Supabase Preview check has already proven the file replays from scratch.
- **Releases flow one-way: `preprod → main`.** Never merge `main` into `preprod`. Main
  may deliberately diverge (a reverted feature); resolve release-PR conflicts on the
  **main side** and verify the tree afterwards (Step 6) — auto-merge has silently
  regressed files before. After a release merge, preprod's history realigns via the
  guarded `sync-preprod` fast-forward job in `ci.yml` (tree-equality guard, zero
  main-side content) — never by a manual merge or push.
- **A cron-guard flag means the WHOLE function body must be reviewed**, not just the
  diff. `generate_hour_pack_reorders` was silently broken for three days by a
  whole-body rewrite that reverted a branch. Treat every flag as blocking-until-read.
- **The tag is the irreversible prod step.** Applying migrations to prod happens inside
  `release-prod.yml`, gated by the `production` GitHub Environment's required reviewer.
  Get an explicit "yes" from the user in the turn before you push the tag (Step 8).

Anything red in Steps 2–3 = **STOP and report. Do not ship.**

---

## Step 1 — Preflight (read-only)

Establish exactly what is being shipped, and to which hop.

```bash
git status                                  # clean-ish? what's uncommitted?
git branch --show-current                   # current branch
git fetch origin preprod main --tags        # freshen bases + tags
git log --oneline origin/preprod..HEAD      # commits this branch adds over preprod
git status -sb                              # ahead/behind — is HEAD pushed?
```

- **Refuse to ship directly from `main` or `preprod`.** Feature work lands via a PR
  into `preprod`; if `git branch --show-current` is `main` or `preprod`, stop and tell
  the user to branch first.
- If the working tree is dirty, list what's uncommitted and ask whether it belongs in
  this release (commit it) or should be set aside. Do not silently ship around it.
- **Concurrent sessions share this tree** — never `git stash`; scope every git op to
  the files this branch owns.

Enumerate the release contents (base against `preprod` for Hop 1):

```bash
git diff origin/preprod...HEAD --stat                                  # overall shape
git diff origin/preprod...HEAD --name-only -- supabase/functions/      # changed edge functions
git diff origin/preprod...HEAD --name-only -- supabase/migrations/     # new migration files
```

Produce a short manifest and keep it for the final report:

- **App/UI changes** — yes/no + rough scope
- **Edge functions touched** — resolve each path to its function name
  (`supabase/functions/<name>/...` → `<name>`); dedupe
- **Migrations added** — each new file in `supabase/migrations/`, in filename
  (timestamp) order. Versions must be unique and sort after the latest applied
  version. This is the replay/apply order Branching and `db push` will use.
- **Touches `supabase/`?** — if yes, the PR gets a **Supabase Preview** ephemeral
  branch; if no, that check is skipped (app-only PR).

---

## Step 2 — Local gates (all must be green)

Run the same gates CI runs (`.github/workflows/ci.yml`), locally, before the PR.

```bash
npm run lint          # ESLint — CI's Lint step
npx vitest run        # full test suite, non-watch — CI's Test step
npm run build         # production build — CI's Build step
npm run cron-guard    # flag migrations touching cron-invoked SQL functions
```

If **edge functions changed** in Step 1, type-check only the touched files:

```bash
# List each changed .ts under supabase/functions/ explicitly, e.g.:
deno check supabase/functions/<name>/index.ts supabase/functions/_shared/<used>.ts
```

- CI runs `deno check` across ALL functions as **non-blocking**
  (`continue-on-error: true`) because of a known backlog of pre-existing strict-type
  errors. So: **a new type error in a file this branch touched is a blocker; a
  pre-existing error in an untouched file is not.** Separate signal from noise.

**cron-guard handling:** if `cron-guard` prints a flag (`⚠️ Cron-function migration
flagged for review`), that is NOT an auto-fail — it's an instruction. For each flagged
migration, open the file and read the **entire** function body it redefines, confirming
the invariants still hold (which table/`type` it writes, which branches it keeps).
Record "cron-guard flag reviewed: <fn> — OK" for the report.

- **`cron.unschedule(...)` must be `if exists`-guarded** — preprod's `cron.job` is kept
  empty, so an unguarded unschedule passes on prod but fails on the preprod/preview
  replay. Confirm the house pattern (`if exists (select 1 from cron.job where jobname
  = '<name>')`).
- **A cron-invoked function needs `verify_jwt = false` pinned in `supabase/config.toml`**
  (the cron `net.http_post` sends no auth header — an unpinned function 401s on every
  cron run).

**Any red gate (lint/test/build fail, or a new deno error in a touched file) = STOP.
Report the failure. Do not ship.**

---

## Step 3 — Quality gates

Local gates prove it compiles and passes tests; these prove it's correct.

- Run **/qa** — the full QA pass over uncommitted + unpushed code (tests, cross-module
  cache effects, completeness, conventions, edge-function checks).
- If the branch adds files under `supabase/migrations/`, run **/migration-review**
  first — it is read-only and gives a per-migration SAFE / NEEDS SIGN-OFF / BLOCKED
  verdict. Resolve BLOCKED and NEEDS SIGN-OFF before merging (merge = apply on preprod).
- For a risky diff (auth, billing/accounting, RLS, migrations, edge-function auth
  gates, anything touching money or `verify_jwt`), also run **/code-review**.

Resolve every **blocker** before continuing. Non-blocking suggestions can ship as
follow-ups — note them for the report.

---

## Step 4 — PR into preprod & CI

Push and open the PR into **`preprod`** (not main). Fully reversible up to merge.

```bash
git push -u origin "$(git branch --show-current)"
```

```bash
gh pr create --base preprod --title "<concise title>" --body "$(cat <<'EOF'
## Summary
- <what changed and why, 2-4 bullets>

## Test plan
- npm run lint / npx vitest run / npm run build — green locally
- /qa — <clean | blockers resolved>
- /migration-review — <verdict, or "no migrations">

## Migrations
- <each new supabase/migrations/*.sql by name, in filename order — or "none">

## Edge functions
- <each changed function name — or "none">

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Watch the PR checks to green:

```bash
gh pr checks --watch
```

- **CI (lint/test/build)** and **cron-guard** must pass. The **Deno type-check** job is
  `continue-on-error` — a red X there is expected; read its log only for a **new** error
  in a file this branch touched.
- **Supabase Preview** runs only when the PR touches `supabase/`. If it's red, read the
  branch status first (`mcp__supabase__list_branches` or the dashboard):
  `MIGRATIONS_FAILED` = your SQL is broken (real blocker); `FUNCTIONS_FAILED` = the
  migrations **passed** and the bulk function deploy flaked (often pure platform flake —
  re-trigger with an empty commit: `git commit --allow-empty -m retrigger && git push`).
  The first preview run after branch creation can also fail transiently.

---

## Step 5 — Merge to preprod (Branching applies) ⚠️ writes to the preprod DB

**STOP for the user's merge decision** unless they pre-authorised ("ship it and merge",
"auto-merge when green").

Merging to `preprod` triggers Supabase Branching, which **applies the migrations and
deploys the changed functions to the pre-prod project** — this is the apply, done for
you. There is no manual apply step.

```bash
gh pr merge <n> --squash --delete-branch     # feature branches: squash + delete
```

After merge, confirm preprod took the change:

- `deploy-preprod.yml` runs on the push: it **unschedules every `cron.job` row and
  deletes `app_config.functions_base_url`** (crons must not run on preprod). An empty
  preprod `cron.job` afterwards is expected, not drift.
- Verify migrations registered on preprod (MCP, read-only):
  `mcp__supabase__list_migrations` — the new versions should appear.
- Check function boot: `mcp__supabase__get_logs (service: "edge-function")`.

Preprod now has the change. Let it **soak** — /smoke against the preprod build, and let
the user QA — before releasing to prod.

---

## Step 6 — Release PR: preprod → main (one-way)

When preprod is green and soaked, open the release PR. **Direction is one-way:
`preprod → main`. Never merge `main` into `preprod`.**

First, confirm manual testing on preprod is complete. Every merge into `preprod`
gets an auto-generated manual-test issue (label `preprod-testing`, created by
`preprod-test-cases.yml`); an open one means that change has not been verified
on preprod yet:

```bash
gh issue list --label preprod-testing --state open
```

If any are open, list them to the user and get an explicit decision to either
finish testing first or knowingly release anyway — do not proceed silently.

```bash
git fetch origin preprod main
git log --oneline origin/main..origin/preprod                # what this release ships
git diff  origin/main...origin/preprod --stat                # net file delta
git diff  origin/main...origin/preprod --name-only -- supabase/migrations/   # migrations to prod
git diff  origin/main...origin/preprod --name-only -- supabase/functions/    # functions to prod
```

```bash
gh pr create --base main --head preprod \
  --title "Release vX.Y.Z: <one-line scope>" \
  --body "<summary • migrations by name or none • functions or none>"
gh pr checks <n> --watch
```

**Resolve any conflict on the main side**, then verify the tree — do not trust the
auto-merge:

```bash
# After the PR is merged (or on the resolved release branch), the ONLY differences
# between preprod and main must be deliberate main-side exceptions (e.g. a reverted
# feature main keeps). Anything else means the merge resurrected or dropped something.
git fetch origin main
git diff origin/preprod origin/main --stat
```

An unexpected diff here = fix on main **before** tagging. (This invariant caught the
timer-v2 revert landmine — auto-merge silently took main's reverted files.)

**STOP for the user's merge decision.** Release PRs `preprod → main` merge with a
**merge commit** (never squash — squashing collapses preprod's shared history) and
**never delete the `preprod` branch** (it's long-lived; `protect-preprod.yml` would
restore it anyway):

```bash
gh pr merge <n> --merge          # merge commit; do NOT pass --delete-branch
```

**Merging to `main` deploys the frontend immediately** (`deploy-production` job in
`ci.yml` → Vercel; the git integration for `main` is disabled, so a **red CI run means
production did not deploy**). `seed-prod-config` re-seeds prod's
`app_config.functions_base_url` on the same push. **Migrations are NOT applied yet** —
so if an already-rendered path reads a new column, keep the gap short: tag promptly.

The same push runs `sync-preprod`, which fast-forwards `preprod` to main's tip so the
release merge commit doesn't leave preprod showing "behind" — guarded by a
tree-equality check, so it skips (with a warning) whenever main deliberately diverges.
If it skipped and you expected a sync, that warning is the place to look. Do not
realign preprod by hand.

---

## Step 7 — Post-merge verification (frontend live, DB not yet)

```bash
gh run list --branch main --workflow ci.yml --limit 3     # deploy-production must be green
```

Confirm the `deploy-production` (Vercel) job is green — that is the only path to a prod
frontend deploy. If it's red, production frontend did not update; fix before tagging.

---

## Step 8 — Tag the release → release-prod.yml (⚠️ irreversible prod apply — hard confirm)

Tagging is what applies schema to production. **STOP. Require an explicit "yes" in this
turn**, and present exactly what will run:

> About to tag `vX.Y.Z` on the release merge commit. This triggers `release-prod.yml`,
> which — after a required reviewer approves the `production` environment — runs
> `supabase db push` (applies these pending migrations to prod) and deploys all edge
> functions:
> 1. `20260706_add_foo`
> 2. `20260706_backfill_foo`
> (or "no pending migrations — db push is a no-op")
>
> Migrations roll FORWARD only — this is irreversible. Confirm? (yes/no)

Pre-tag re-check:

- The version fits the scheme in use (`git tag --list 'v*' --sort=-v:refname | head` —
  the repo uses four-part tags, e.g. `v1.5.2.1`).
- Any cron-guard flag got the whole-body review (Step 2).
- App/frontend dependencies of every migration are already live (Steps 5–7) — a
  migration must never be the first thing that depends on new code.

On an explicit yes, tag the **release merge commit** and push:

```bash
git fetch origin main
git tag -a vX.Y.Z <merge-sha> -m "Release vX.Y.Z: <scope>"
git push origin vX.Y.Z
```

The tag runs `release-prod.yml`: it is gated by the **`production` GitHub Environment's
required reviewer** (a human must approve in GitHub — you cannot self-approve), prints
`supabase migration list` (the approver's last look at what is pending), then runs
`supabase db push` and `supabase functions deploy` (**all** functions — which also
clears any accumulated function-deploy drift).

Watch it:

```bash
gh run watch $(gh run list --workflow release-prod.yml --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```

- **Known flake:** the function-bundle step imports from `esm.sh` and has failed with a
  transient `522 <unknown status code>` (hit `v1.5.2.1`). Because `db push` runs
  **before** the function deploy, a failure there means **migrations applied but
  functions deployed only partway** — re-run the workflow (re-dispatch, or delete and
  re-push the tag) to reconcile the fleet. It is not a migration failure.
- If `db push` itself errors, STOP and report — do not re-tag blindly; inspect
  `mcp__supabase__list_migrations` to see what applied.

---

## Step 9 — Post-deploy verification & report

Confirm the live system is healthy (MCP, read-only, against prod):

```bash
mcp__supabase__list_migrations                             # pushed versions now present
mcp__supabase__get_advisors   (type: "security")
mcp__supabase__get_advisors   (type: "performance")
mcp__supabase__get_logs       (service: "edge-function")   # boot + first calls
```

- Triage any **new** advisor finding this release introduced (a new table without RLS,
  a missing index on a new FK). Pre-existing advisories aren't this release's job, but
  note anything alarming.
- Recommend a **/smoke** pass against the live build, or drive the primary flow by hand.
- **Tell the user to watch the Slack alerts channel (`SLACK_ALERTS_WEBHOOK_URL`) for the
  first hour** — every edge function is wrapped with `withAlert()` and posts there on a
  thrown error or any `>= 400` response.

**Rollback paths** (state the concrete undo for each shipped artifact):

- **App/UI code** — roll the Vercel deployment back to the previous production
  deployment instantly, or revert the merge with a revert PR (CI redeploys `main`).
- **Edge functions** — versioned; redeploy the prior version by tagging a release built
  from the previous commit, or re-run `release-prod.yml` after reverting the function
  file on `main`.
- **Migrations** — roll **FORWARD** with a new migration that reverses the change (via
  the same preprod → main → tag path). Applied migrations are immutable; never edit or
  delete one. A data-destructive migration (dropped column, deleted rows) may be
  unrecoverable — which is why Step 8 is gated behind explicit confirmation.

Finish with a single summary:

```
## Release vX.Y.Z — preprod → main

Shipped:
- App/UI: <scope, or "none">
- Edge functions: <changed names, or "none — release deployed all (drift cleared)">
- Migrations: <name>, … (or "none — db push no-op")

Gates:
- lint / vitest / build: <pass>
- cron-guard: <clean | flagged <fn> — whole body reviewed, OK>
- /qa: <clean | blockers resolved>  ·  /migration-review: <verdict | n/a>
- Preprod PR #<n>: <green, Branching applied>  ·  Release PR #<m>: <merged>
- preprod↔main invariant: <only deliberate main-side exceptions>

Prod apply (release-prod.yml on vX.Y.Z):
- production env approval: <who approved>
- db push: <migrations applied | no-op>
- functions deploy: <all N deployed | flake + reconcile note>

Post-deploy:
- Advisors (security/perf): <clean | new findings + triage>
- Edge-function logs / Vercel deploy: <clean | issues>
- Smoke: <done/recommended>

Rollback: <one line per shipped artifact>
Follow-ups: <deferred items | none>

⚠️ Watch the Slack alerts channel for the next hour.
```

---

## Quick checkpoint map

- **Refuse:** shipping directly from `main` or `preprod` (Step 1).
- **STOP on red:** any local gate, /qa, or BLOCKED migration (Steps 2–3).
- **STOP for decision:** merge to preprod (Step 5); open `preprod-testing`
  issues before the release PR, and merging the release PR (Step 6).
- **HARD CONFIRM (irreversible prod apply):** pushing the version tag (Step 8) — and a
  human still approves the `production` environment gate inside the workflow.
- **Never:** `mcp__supabase__apply_migration`, `supabase db push`, or
  `supabase functions deploy` by hand; merging `main` into `preprod` (history
  realigns via `ci.yml`'s guarded `sync-preprod` fast-forward, never a merge);
  squashing or deleting `preprod` on a release PR; editing an applied migration.
