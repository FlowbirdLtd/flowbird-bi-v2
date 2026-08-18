---
name: write-tests
description: Author high-quality Vitest tests for Flowforce — pick a target (the current diff by default, or a named file/module), inventory its real behaviours, copy the repo's house mocking pattern, write behaviour-asserting tests, and prove each one fails against broken code before running the suite green. Use whenever code needs test coverage — after building a feature, when a diff lacks tests, or on any request for tests. Default gate before shipping untested changes.
---

You author Vitest + React Testing Library tests for Flowforce. The bar is not "coverage exists" — it is **tests that fail when the code breaks**. Read `docs/conventions/testing.md` first; this skill operationalises it and must never contradict it.

Non-negotiables (team's accumulated feedback):
- **Test reachable success paths.** Never mock so much that the success path can't actually execute. A test that only ever exercises mocks — where the real code under test never runs a meaningful line — proves nothing and gets rewritten.
- **Never copy Deno edge-function code into a test.** Edge functions (`supabase/functions/**/*.ts`, Deno runtime) are not run under Vitest/jsdom. If edge logic needs testing, extract the pure logic into an importable module and test that; otherwise leave it to `deno check` + integration. (Exception, already in the repo: a `_shared/*.ts` module whose only imports are `import type` compiles under esbuild and can be imported directly — see `src/tests/lib/logAudit.test.js`. That is not "copying code into the test"; it imports the real production module.)
- **Test files mirror source paths** under `src/tests/`: `src/features/billing/InvoiceForm.jsx` → `src/tests/features/billing/InvoiceForm.test.jsx`. `.test.jsx` for components, `.test.js` for utilities.

Work the steps in order. Do not skip the quality gate (Step 5) — it is the whole point.

---

## Step 1 — Select targets

If `$ARGUMENTS` names a file or module, use it. Otherwise derive from the diff:

```bash
git diff origin/main..HEAD --name-only   # committed, unpushed
git diff HEAD --name-only                # uncommitted (staged + unstaged)
```

Union the two lists. Filter to testable source: keep `src/**/*.js` and `src/**/*.jsx`, **drop** anything under `src/tests/`, `*.css`, `*.md`, and config. For each surviving target, check whether its mirrored test file already exists:

```bash
# target src/features/crm/DealForm.jsx  ->  src/tests/features/crm/DealForm.test.jsx
ls src/tests/features/crm/DealForm.test.jsx 2>/dev/null
```

If it exists, **extend it** (add `it()` blocks for uncovered behaviours) — never create a duplicate file. If the diff is empty and no argument was given, say so and stop.

---

## Step 2 — Behaviour inventory

For each target, read the file and list its **testable behaviours** — not lines, behaviours:

- validation branches (empty submit → which error message?)
- error paths (`onError`, a rewritten friendly message, a `code === '23505'` branch)
- conditional rendering (badge shows only when `status === 'overdue'`)
- calculations / mappings (`numOrNull`, totals, `strOrNull` turning `''` → `null`)
- mutation success **and** error handlers (payload captured, `onSaved` fired, cache rolled back)

Prioritise: **pure logic and validation first**, then interaction flows. Skip trivialities (a `<div>` renders, a static label exists). Write the inventory down — it becomes the Step 7 report table.

---

## Step 3 — Study the nearest existing test

Before writing, read the closest existing test to your target (same feature folder if possible) and **copy its mocking approach exactly**. Do not invent a new harness. The house patterns, confirmed across the suite:

**The Supabase mock is a per-file inline `vi.mock` factory returning a chainable thenable.** The helper at `src/tests/helpers/supabase.js` exists but is imported by *zero* test files — the house style is inline. Every chain method returns the chain; `then`/`catch`/`single`/`maybeSingle` resolve to `{ data, error }`:

```js
function makeChain(resolved = { data: [], error: null }) {
  const calls = []
  const record = (name) => (...args) => { calls.push({ name, args }); return chain }
  const chain = {
    __calls: calls,
    select: record('select'), insert: record('insert'), update: record('update'),
    delete: record('delete'), eq: record('eq'), neq: record('neq'), order: record('order'),
  }
  const resolve = () => Promise.resolve(resolved)
  chain.single = vi.fn(resolve)
  chain.maybeSingle = vi.fn(resolve)
  chain.then = (a, b) => resolve().then(a, b)   // makes `await chain` work
  return chain
}
```

**Key the chains by table name** when a component fires several loads, so an added query can't shift the chain your assertions depend on (from `CompanyForm.test.jsx`):

```js
let chainsByTable = {}
vi.mock('@/lib/platformClient', () => ({
  platform: {
    from: vi.fn((table) => {
      const next = chainsByTable[table] || makeChain({ data: [], error: null })
      chainsByTable[table] = next
      next.__table = table
      return next
    }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}))
```

For an **ordered multi-step mutation** (parent insert, then lines), queue chains in an array and shift per `from()` call instead — see `src/tests/features/billing/createInvoice.test.js`.

**Auth is mocked with a fixed session:**

```js
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user_1' } } }),
}))
```

**TanStack Query components render inside a fresh client with retries off** (from `DocumentCommentThread.test.jsx`):

```js
function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}
const renderWithQuery = (client, ui) => render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
```

**When the mock factory needs per-test mutable state** (e.g. flip an insert to fail), declare it with `vi.hoisted` so it exists before the hoisted `vi.mock` runs, and reset it in `beforeEach`:

```js
const h = vi.hoisted(() => ({ insertError: null, inserts: [] }))
beforeEach(() => { vi.clearAllMocks(); h.insertError = null; h.inserts = [] })
```

**Pure utilities need no mocks at all** — import the real function and assert (`src/tests/features/billing/clientRevenueCalc.test.js`).

---

## Step 4 — Author the tests

Write from the inventory using the pattern you just copied. Rules:

- **Assert user-visible behaviour**, not implementation internals: rendered text (`screen.getByText`), a disabled button, an error message, `onSaved` having been called, the captured insert payload (`chain.__calls.find(c => c.name === 'insert').args[0]`). Do not assert on internal state variables or that a private function was called.
- **One behaviour per `it()`.** One `describe` per component/function.
- **Queries:** `getByRole` / `getByLabelText` / `getByPlaceholderText` over `getByTestId`. `userEvent.setup()` over `fireEvent`.
- **Async:** `await screen.findByText(...)` / `await waitFor(() => ...)`. Never `setTimeout` or arbitrary sleeps.
- **No snapshot tests.**
- **Reachable success path:** the test must drive real code — type into inputs, click submit, and let the component's real mapping/validation/mutation run against the mocked Supabase boundary. If you find yourself mocking the very function under test, stop; you are testing the mock.
- Error messages shown to users are friendly strings — assert the friendly text, not a raw Supabase error.

Mirror the path and create parent dirs if needed: `mkdir -p src/tests/features/<domain>`.

---

## Step 5 — Quality gate: mutation sanity check (MANDATORY)

A test only counts if it fails when the code is wrong. For **at least the most important new test**, prove it:

1. Confirm it passes as written:
   ```bash
   npx vitest run src/tests/features/<domain>/<Target>.test.jsx
   ```
2. Temporarily break the code under test — flip one condition or mapping in the **source** file (e.g. change `if (!form.name)` to `if (form.name)`, or `numOrNull(v)` to `v`). Edit the source, not the test.
3. Re-run the same command. The test **must now fail**, and fail on the assertion you expect:
   ```bash
   npx vitest run src/tests/features/<domain>/<Target>.test.jsx
   ```
4. **Restore the source** exactly (`git checkout -- <source file>` or revert your edit) and confirm green again.

If the test still passed against the broken code, it is asserting nothing meaningful — rewrite it to assert the behaviour that the break changed, and repeat. Record in the report which test you gated and what break you used.

---

## Step 6 — Run to green

```bash
npx vitest run src/tests/features/<domain>/<Target>.test.jsx   # your new/changed files first
npx vitest run                                                 # full suite — what CI runs
```

Fix any collateral failures your mocks or shared edits caused. Do not leave the suite red. If a pre-existing failure is unrelated to your target, note it in the report rather than papering over it.

---

## Step 7 — Report

Present:

**Coverage table**

| Target file | Behaviours covered | Test file |
|---|---|---|
| `src/features/crm/DealForm.jsx` | empty-name validation; numeric `value` mapping; `onSaved` on success; duplicate-key friendly error | `src/tests/features/crm/DealForm.test.jsx` |

**Quality gate** — which test you mutation-checked, the break you introduced, and confirmation it failed then passed on restore.

**Deliberately not covered** — behaviours you skipped and why (trivial render; Deno edge logic left to `deno check`; requires integration/RLS; already covered by an existing test).

**Suite result** — `N passed` from the final full `npx vitest run`.
