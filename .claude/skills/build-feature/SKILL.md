---
name: build-feature
description: Orchestrated, convention-locked workflow for building a new Flowforce feature (or substantial change) to production quality — scope, slice plan, worktree-parallel implementation, integration gate, tests, and a staged-migration hand-off. Ships the app/UI layer first and leaves any DB migration written-but-unapplied until the user says go. This is the default way features get built in this repo — use for ANY request to build, add, or implement a feature or substantial multi-file change, whether or not the user names this skill.
---

# Build Feature

The "how we build code here" skill. It turns a feature ask into shipped, tested,
convention-compliant code through six phases. Every step below is runnable or
grep-checkable — do not substitute judgement for the gates.

## Hard rules (apply to you and every agent you spawn)

1. **Ship order: app/UI layer FIRST, DB migrations LAST.** Design schema up front
   so the UI is built against a known shape, but the migration file is *written,
   not applied*, until the user explicitly approves it in the hand-off phase.
2. **Migrations reach an environment by MERGING, never by applying.** Supabase
   Branching applies them to preprod on merge; `release-prod.yml` (on a version tag)
   applies them to prod. Never `mcp__supabase__apply_migration`, never `supabase db
   push`, and never apply mid-build. The migration file is written and committed; the
   pipeline applies it.
3. **Data patterns are non-negotiable** (`docs/conventions/data.md`):
   - Reads shared across components → TanStack Query definition in `src/lib/queries.js`.
   - Component-local reads → awaited `platform.from(...)` with `error` checked on the
     next line. Never a `.then()` chain.
   - Writes → `useMutation`; `onSuccess` invalidates the cache; button disabled with
     `save.isPending`. Never call Supabase directly inside a `handleSubmit`.
   - No `select('*')` — name columns. `.single()` only when the row must exist.
4. **Form state is one `useState` object** with a `set(key, val)` helper — never a
   `useState` per field (`docs/conventions/react.md`).
5. **Soft delete** via `src/lib/softDelete.js` (`archiveRow`/`restoreRow`); every list
   query adds `.is('archived_at', null)`.
6. **Styling:** Tailwind + `var(--token)` from `src/index.css`. No hardcoded hex, no
   inline styles except genuinely dynamic computed values (`docs/conventions/styling.md`).
7. **Route guards** (`RequireAccess` in `src/router/AppRouter.jsx`) are UX only. Real
   access control is Postgres RLS — every new table needs RLS policies in its migration.
8. **Gate before "done":** `npm run lint && npx vitest run && npm run build` must pass.
   Spawned slice agents run `npm run lint` + targeted `npx vitest run <paths>` before returning.

Requires the Supabase MCP server for the migration hand-off. If it isn't connected, you
can still build and stage the migration, but say so — the user will have to apply it.

---

## Phase 1 — Scope & context

1. **Restate the ask** in one paragraph: what the feature does, who uses it, and the
   user-visible surfaces it touches (views, forms, reports). Get this echoed back before
   building anything non-trivial.
2. **Identify the module.** Map the feature to a `src/features/<domain>/` directory.
   Read its spec and confirm it exists:
   ```bash
   ls docs/spec/modules/<domain>.md 2>/dev/null || ls -d docs/spec/modules/<domain>/ 2>/dev/null
   ```
   If no spec exists, flag it — you will build from code alone and should note this in the
   final report (a `/sync-spec` afterward is then more important).
3. **Learn the local idioms.** Read the existing components in the touched module before
   writing new ones — match their structure, not just the global conventions:
   ```bash
   ls src/features/<domain>/
   grep -rl "useMutation\|useQuery" src/features/<domain>/    # how this module reads/writes
   grep -rn "<domain>" src/lib/queries.js                      # shared query keys already defined
   ```
4. **Decide the data model.** Does this need new tables/columns/RLS? Answer explicitly:
   - **No schema change** → skip migration work entirely.
   - **Schema change needed** → design it now (tables, columns, RLS policies), because the
     UI will be built against it. Check what already exists before inventing columns:
     ```bash
     ls supabase/migrations/ | tail -20        # naming + recent shape
     grep -rn "create table" supabase/migrations/ | grep -i "<table>"
     ```
     The migration is *written* in Phase 2 and *applied* in Phase 6 — not before.

---

## Phase 2 — Plan

Produce a **slice plan** and show it to the user before implementing. A slice is a
coherent vertical unit of work (e.g. "list view", "create/edit form", "detail panel",
"edge function"). For each slice record:

- **Files to touch** (create or edit) — exact paths.
- **Conventions in play** — which data pattern, whether it has a form, whether it touches
  `queries.js`, the sidebar, or the router.
- **Dependency note** — which slices are *independent* (disjoint file sets, buildable in
  parallel) and which are *sequential* (one consumes another's exports).

Then decide the **schema** (only if Phase 1 said yes). Write the migration file now so the
UI targets a known shape, but do **not** apply it:

```bash
# Timestamped name, matching the existing convention (YYYYMMDDHHMMSS_slug.sql):
ls supabase/migrations/ | tail -3
# Create supabase/migrations/<new-timestamp>_<feature-slug>.sql containing:
#   - create table … (explicit columns, archived_at/archived_by if soft-deletable)
#   - alter table … enable row level security;
#   - create policy … (RLS — the real access control; route guard is UX only)
```

If the migration redefines a `pg_cron`-invoked function, `npm run cron-guard` will flag it
in CI — re-read the *whole* function body against the original, never just the diff.

**Output of this phase:** the ordered slice list with the parallel/sequential split marked,
plus the staged migration path (if any). This is the contract the implementation phase executes.

---

## Phase 3 — Implementation

Choose the execution mode by counting genuinely independent slices.

### Verify independence before parallelising

Two slices are independent only if their file sets are disjoint. Check literally:

```bash
# List the planned files per slice and eyeball for overlap. Shared files
# (queries.js, AppRouter.jsx, Sidebar.jsx, a common component) force sequencing —
# the slice that owns that file goes first, or the edit is pulled into integration.
```

### Mode A — Inline (default: 1–2 slices, or any file overlap)

Implement directly with Edit/Write, slice by sequential slice. This is the right choice
for most features and always correct when slices share files. Run the gate after each slice:

```bash
npm run lint && npx vitest run src/tests/features/<domain>/
```

### Mode B — Parallel worktrees (3+ genuinely disjoint slices)

Orchestrate one agent per slice, each in its own git worktree so their edits never collide.
Prefer the **Workflow tool** if available; otherwise fall back to parallel **Agent** calls
with `isolation: 'worktree'` (send them in a single message so they run concurrently).

**Model per slice:** slices are convention-locked and build against a staged schema, so
default them **one tier below the session model** (currently `model: 'sonnet'`). Keep a
slice on the session model (omit `model`) when it needs genuine design judgment — a new
pattern with no sibling to copy, an edge function, or anything touching billing/RLS.
Record the choice in the Phase 2 slice plan. Do not lower `effort` on code-writing slices
— a failed gate costs a full retry, which eats the savings. Planning (Phase 2) and
integration (Phase 4) stay inline on the session model; they are where the judgment lives.

**Every slice-agent prompt MUST contain, verbatim:**
- The slice's file list and what it builds.
- The exact conventions the slice follows — paste the relevant hard rules above (data
  pattern, form pattern with the `set(key,val)` helper, styling tokens, soft-delete).
- The staged schema shape (column names/types) so the UI targets the right fields — and
  the instruction **do not apply any migration**.
- The return gate: *"Before returning, run `npm run lint` and
  `npx vitest run <this slice's test paths>`. Both must pass. Report the pass/fail and the
  list of files you changed. Do not touch files outside your slice's list."*

Workflow script skeleton (adapt names; drop it in the scratchpad and run it):

```js
export const meta = {
  name: 'build-feature-<slug>',
  description: 'Parallel slice build for <feature>',
  phases: [{ title: 'Slices', detail: 'one worktree agent per independent slice' }],
}

// The script body runs in an async context with agent()/parallel() as globals.
// Each slice runs in its own worktree agent. The prompt string must embed the
// conventions block + gate described above — keep it self-contained; the agent
// does not see this file's context.
function sliceBrief(name, files, task) {
  return `You are building the "${name}" slice of <feature>.
Files you own (touch nothing else): ${files.join(', ')}
CONVENTIONS (follow exactly):
<paste data pattern, form pattern, styling tokens, soft-delete rules>
STAGED SCHEMA (build against this; DO NOT apply any migration):
<paste column names/types>
GATE before returning: run \`npm run lint\` and \`npx vitest run <test paths>\`;
both must pass. Report pass/fail and the exact files you changed.
${task}`
}

phase('Slices')
// model: 'sonnet' per the model policy — drop the option (inherit the session model)
// for any slice flagged design-heavy in the Phase 2 plan.
const results = await parallel([
  () => agent(sliceBrief('list-view',   ['src/features/<domain>/XList.jsx'],   'Build the list view.'),        { isolation: 'worktree', label: 'slice:list-view',   model: 'sonnet' }),
  () => agent(sliceBrief('create-form', ['src/features/<domain>/XForm.jsx'],   'Build the create/edit form.'), { isolation: 'worktree', label: 'slice:create-form', model: 'sonnet' }),
  () => agent(sliceBrief('detail',      ['src/features/<domain>/XDetail.jsx'], 'Build the detail panel.'),     { isolation: 'worktree', label: 'slice:detail',      model: 'sonnet' }),
])
return results   // null entries = errored/skipped slices; treat those as failed, don't drop them
```

If a sequential dependency exists, use `pipeline(items, stageA, stageB)` so each item's
stage B starts only after its stage A returns — or simply `await` the prerequisite slice
before spawning the dependent one. Never put two slices that edit the same file in the
same `parallel([...])` batch.

Collect each agent's changed-file list and gate result — you need them for Phase 4.

---

## Phase 4 — Integration

1. **Merge slice results.** For worktree agents, bring each worktree's changes back onto the
   working branch. Resolve conflicts by hand — the most likely conflict site is a shared
   file every slice wanted to touch (route table, sidebar, `queries.js`).
2. **Wire the registrations** that no single slice owns:
   ```bash
   # New page → route registered?
   grep -n "<NewPage>" src/router/AppRouter.jsx
   # New top-level route → sidebar link (if it should be navigable)?
   grep -n "<new-route-path>" src/layouts/Sidebar.jsx
   # New shared read → single definition in queries.js, not duplicated in a feature?
   grep -rn "<new-query-key>" src/lib/queries.js src/features/
   # Access-controlled route wrapped in RequireAccess?
   grep -n "RequireAccess" src/router/AppRouter.jsx
   ```
   Anything the feature adds but doesn't register is a silent dead feature — the classic
   agentic miss. Fix every gap here.
3. **Run the full gate** and do not proceed until it is clean:
   ```bash
   npm run lint && npx vitest run && npm run build
   ```
4. **Cross-module check.** For every `invalidateQueries` you added, confirm the key isn't
   fanning out refetches into unrelated modules, and confirm no `src/features/<A>/` file
   now imports from `src/features/<B>/` (cross-feature imports are a coupling violation):
   ```bash
   grep -rn "invalidateQueries" src/features/<domain>/
   grep -n "from.*\.\./[a-z]" src/features/<domain>/*.jsx
   ```

---

## Phase 5 — Tests

Every new user-visible behaviour and every validation branch gets a test. Do not chase
100% coverage; do cover the branches the diff added.

1. **Mirror the source path** under `src/tests/` — a component at
   `src/features/<domain>/XForm.jsx` gets `src/tests/features/<domain>/XForm.test.jsx`.
2. **Copy the house mocking pattern from the nearest sibling test** — a per-file inline
   `vi.mock('@/lib/platformClient', …)` factory returning a chainable thenable (see
   `/write-tests` for the full pattern). Never mock a success path so thoroughly the code
   under test can't actually reach it. Find the idiom to copy:
   ```bash
   ls src/tests/features/<domain>/ 2>/dev/null
   grep -rl "vi.mock('@/lib/platformClient'" src/tests/features/ | head -3
   ```
3. **Cover, at minimum:** the happy path (renders/saves), each validation branch (submit
   with a required field empty → error shown, no write), and the `onError` path if a new
   mutation wired one up.
4. **Run the targeted suite, then the full one:**
   ```bash
   npx vitest run src/tests/features/<domain>/
   npx vitest run
   ```

Untested new branches are the specific thing `/qa` will flag — close them here.

---

## Phase 6 — Hand-off

1. **Run `/qa`** on the result. It does the cross-module, completeness, correctness, and
   convention sweep this skill's gates don't fully cover. Address its findings before
   declaring done.
2. **Run `/sync-spec`** if the feature changed or added module behaviour, so
   `docs/spec/modules/<domain>.md` stays truthful. If RLS changed, also update
   `docs/security/rls-audit.md`.
3. **The migration is STAGED, not applied.** State this explicitly. It is applied by the
   pipeline, not by you: it reaches **preprod** when the feature PR merges (Supabase
   Branching applies it), and **prod** when a version tag runs `release-prod.yml`. Hand
   off to **/ship**, which drives that path with the gates and stop points. Never
   `mcp__supabase__apply_migration`, never `supabase db push`. If it touches a cron
   function, re-verify the whole function body first (`npm run cron-guard`).

---

## Final report format

Report back in this shape (omit empty sections):

```
BUILT
- <feature> across <N> slices: <one line each — file(s) + what it does>

GATES
- lint: pass/fail    vitest: N passed    build: pass/fail
- new tests: <paths added, what they cover>

MIGRATION
- STAGED (not applied): supabase/migrations/<file>.sql — <tables/columns/RLS added>
- Applied by the pipeline on ship: Branching on merge to preprod, release-prod.yml on tag.
  Hand off to /ship. (or: "No schema change — nothing to apply.")

REGISTRATIONS WIRED
- route: <path> → <Page>   sidebar: <yes/no>   queries.js: <keys added>

FOLLOW-UPS
- /qa result summary; /sync-spec run or needed; any spec gap flagged in Phase 1;
  any deferred slice or known limitation.
```
