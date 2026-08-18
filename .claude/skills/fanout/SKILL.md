---
name: fanout
description: Generic parallel-agent task runner for a list of independent code tasks. Predicts each task's file footprint, serializes any that overlap, fans the rest out to worktree-isolated agents that each self-gate with lint + targeted tests, then integrates and runs the full suite. Use whenever the user hands over a list of independent fixes or tasks that could run concurrently, or asks for parallel execution — reach for this instead of improvising ad-hoc parallel agents.
---

# Fanout

The repo's reusable **parallel-agents** primitive. Input is a list of independent code
tasks — from the user's message, `$ARGUMENTS`, a findings ledger like
`docs/audit/findings.md`, or a TODO list. Output is a set of merged, gated changes plus a
per-lane report.

This skill *orchestrates* work; it does not decide *what* the work should be. If the tasks
aren't already enumerated, ask the user to confirm the list before fanning out — a wrong
task list multiplied by N lanes is N times the waste.

## Hard rules (apply to you and every agent you spawn)

1. **No overlapping writes in parallel.** Two lanes may never hold the same file open in
   separate worktrees. Overlap is resolved at planning time (Step 1), not at merge time.
2. **Every lane self-gates before returning.** A lane that hasn't run `npm run lint` and
   `npx vitest run <its targeted paths>` clean is not "done" — it's `partial` or `failed`.
3. **No silent truncation.** Every task in the intake list appears in the final report with
   an outcome. Dropped, deferred, or de-scoped work is stated, never omitted.
4. **A failing gate is not merged.** One retry with the failure output appended; a second
   failure means the lane's diff stays out of the working branch and is reported `failed`.
5. **Conventions are non-negotiable.** Every lane brief carries the repo conventions
   (Step 2). A lane that ships `.then()` chains, per-field `useState`, hardcoded hex, or a
   list query missing `.is('archived_at', null)` has not met the bar.
6. **This skill does not push.** It integrates onto the working branch and gates. Pushing,
   PR-opening, and migrations are the user's call — recommend `/qa` first.

## Model & effort policy

Lanes execute *pre-decided* fixes against a self-contained brief — the judgment happened
at planning time, so lanes default to **one tier below the session model** (currently
`model: 'sonnet'`). Escalate a lane to the session model when its tasks touch money/billing,
RLS, cron-invoked SQL, or edge functions, or when the brief needs real design judgment
rather than a mechanical fix. When unsure, inherit. Decide each lane's model in Step 1
alongside the overlap matrix, and record it in the lane table.

Keep code-writing lanes at the **inherited effort** — lowering effort on code is a false
economy (a failed gate costs a full retry). Reserve `effort: 'low'` for purely mechanical
agents (enumeration, extraction), and note that `effort` is a Workflow-only option: the
Agent-tool fallback can tier `model` but not effort.

---

## Step 1 — Task intake & independence check

**1a. Enumerate.** Turn the input into a numbered task list. Each task gets a one-line
imperative title and a one-sentence acceptance criterion. If the source is
`docs/audit/findings.md`, carry the ledger ID as the task ID.

**1b. Predict the file footprint of each task.** Do not guess — confirm with the repo:

```bash
# Symbol / component the task names:
grep -rl "<symbol-or-component>" src/ --include="*.jsx" --include="*.js"
# Feature-area sweep when the task is scoped to a module:
ls src/features/<domain>/
```

Record, per task, the concrete set of files it will **write** (not merely read).

**1c. Build the overlap matrix.** Tasks that write any file in common **cannot** run in
parallel worktrees (rule 1). Two ways to resolve:

- **Serialize into one lane.** Overlapping tasks A + B become a single lane that does A then
  B sequentially. Preferred when they're small and related.
- **Run sequentially after the fan-out.** Hold B back, run it against the integrated branch
  once A has merged. Preferred when A is large or risky.

Also treat these shared surfaces as implicit overlap — any two tasks that both touch one of
these must be serialized even if the exact lines differ:

- `src/lib/queries.js`
- `src/lib/platformClient.js`
- `src/contexts/*.jsx`
- `src/router/AppRouter.jsx`
- `src/layouts/Sidebar.*`
- `supabase/config.toml`
- shared components under `src/components/**`

**1d. Cap lanes.** Assign each independent (or serialized) group to a lane. **Cap at 4–6
parallel lanes.** Beyond that, integration conflicts and review load outweigh the speedup,
and each lane is a full agent context — more lanes means more tokens with diminishing
return. If there are more than 6 independent groups, run them in waves of ≤6 and integrate
between waves.

**Present the plan before spawning:** the lane table (lane → tasks → files in scope),
what got serialized and why, and any task you're deferring. Get a nod if the mapping is
non-obvious.

---

## Step 2 — Lane briefs

Each lane agent gets a **self-contained** prompt — it runs in an isolated worktree and
cannot see this conversation. Fill the template per lane. Keep the conventions block
verbatim; it is the quality contract.

```
You are lane <N> of a parallel fan-out on the Flowforce repo. Work ONLY the task(s) below,
touch ONLY the files in scope, then gate and return the structured result.

TASK(S):
<task title + acceptance criterion, one block per task in this lane; if multiple, do them
in the order given>

FILES IN SCOPE (do not create or edit anything outside this set without saying so in your
result — if the task genuinely needs a file not listed, note it and proceed minimally):
<absolute or repo-relative paths from Step 1b>

REPO CONVENTIONS (mandatory — code that violates these is not done):
- Reads shared across components: TanStack Query; cross-module query defs live in
  src/lib/queries.js — reuse, don't redefine.
- Reads local to one component: await platform.from(...).select(...), then check `error`
  before using `data`. NEVER a .then() chain — those swallow errors.
- Writes: useMutation; mutationFn calls platform.from(...), onSuccess invalidates the
  affected queryKey(s). Submit button disabled with save.isPending. No manual `saving` flag.
- Form state: a single useState object with a set(key, val) helper. Never one useState per
  field.
- List queries on soft-deletable tables must add .is('archived_at', null). Archive/restore
  via src/lib/softDelete.js helpers.
- No hardcoded hex colours — CSS variables via var(--token) only. No inline styles except
  genuinely dynamic values.
- Default export only; PascalCase component files; helpers as `function` declarations;
  handlers named handle<Event>.
- Destructive actions gated with useConfirm from src/components/ConfirmModal.jsx.

GATE (run before returning — a lane that skips this is incomplete):
  npm run lint
  npx vitest run <the test paths covering your files — src/tests/features/<domain>/... ,
                  plus any test you added>
If your change has meaningful new behaviour (a new branch, validation, or error path) and
no test covers it, add one under src/tests/ mirroring the source path.

RETURN (exactly this structure, nothing else):
  STATUS: done | partial | failed
  FILES CHANGED: <path — one-line what/why, per file>
  GATE: <lint result; vitest command run + pass/fail counts>
  TESTS ADDED: <paths, or "none">
  NOTES: <anything you could not finish, assumptions made, files you had to touch outside
          scope, or "none">
```

---

## Step 3 — Orchestration

**Preferred: the Workflow tool** (this skill's instruction is the opt-in). Model each lane
as a pipeline step; the schema forces the structured return so integration can be
programmatic rather than prose-parsing.

```js
export const meta = {
  name: 'fanout',
  description: 'Run independent code tasks as parallel worktree-isolated lanes.',
  phases: [{ title: 'Lanes', detail: 'one worktree agent per lane' }],
}

// The script body runs in an async context with agent()/parallel()/args as globals.
// Invoke with args: [{ id, brief, model }, ...] built from Steps 1–2 — `model` is the
// per-lane choice from the model policy ('sonnet' default; omit to inherit the session
// model for escalated lanes).
const LANE_RESULT = {
  type: 'object',
  required: ['status', 'filesChanged', 'gate', 'notes'],
  properties: {
    status:       { enum: ['done', 'partial', 'failed'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    gate:         { type: 'string' },   // lint + vitest outcome
    testsAdded:   { type: 'array', items: { type: 'string' } },
    notes:        { type: 'string' },
  },
}

phase('Lanes')
const results = await parallel(args.map(lane => () =>
  agent(lane.brief, { isolation: 'worktree', schema: LANE_RESULT, label: `lane:${lane.id}`, ...(lane.model ? { model: lane.model } : {}) })
    .then(result => result && { id: lane.id, ...result })
))
// A skipped/errored lane resolves to null — report it as failed, don't drop it.
return args.map((lane, i) => results[i] ?? { id: lane.id, status: 'failed', filesChanged: [], gate: 'agent did not return', notes: 'lane agent errored or was skipped' })
```

Each `agent(..., { isolation: 'worktree' })` gets its own git worktree — that is what makes
parallel writes safe. An unchanged worktree is auto-cleaned; a changed one leaves a branch
to integrate in Step 4.

**Fallback (2–3 lanes, no Workflow tool):** issue the Agent-tool calls in a single message
so they run concurrently, each with `isolation: "worktree"`, each carrying its filled Step-2
brief and its per-lane `model` from the model policy (the Agent tool has no `effort` option
— model tiering only). Collect the structured text results. This is fine at small scale; prefer the Workflow
tool once you're at 4+ lanes.

**Do not** spawn lanes one at a time waiting for each — that's serial, and defeats the point.

---

## Step 4 — Integration

Lanes finish as worktree branches. Merge them onto the working branch **one at a time**, in
a deterministic order (lane 1..N), gating incrementally so a bad merge is caught against the
lane that caused it:

```bash
git branch --list 'fanout/*'        # or the worktree branches the runner reports
git merge --no-ff <lane-branch>     # per lane, in order
```

Because Step 1 removed file overlap, clean lanes should merge without conflict. If a
conflict does surface:

- **Shared surface (queries.js, a context, config.toml):** the planning step missed an
  overlap. Stop, take the union by hand, and re-run that file's tests. Don't blind-accept
  one side.
- **Generated/lock files (`package-lock.json`):** regenerate rather than hand-merge — take
  either side then run `npm install`.
- **Genuine same-line conflict:** the later lane in merge order rebases onto the earlier;
  keep both intents, never drop one silently.

A lane reported `failed` in Step 3 (gate never went green) is **not merged** — its branch is
held and it goes into the report as failed.

After all mergeable lanes are in, run the **full gate** on the integrated branch:

```bash
npm run lint && npx vitest run && npm run build
```

If the diff touched `supabase/functions/`, also type-check the changed functions
(`deno check $(find supabase/functions -name '*.ts')` — flag only errors in touched files;
CI runs this non-blocking).

---

## Step 5 — Failure handling (retry protocol)

A lane whose self-gate (Step 3) or the integration gate (Step 4) fails gets **exactly one
retry**:

1. Re-invoke the same lane (same worktree/brief) with the failure output appended under a
   `PREVIOUS ATTEMPT FAILED — fix this and re-gate:` header.
2. If the retry gates clean, merge as normal.
3. If it fails again, **do not merge** its diff. Record it `failed` with the final error.
   Do not let one failed lane block merging the lanes that passed.

Never "fix it yourself, quietly" by editing a lane's output post-hoc without saying so — if
you finish a lane's work inline, that's a note in the report, not a silent patch.

---

## Step 6 — Verification & report

Present this, and nothing the report can't back with a gate result:

### Lane outcomes

| Lane | Task(s) | Outcome | Gate | Files |
|---|---|---|---|---|
| 1 | <id/title> | done | lint ✓ · vitest 12/12 | 3 |
| 2 | <id/title> | partial | lint ✓ · vitest 8/8 | 2 |
| 3 | <id/title> | failed | vitest 1 fail after retry | 0 merged |

### Integrated gate

```
npm run lint    → <result>
npx vitest run  → <N passed / M failed>
npm run build   → <ok / error>
```

### Dropped / deferred / de-scoped

Every task from Step 1 that did **not** fully land, with why and the suggested follow-up.
Serialized-but-not-yet-run tasks (Step 1c) are listed here explicitly — they are not done
just because the plan accounted for them. If nothing was dropped, say so.

### Recommendation

- Clean integrated gate → **run `/qa` before pushing** (fan-out changed multiple modules at
  once; cross-module effects are exactly what `/qa` catches). If any lane touched money,
  RLS, cron SQL, or edge functions, that's a hard recommend, not optional.
- Any `failed` lane → the held branch name and the error, so the user can pick it up or
  re-fan a corrected brief.

---

## What this skill is not

It is not a fix-picker (`/audit-fix` selects and closes ledger findings) and not a reviewer
(`/qa` and `/code-review` are). Fanout takes an already-decided list of independent tasks
and executes them concurrently with a gate. Keep those roles separate: don't let a lane
invent scope beyond its brief, and don't let fanout self-certify quality — that's what the
follow-up `/qa` is for.
