---
name: fix-ci
description: Diagnose and fix a failing CI run for the current branch or PR. Locates the failed run via the gh CLI, classifies which gate broke (lint / test / build / cron-guard), reproduces the failure locally, applies a real fix, re-runs the full gate set, and pushes. Use whenever CI is failing or a red PR check comes up — any GitHub Actions failure on this repo starts here, even if the user just pastes or mentions a failure.
---

# Fix CI

Diagnose and repair a red CI run on the current branch. The CI is GitHub Actions
(`.github/workflows/ci.yml`) with three jobs:

- **`app`** — `npm ci` → `npm run lint` → `npx vitest run` → `npm run build`, with dummy
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env. Node pinned to **22.x**. This is the
  blocking job that fails most often.
- **`cron-guard`** — `node scripts/check-cron-migrations.mjs`. Flags migrations touching
  cron-invoked SQL functions. Non-blocking by default (exits 0 unless `CRON_GUARD_STRICT=1`).
- **`edge-functions`** — `deno check`. `continue-on-error: true`, so it **cannot** fail the
  run. If this is the only "failure" the user sees, CI is actually green — say so.

The non-negotiable rule: **reproduce the failure locally before changing a single line.**
No shotgun commits to "see if CI goes green."

---

## Step 1 — Locate the failure

```bash
BR=$(git branch --show-current)
gh run list --branch "$BR" --limit 5
```

Pick the newest run with `conclusion = failure`. Grab its ID, then:

```bash
gh run view <run-id>                 # which job(s) failed
gh run view <run-id> --log-failed    # logs for the failed steps only
```

Logs are large — always filter. Save the raw log once, then grep it:

```bash
gh run view <run-id> --log-failed > /tmp/ci.log
```

Filter patterns by gate:

| Gate | Filter |
|---|---|
| vitest | `grep -nE ' FAIL |AssertionError|Error:|✗' /tmp/ci.log` |
| eslint | `grep -nE 'error ' /tmp/ci.log` (ESLint prints `  12:5  error  ...`) |
| build (Vite/Rollup) | `grep -nE 'error during build|Rollup|Could not resolve|\[vite\]' /tmp/ci.log` |
| npm ci | `grep -nE 'npm error|ERESOLVE|lockfile' /tmp/ci.log` |
| cron-guard | `grep -nE 'cron-guard|::warning' /tmp/ci.log` |

If nothing matches, read the tail: `tail -60 /tmp/ci.log`.

---

## Step 2 — Classify the failure

Determine which gate broke and jump to its playbook below. If the `app` job is green and
only `edge-functions` shows red X's, tell the user CI is not actually failing (that job is
`continue-on-error`) and stop unless they want the Deno type errors triaged anyway.

### 2b — Reproduce locally FIRST

Before any edit, reproduce the exact failure locally. Every playbook opens with its repro
command. If it reproduces, fix and re-verify against that repro. **If it does NOT reproduce
locally, do not guess-and-push** — jump to the *CI-only mismatch* playbook.

---

### Playbook: Lint

```bash
npm run lint
```

- Fix the reported violations at the source. Do **not** blanket-disable rules or add
  file-wide `/* eslint-disable */`. A targeted `// eslint-disable-next-line <rule>` is only
  acceptable with a one-line justification and when the rule is genuinely wrong here.
- `npx eslint --fix <file>` is fine for **mechanical** issues (import order, quotes,
  semicolons, unused-import removal). Re-read the diff it produces — never commit an autofix
  blind.
- Common Flowforce lint failures: `no-unused-vars` (error — but identifiers starting with a
  capital or underscore are exempt via `varsIgnorePattern`) and `react-hooks/rules-of-hooks`
  (error). Note only **errors** fail `npm run lint` — warnings like
  `react-hooks/exhaustive-deps` and `react-refresh/only-export-components` are advisory and
  can't be what broke CI.

Verify: `npm run lint` exits 0.

---

### Playbook: Test

```bash
npx vitest run <path/to/failing.test.jsx>
```

Read the assertion and decide which of three cases it is:

- **(a) Real regression** — the code under test is wrong. Fix the source, not the test. The
  test is doing its job.
- **(b) Stale test** — the behaviour changed *intentionally* and the test still encodes the
  old behaviour. Update the test **only** when you can point to the intended behaviour change
  (in this branch's diff) that made it stale. Never "fix" a test by loosening it to match a
  bug.
- **(c) Flake** — passes sometimes. Confirm before declaring: run it 3–5 times isolated.

```bash
for i in 1 2 3 4 5; do npx vitest run <file> --retry=0 || echo "FAILED run $i"; done
```

If it fails intermittently it's a flake. A flake gets its **root cause** fixed — never a
silent `.skip`. Usual roots in this codebase:

- **Unawaited async** — assertion runs before state settles. Wrap in `await waitFor(...)` /
  `await findBy...` instead of `getBy...`.
- **Timers** — real `setTimeout`/timer without `vi.useFakeTimers()` + `vi.runAllTimers()`.
- **Shared state** — a module-level or leaked mock bleeding across tests. Add
  cleanup/`vi.clearAllMocks()` in `afterEach`, or scope the fixture.

Verify: run the isolated loop again and confirm 5/5 green.

---

### Playbook: Build

```bash
npm run build
```

Usual suspects, in order of likelihood:

1. **Mis-cased import path (check this FIRST for "Could not resolve").** CI runs Linux
   (case-sensitive FS); dev is macOS Darwin (case-insensitive). `import Foo from './fooForm'`
   when the file is `FooForm.jsx` builds fine locally and fails only in CI. Verify the import
   string matches the on-disk filename exactly:

   ```bash
   grep -rn "from ['\"].*<name>" src/ --include=*.jsx --include=*.js
   ls src/features/<domain>/    # compare casing against the import
   ```

2. **Missing dependency** — an import of a package not in `package.json` (or a devDep that
   should be a dep). `npm ls <pkg>` to check; add it and commit the lockfile change.
3. **Env-dependent code at module top level** — code that reads a real env var or does I/O at
   import time breaks under the dummy `VITE_SUPABASE_*` values. Move it inside a function /
   effect.

Verify: `npm run build` completes with an exit 0 and a written `dist/`.

---

### Playbook: cron-guard

This gate is a **review flag, not a bug** — the fix is never to bypass it. Reproduce:

```bash
node scripts/check-cron-migrations.mjs
```

Output names the migration, line, and the cron-invoked function it touches, e.g.
`supabase/migrations/…_x.sql:42  Cron-invoked function modified: create or replace function
public.generate_hour_pack_reorders() — re-read the whole body…`.

Per CLAUDE.md, a flagged change means: **re-read the ENTIRE function body**, not just the
diff — a prior whole-body rewrite silently broke `generate_hour_pack_reorders` for three
mornings by reverting a branch (writing `type='quote'` into `public.invoices`, which
`invoices_type_check` rejects). Confirm the function's invariants still hold (which
table/`type` it writes, its idempotency).

Resolution is one of:

- The migration is correct on full review → the flag is advisory; note that you reviewed the
  whole body and confirmed invariants, and get explicit user sign-off to proceed. Do **not**
  set `CRON_GUARD_STRICT` or edit the guard to silence it.
- The migration is wrong → amend the migration so the function body is right, then re-run the
  guard.

Remember `app`-job blocking failures still take priority — cron-guard alone won't fail the
run unless strict mode is set.

---

### Playbook: CI-only mismatch (passes locally, fails in CI)

Work these before touching product code:

1. **Node version.** CI pins `22.x`. Compare:

   ```bash
   node --version
   ```

   If you're on a different major, switch (e.g. `nvm use 22`) and re-run the failing gate.
2. **Lockfile drift.** CI runs `npm ci` (exact lockfile), not `npm install`. Reproduce CI's
   install:

   ```bash
   npm ci
   ```

   If this errors (`ERESOLVE`, lockfile out of sync) that's the failure — regenerate and
   commit `package-lock.json`.
3. **Dummy env vars.** CI sets `VITE_SUPABASE_URL=http://localhost:54321` and
   `VITE_SUPABASE_ANON_KEY=ci-dummy-anon-key`. Reproduce the build under those to catch
   top-level code that assumes a real project:

   ```bash
   VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=ci-dummy-anon-key npm run build
   ```

If none of these reproduce it, report that honestly rather than committing blind — describe
what you ruled out and what CI-specific evidence remains in the logs.

---

## Step 3 — Fix and verify

Apply the fix, then re-run the **specific** failed gate plus the **full** blocking set —
green locally is the bar for pushing:

```bash
npm run lint && npx vitest run && npm run build
```

If a migration was involved, also: `node scripts/check-cron-migrations.mjs`.

Commit with a message naming the CI failure fixed:

```bash
git add -A
git commit -m "$(cat <<'EOF'
Fix CI: <one-line root cause> (<gate>)

<what changed and why it makes CI green>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
git push
```

(If on `main`, branch first — never push a CI fix straight to `main`.)

Watch the new run:

```bash
gh run watch            # follow the latest run
# or
gh pr checks --watch    # follow this PR's checks
```

---

## Step 4 — Report

Report back with:

- **What failed** — which job/gate, and the run URL (`gh run view <id> --json url`).
- **Root cause** — the actual reason, not the symptom (e.g. "mis-cased import `./fooForm` vs
  `FooForm.jsx`, only fails on Linux CI").
- **The fix** — files touched and what changed.
- **Local verification** — the output of the full gate set (`lint && vitest run && build` all
  green).
- **New CI status** — the conclusion of the run you pushed.

If it was a **flake**, additionally explain *why* it was flaky (the root cause: unawaited
async / timer / shared state) and exactly what you changed to stabilize it — a flake report
without a root cause is incomplete.
