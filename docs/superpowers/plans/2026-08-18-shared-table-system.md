# Shared Table System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four hand-rolled list tables (Deals, Contacts, Organisations, Users) with one config-driven table system, and apply the reviewed visual direction.

**Architecture:** Generic, entity-agnostic pieces live in `src/components/table/`. Each entity contributes a column config array and a stats function in `src/features/<domain>/`. A `useTableState` hook owns search, sort, pagination and column visibility; `TableShell` wires those into the card layout. Pages fetch through their existing TanStack Query hook and compose.

**Tech Stack:** React 19, Vite 8, Vitest 4 + @testing-library/react 16 (jsdom), TanStack Query 5, React Router 7. Styling is CSS variables in `src/index.css` plus inline styles — matching existing code. No CSS-in-JS, no component library.

**Spec:** `docs/superpowers/specs/2026-08-18-shared-table-system-design.md`

## Global Constraints

- **Light mode only.** No dark theme, no `prefers-color-scheme` blocks.
- **Existing tokens keep their values and meanings.** `--nav #1B2A4A`, `--accent #0B3A86`, `--red #C8102E`, `--text #0F1D3B`, `--text-muted #6b7280`, `--border #e5e7eb`, `--radius 6px` are not redefined. New tokens are additive.
- **`--red` appears only on Declined deals and destructive actions.** It is not a general accent.
- **No data-layer changes.** No new queries, no schema change, no edge function change. All reads stay in `src/hooks/use*.js` exactly as they are.
- **CRM columns are `text` in Postgres.** Numeric-looking values arrive as strings. Every formatter and comparator must coerce, never assume a JS number.
- **Rows are 46px** with a single 1px `--line` rule and no zebra striping.
- **Empty values render as a muted em dash (`—`)** in every column, never as blank space.
- **Functional components, default export, PascalCase filename.** Form state as a single object. `@` aliases `./src`.
- **Tests mirror source paths** under `src/tests/`.
- **Commit after every task.** Run `npm run lint` before each commit.
- **Copy rule:** sentence case for buttons and labels ("Reset password", not "Reset Password") except proper nouns and existing product terms.

---

## File Structure

**Create — generic table system (`src/components/table/`):**

| File | Responsibility |
|---|---|
| `format.js` | `getValue` (nested key access), `formatCell` (type → display string) |
| `sorting.js` | `compareRows` / `sortRows`, type-aware, blanks always last |
| `columnStorage.js` | localStorage read/write of hidden column keys, defensive |
| `useTableState.js` | search, sort, page, perPage, column visibility; derives page rows |
| `useSyncedScroll.js` | top scrollbar strip mirroring the table body's scrollWidth |
| `Chip.jsx` | coloured pill — stage, status, permission |
| `StatStrip.jsx` | responsive grid of stat cards |
| `TabRail.jsx` | horizontal counted chip tabs |
| `Pagination.jsx` | range text, per-page select, page indicator, prev/next |
| `ColumnPicker.jsx` | popover with a checkbox per hideable column |
| `TableToolbar.jsx` | search box, column picker, export button |
| `DataTable.jsx` | the `<table>`: header, sort affordance, sticky column, rows, empty state |
| `TableShell.jsx` | card layout wiring stats, tabs, toolbar, pagination, scroll and table |

**Create — per-entity config (`src/features/`):**

`deals/columns.jsx`, `contacts/columns.jsx`, `organisations/columns.jsx`, `users/columns.jsx` — each exports a `*_COLUMNS` array and a `*Stats(rows)` function.

**Modify:** `src/index.css` (tokens + fonts), `package.json` (font deps), and the four pages, each of which loses its inline toolbar/pagination/table markup.

**Note:** `TabRail.jsx` is not named in the spec but is required by the Deals stage tabs. It is generic (labels + counts + active), so it belongs in `components/table/`.

---

### Task 1: Design tokens and typography

**Files:**
- Modify: `src/index.css:3-13` (the `:root` block) and `:22` (`body` font-family)
- Modify: `package.json` (two dependencies)
- Modify: `src/main.jsx` (font imports)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS variables `--ground`, `--surface`, `--surface-alt`, `--ink-soft`, `--ink-faint`, `--line`, `--line-strong`, `--accent-wash`, `--shadow-sm`, `--shadow-md`, `--shadow-rail`, `--radius-lg`, `--radius-sm`, `--font-ui`, `--font-data`, and `--chip-{neutral,blue,teal,green,amber,red}-{bg,fg}`. Every later task styles through these names.

- [ ] **Step 1: Install the font packages**

```bash
npm install @fontsource/manrope@^5 @fontsource/ibm-plex-mono@^5
```

Self-hosted rather than a Google Fonts `<link>`: this is an internal tool that
must not depend on an external request.

- [ ] **Step 2: Import the weights actually used**

In `src/main.jsx`, above the existing `import './index.css'`:

```js
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
```

Import only these weights. Pulling the full family ships every weight and
several unused subsets.

- [ ] **Step 3: Add the new tokens**

In `src/index.css`, inside the existing `:root` block, after `--radius: 6px;`.
Do not change the values above it.

```css
  /* Table system — additive. Existing tokens above keep their meanings. */
  --ground:      #F4F6FA;
  --surface:     #FFFFFF;
  --surface-alt: #FAFBFD;
  --ink-soft:    #5A6580;
  --ink-faint:   #8B94A8;
  --line:        #E4E8F0;
  --line-strong: #CFD6E4;
  --accent-wash: #EDF2FC;
  --shadow-sm:   0 1px 2px rgba(15, 29, 59, .06);
  --shadow-md:   0 4px 16px -4px rgba(15, 29, 59, .12), 0 1px 3px rgba(15, 29, 59, .06);
  --shadow-rail: 8px 0 12px -10px rgba(15, 29, 59, .30);
  --radius-lg:   10px;
  --radius-sm:   7px;

  --font-ui:   'Manrope', ui-sans-serif, system-ui, sans-serif;
  --font-data: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  /* Chip ramp. Follows pipeline progress; red is reserved for Declined. */
  --chip-neutral-bg: #EEF1F6; --chip-neutral-fg: #4A5670;
  --chip-blue-bg:    #E6EEFB; --chip-blue-fg:    #1D4FA3;
  --chip-teal-bg:    #E0F1EE; --chip-teal-fg:    #10695C;
  --chip-green-bg:   #E2F2E6; --chip-green-fg:   #1F6B36;
  --chip-amber-bg:   #FBF0DD; --chip-amber-fg:   #8A5A10;
  --chip-red-bg:     #FBE8EB; --chip-red-fg:     #A50E26;
```

- [ ] **Step 4: Point the body at the new face and ground**

Replace the two lines in the existing `body` rule:

```css
  background: var(--ground);
  font-family: var(--font-ui);
```

`--bg` stays defined for anything still referencing it.

- [ ] **Step 5: Verify the app still builds and renders**

Run: `npm run build && npm run lint`
Expected: build succeeds, lint clean.

Then `npm run dev` and open http://localhost:5174. Check the login page, a
list page, a detail page and Account Settings. Expected: everything renders in
Manrope, nothing overlaps or overflows, no console errors.

This step is a visual check by design — CSS variable values are not worth a
unit test, but a font swap that breaks a layout is worth two minutes of eyes.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/main.jsx src/index.css
git commit -m "Add table design tokens and self-hosted typography"
```

---

### Task 2: Cell value access and formatting

**Files:**
- Create: `src/components/table/format.js`
- Test: `src/tests/components/table/format.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `getValue(row, key)` → the value at a dotted path, or `undefined`.
  - `formatCell(value, type)` → a display **string**, or `null` when the value is empty. `null` is the signal for callers to render the em dash.
  - `EMPTY` → the string `'—'`.
  - Types: `'text' | 'number' | 'gbp' | 'gbpShort' | 'multiple' | 'date'`.

- [ ] **Step 1: Write the failing tests**

```js
// src/tests/components/table/format.test.js
import { describe, it, expect } from 'vitest'
import { getValue, formatCell, EMPTY } from '@/components/table/format'

describe('getValue', () => {
  it('reads a top-level key', () => {
    expect(getValue({ name: 'Acme' }, 'name')).toBe('Acme')
  })

  it('reads a nested key', () => {
    expect(getValue({ contact: { name: 'Ada' } }, 'contact.name')).toBe('Ada')
  })

  it('returns undefined when an intermediate link is missing', () => {
    expect(getValue({ contact: null }, 'contact.name')).toBeUndefined()
  })
})

describe('formatCell', () => {
  it('returns null for empty values so callers can render a dash', () => {
    for (const empty of [null, undefined, '']) {
      expect(formatCell(empty, 'text')).toBeNull()
    }
  })

  // CRM columns are `text` in Postgres — numbers arrive as strings.
  it('formats a numeric string as GBP', () => {
    expect(formatCell('1850000', 'gbp')).toBe('£1,850,000')
  })

  it('formats a number as GBP', () => {
    expect(formatCell(1850000, 'gbp')).toBe('£1,850,000')
  })

  it('abbreviates large sums', () => {
    expect(formatCell(214000000, 'gbpShort')).toBe('£214m')
    expect(formatCell(1200000000, 'gbpShort')).toBe('£1.2bn')
    expect(formatCell(850000, 'gbpShort')).toBe('£850k')
  })

  it('formats an EBITDA multiple', () => {
    expect(formatCell('7.1', 'multiple')).toBe('7.1×')
  })

  it('formats an ISO date as en-GB', () => {
    expect(formatCell('2026-07-22', 'date')).toBe('22/07/2026')
  })

  it('treats zero as empty for money and multiples', () => {
    // An unpriced deal stores 0, which must not read as "£0".
    expect(formatCell(0, 'gbp')).toBeNull()
    expect(formatCell('0', 'multiple')).toBeNull()
  })

  it('keeps a genuine zero for plain numbers', () => {
    expect(formatCell(0, 'number')).toBe('0')
  })

  it('returns null for an unparseable date rather than "Invalid Date"', () => {
    expect(formatCell('not a date', 'date')).toBeNull()
  })

  it('falls back to string for unknown types', () => {
    expect(formatCell('Offer Made', 'text')).toBe('Offer Made')
  })

  it('exports the em dash used for empty cells', () => {
    expect(EMPTY).toBe('—')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/format.test.js`
Expected: FAIL — cannot resolve `@/components/table/format`.

- [ ] **Step 3: Write the implementation**

```js
// src/components/table/format.js

/** Rendered in place of an empty cell, so no column shows blank space. */
export const EMPTY = '—'

/** Reads a dotted path, e.g. 'contact.name'. Returns undefined if any link is missing. */
export function getValue(row, key) {
  return key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), row)
}

/**
 * CRM columns are `text` in Postgres, so numbers arrive as strings.
 * Returns null when the value is not a usable number.
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function gbpShort(n) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return '£' + (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'bn'
  if (abs >= 1e6) return '£' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'm'
  if (abs >= 1e3) return '£' + Math.round(n / 1e3) + 'k'
  return '£' + n.toLocaleString('en-GB')
}

/**
 * Formats a raw cell value for display.
 * Returns null when there is nothing to show — the caller renders EMPTY.
 */
export function formatCell(value, type = 'text') {
  if (value === null || value === undefined || value === '') return null

  if (type === 'gbp' || type === 'gbpShort' || type === 'multiple') {
    const n = toNumber(value)
    // Zero means "not priced yet" for money and multiples, not a real zero.
    if (n === null || n === 0) return null
    if (type === 'gbp') return '£' + n.toLocaleString('en-GB')
    if (type === 'gbpShort') return gbpShort(n)
    return n.toFixed(1) + '×'
  }

  if (type === 'number') {
    const n = toNumber(value)
    return n === null ? null : n.toLocaleString('en-GB')
  }

  if (type === 'date') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB')
  }

  return String(value)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/format.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/format.js src/tests/components/table/format.test.js
git commit -m "Add table cell value access and formatting"
```

---

### Task 3: Type-aware sorting

**Files:**
- Create: `src/components/table/sorting.js`
- Test: `src/tests/components/table/sorting.test.js`

**Interfaces:**
- Consumes: `getValue` from `@/components/table/format`.
- Produces: `sortRows(rows, { key, dir }, columns)` → a **new** sorted array. `dir` is `'asc' | 'desc'`. `columns` is the column config array, used to look up the sorted column's `type`.

- [ ] **Step 1: Write the failing tests**

```js
// src/tests/components/table/sorting.test.js
import { describe, it, expect } from 'vitest'
import { sortRows } from '@/components/table/sorting'

const COLUMNS = [
  { key: 'title', type: 'text' },
  { key: 'value', type: 'gbp' },
  { key: 'exchanged', type: 'date' },
  { key: 'contact.name', type: 'text' },
]

const names = rows => rows.map(r => r.title)

describe('sortRows', () => {
  it('sorts numeric strings numerically, not lexically', () => {
    const rows = [
      { title: 'a', value: '9000' },
      { title: 'b', value: '10000' },
      { title: 'c', value: '800' },
    ]
    expect(names(sortRows(rows, { key: 'value', dir: 'asc' }, COLUMNS))).toEqual(['c', 'a', 'b'])
  })

  it('sorts dates chronologically', () => {
    const rows = [
      { title: 'a', exchanged: '2026-07-22' },
      { title: 'b', exchanged: '2026-01-19' },
      { title: 'c', exchanged: '2026-12-01' },
    ]
    expect(names(sortRows(rows, { key: 'exchanged', dir: 'asc' }, COLUMNS))).toEqual(['b', 'a', 'c'])
  })

  it('sorts text case-insensitively in en-GB', () => {
    const rows = [{ title: 'banana' }, { title: 'Apple' }, { title: 'cherry' }]
    expect(names(sortRows(rows, { key: 'title', dir: 'asc' }, COLUMNS)))
      .toEqual(['Apple', 'banana', 'cherry'])
  })

  it('sorts by a nested key', () => {
    const rows = [
      { title: 'a', contact: { name: 'Zoe' } },
      { title: 'b', contact: { name: 'Ada' } },
    ]
    expect(names(sortRows(rows, { key: 'contact.name', dir: 'asc' }, COLUMNS))).toEqual(['b', 'a'])
  })

  it('puts blanks last when ascending', () => {
    const rows = [{ title: 'a', value: '' }, { title: 'b', value: '500' }]
    expect(names(sortRows(rows, { key: 'value', dir: 'asc' }, COLUMNS))).toEqual(['b', 'a'])
  })

  // The point of blanks-last: reversing must not flood page 1 with empties.
  it('still puts blanks last when descending', () => {
    const rows = [{ title: 'a', value: '' }, { title: 'b', value: '500' }]
    expect(names(sortRows(rows, { key: 'value', dir: 'desc' }, COLUMNS))).toEqual(['b', 'a'])
  })

  it('does not mutate the input array', () => {
    const rows = [{ title: 'b' }, { title: 'a' }]
    sortRows(rows, { key: 'title', dir: 'asc' }, COLUMNS)
    expect(names(rows)).toEqual(['b', 'a'])
  })

  it('returns rows unchanged when there is no sort key', () => {
    const rows = [{ title: 'b' }, { title: 'a' }]
    expect(names(sortRows(rows, { key: null, dir: 'asc' }, COLUMNS))).toEqual(['b', 'a'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/sorting.test.js`
Expected: FAIL — cannot resolve `@/components/table/sorting`.

- [ ] **Step 3: Write the implementation**

```js
// src/components/table/sorting.js
import { getValue } from './format'

const NUMERIC = new Set(['gbp', 'gbpShort', 'multiple', 'number'])

function isBlank(v) {
  return v === null || v === undefined || v === ''
}

/**
 * Sorts a copy of `rows`. Comparison follows the sorted column's `type`.
 * Blank values always sort last, in both directions — otherwise reversing a
 * sparse column fills the first page with empty rows.
 */
export function sortRows(rows, sort, columns) {
  if (!sort?.key) return rows

  const column = columns.find(c => c.key === sort.key)
  const type = column?.type || 'text'
  const factor = sort.dir === 'asc' ? 1 : -1

  return [...rows].sort((rowA, rowB) => {
    const a = getValue(rowA, sort.key)
    const b = getValue(rowB, sort.key)

    const aBlank = isBlank(a)
    const bBlank = isBlank(b)
    if (aBlank && bBlank) return 0
    if (aBlank) return 1
    if (bBlank) return -1

    if (NUMERIC.has(type)) return (Number(a) - Number(b)) * factor
    if (type === 'date') return (new Date(a).getTime() - new Date(b).getTime()) * factor

    return String(a).localeCompare(String(b), 'en-GB', { sensitivity: 'base' }) * factor
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/sorting.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/sorting.js src/tests/components/table/sorting.test.js
git commit -m "Add type-aware table sorting with blanks last"
```

---

### Task 4: Column visibility persistence

**Files:**
- Create: `src/components/table/columnStorage.js`
- Test: `src/tests/components/table/columnStorage.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `storageKeyFor(name)` → `` `flowbird.table.${name}.columns` ``
  - `readHidden(name, validKeys)` → `string[]` of hidden column keys, filtered to `validKeys`. Never throws.
  - `writeHidden(name, hiddenKeys)` → void. Never throws.

- [ ] **Step 1: Write the failing tests**

```js
// src/tests/components/table/columnStorage.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { storageKeyFor, readHidden, writeHidden } from '@/components/table/columnStorage'

const VALID = ['title', 'value', 'address']

describe('column storage', () => {
  beforeEach(() => localStorage.clear())

  it('namespaces the key by table name', () => {
    expect(storageKeyFor('deals')).toBe('flowbird.table.deals.columns')
  })

  it('round-trips hidden keys', () => {
    writeHidden('deals', ['address'])
    expect(readHidden('deals', VALID)).toEqual(['address'])
  })

  it('returns an empty array when nothing is stored', () => {
    expect(readHidden('deals', VALID)).toEqual([])
  })

  // A column removed from the config must not linger as a phantom hidden key.
  it('drops stored keys that are no longer in the config', () => {
    writeHidden('deals', ['address', 'removed_column'])
    expect(readHidden('deals', VALID)).toEqual(['address'])
  })

  it('ignores corrupt JSON instead of throwing', () => {
    localStorage.setItem(storageKeyFor('deals'), '{not json')
    expect(readHidden('deals', VALID)).toEqual([])
  })

  it('ignores a stored value that is not an array', () => {
    localStorage.setItem(storageKeyFor('deals'), '{"a":1}')
    expect(readHidden('deals', VALID)).toEqual([])
  })

  it('keeps tables independent', () => {
    writeHidden('deals', ['address'])
    expect(readHidden('contacts', VALID)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/columnStorage.test.js`
Expected: FAIL — cannot resolve `@/components/table/columnStorage`.

- [ ] **Step 3: Write the implementation**

```js
// src/components/table/columnStorage.js

/** One key per table, so hiding a column on Deals never affects Contacts. */
export function storageKeyFor(name) {
  return `flowbird.table.${name}.columns`
}

/**
 * Reads the hidden column keys for a table.
 * Defensive throughout: a corrupt entry, a non-array payload, or a key that no
 * longer exists in the config must degrade to "nothing hidden", never throw.
 */
export function readHidden(name, validKeys) {
  try {
    const raw = localStorage.getItem(storageKeyFor(name))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(key => validKeys.includes(key))
  } catch {
    return []
  }
}

/** Writes hidden column keys. Storage being unavailable is not worth breaking the page over. */
export function writeHidden(name, hiddenKeys) {
  try {
    localStorage.setItem(storageKeyFor(name), JSON.stringify(hiddenKeys))
  } catch {
    // Private browsing or a full quota — the table still works, the choice just won't persist.
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/columnStorage.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/columnStorage.js src/tests/components/table/columnStorage.test.js
git commit -m "Add per-table column visibility persistence"
```

---

### Task 5: useTableState

**Files:**
- Create: `src/components/table/useTableState.js`
- Test: `src/tests/components/table/useTableState.test.js`

**Interfaces:**
- Consumes: `sortRows` from `./sorting`, `getValue` from `./format`, `readHidden`/`writeHidden` from `./columnStorage`.
- Produces: `useTableState(options)` → state object. Options and return shape below; later tasks depend on these exact names.

```js
useTableState({
  rows,                 // array from the entity's query hook
  columns,              // column config array
  storageKey,           // e.g. 'deals'
  searchKeys,           // dotted paths searched by the search box
  defaultSort,          // { key, dir }
  defaultPerPage = 25,
  filter,               // optional row => boolean, applied before search
})
// →
{
  search, setSearch,          // string
  sort, toggleSort,           // { key, dir }; toggleSort(key)
  page, setPage, totalPages,
  perPage, setPerPage,
  hidden, toggleColumn,       // string[] of hidden keys; toggleColumn(key)
  visibleColumns,             // column config array, filtered
  filteredRows,               // after filter + search + sort — the export/stats set
  pageRows,                   // the current page slice
  range,                      // { start, end, total } — 1-indexed, start 0 when empty
}
```

- [ ] **Step 1: Write the failing tests**

```js
// src/tests/components/table/useTableState.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTableState } from '@/components/table/useTableState'

const COLUMNS = [
  { key: 'title', label: 'Title', type: 'text', sticky: true },
  { key: 'value', label: 'Value', type: 'gbp' },
  { key: 'address', label: 'Address', type: 'text', defaultHidden: true },
]

const ROWS = [
  { id: 1, title: 'Ashcombe Wealth', value: '1850000', stage: 'Offer Made', address: 'Cheltenham' },
  { id: 2, title: 'Barwell Financial', value: '4200000', stage: 'Completed', address: 'Birmingham' },
  { id: 3, title: 'Callaghan Advisers', value: '2650000', stage: 'Offer Made', address: 'Manchester' },
]

const setup = (overrides = {}) => renderHook(() => useTableState({
  rows: ROWS,
  columns: COLUMNS,
  storageKey: 'test',
  searchKeys: ['title'],
  defaultSort: { key: 'value', dir: 'desc' },
  defaultPerPage: 2,
  ...overrides,
}))

describe('useTableState', () => {
  beforeEach(() => localStorage.clear())

  it('sorts by the default sort on first render', () => {
    const { result } = setup()
    expect(result.current.filteredRows.map(r => r.id)).toEqual([2, 3, 1])
  })

  it('paginates to perPage', () => {
    const { result } = setup()
    expect(result.current.pageRows).toHaveLength(2)
    expect(result.current.totalPages).toBe(2)
    expect(result.current.range).toEqual({ start: 1, end: 2, total: 3 })
  })

  it('narrows on search, case-insensitively', () => {
    const { result } = setup()
    act(() => result.current.setSearch('barwell'))
    expect(result.current.filteredRows.map(r => r.id)).toEqual([2])
  })

  it('applies the filter before the search', () => {
    const { result } = setup({ filter: r => r.stage === 'Offer Made' })
    expect(result.current.filteredRows.map(r => r.id)).toEqual([3, 1])
  })

  it('toggleSort flips direction on the same key', () => {
    const { result } = setup()
    act(() => result.current.toggleSort('value'))
    expect(result.current.sort).toEqual({ key: 'value', dir: 'asc' })
    expect(result.current.filteredRows.map(r => r.id)).toEqual([1, 3, 2])
  })

  it('toggleSort on a new numeric column starts descending', () => {
    const { result } = setup({ defaultSort: { key: 'title', dir: 'asc' } })
    act(() => result.current.toggleSort('value'))
    expect(result.current.sort).toEqual({ key: 'value', dir: 'desc' })
  })

  it('toggleSort on a new text column starts ascending', () => {
    const { result } = setup()
    act(() => result.current.toggleSort('title'))
    expect(result.current.sort).toEqual({ key: 'title', dir: 'asc' })
  })

  it('resets to page 1 when the search changes', () => {
    const { result } = setup()
    act(() => result.current.setPage(2))
    expect(result.current.page).toBe(2)
    act(() => result.current.setSearch('a'))
    expect(result.current.page).toBe(1)
  })

  it('resets to page 1 when perPage changes', () => {
    const { result } = setup()
    act(() => result.current.setPage(2))
    act(() => result.current.setPerPage(50))
    expect(result.current.page).toBe(1)
  })

  it('clamps the page when the row set shrinks', () => {
    const { result } = setup()
    act(() => result.current.setPage(2))
    act(() => result.current.setSearch('barwell'))
    expect(result.current.pageRows.map(r => r.id)).toEqual([2])
  })

  it('honours defaultHidden on first render', () => {
    const { result } = setup()
    expect(result.current.hidden).toEqual(['address'])
    expect(result.current.visibleColumns.map(c => c.key)).toEqual(['title', 'value'])
  })

  it('toggleColumn shows and hides, and persists', () => {
    const { result } = setup()
    act(() => result.current.toggleColumn('address'))
    expect(result.current.visibleColumns.map(c => c.key)).toEqual(['title', 'value', 'address'])
    expect(JSON.parse(localStorage.getItem('flowbird.table.test.columns'))).toEqual([])
  })

  it('restores persisted choices over defaultHidden', () => {
    localStorage.setItem('flowbird.table.test.columns', JSON.stringify(['value']))
    const { result } = setup()
    expect(result.current.visibleColumns.map(c => c.key)).toEqual(['title', 'address'])
  })

  it('reports an empty range when nothing matches', () => {
    const { result } = setup()
    act(() => result.current.setSearch('nothing matches this'))
    expect(result.current.range).toEqual({ start: 0, end: 0, total: 0 })
    expect(result.current.pageRows).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/useTableState.test.js`
Expected: FAIL — cannot resolve `@/components/table/useTableState`.

- [ ] **Step 3: Write the implementation**

```js
// src/components/table/useTableState.js
import { useState, useMemo, useEffect } from 'react'
import { getValue } from './format'
import { sortRows } from './sorting'
import { readHidden, writeHidden, storageKeyFor } from './columnStorage'

const NUMERIC = new Set(['gbp', 'gbpShort', 'multiple', 'number', 'date'])

/**
 * Owns everything a list table needs: search, sort, pagination and column
 * visibility. Pages supply rows and a column config; nothing here knows what
 * a deal or a contact is.
 */
export function useTableState({
  rows,
  columns,
  storageKey,
  searchKeys = [],
  defaultSort = { key: null, dir: 'asc' },
  defaultPerPage = 25,
  filter,
}) {
  const [search, setSearchRaw] = useState('')
  const [sort, setSort] = useState(defaultSort)
  const [page, setPage] = useState(1)
  const [perPage, setPerPageRaw] = useState(defaultPerPage)

  // A stored choice wins over defaultHidden — the user has overridden us.
  const [hidden, setHidden] = useState(() => {
    const validKeys = columns.map(c => c.key)
    const stored = localStorage.getItem(storageKeyFor(storageKey))
    if (stored === null) return columns.filter(c => c.defaultHidden).map(c => c.key)
    return readHidden(storageKey, validKeys)
  })

  // Changing what is being shown must not leave the user stranded on page 7.
  function setSearch(value) {
    setSearchRaw(value)
    setPage(1)
  }

  function setPerPage(value) {
    setPerPageRaw(value)
    setPage(1)
  }

  function toggleSort(key) {
    setSort(current => {
      if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
      // Money and dates are most useful largest-first; names are most useful A–Z.
      const type = columns.find(c => c.key === key)?.type || 'text'
      return { key, dir: NUMERIC.has(type) ? 'desc' : 'asc' }
    })
    setPage(1)
  }

  function toggleColumn(key) {
    setHidden(current => {
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
      writeHidden(storageKey, next)
      return next
    })
  }

  const visibleColumns = useMemo(
    () => columns.filter(c => !hidden.includes(c.key)),
    [columns, hidden],
  )

  const filteredRows = useMemo(() => {
    let result = filter ? rows.filter(filter) : rows

    const term = search.trim().toLowerCase()
    if (term) {
      result = result.filter(row =>
        searchKeys.some(key => String(getValue(row, key) ?? '').toLowerCase().includes(term)),
      )
    }

    return sortRows(result, sort, columns)
  }, [rows, filter, search, searchKeys, sort, columns])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage))

  // Clamp rather than reset: a shrinking result set should land on the last
  // page that still has rows, not throw the user back to the top.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * perPage
  const pageRows = filteredRows.slice(start, start + perPage)

  const range = filteredRows.length === 0
    ? { start: 0, end: 0, total: 0 }
    : { start: start + 1, end: Math.min(start + perPage, filteredRows.length), total: filteredRows.length }

  return {
    search, setSearch,
    sort, toggleSort,
    page: safePage, setPage, totalPages,
    perPage, setPerPage,
    hidden, toggleColumn,
    visibleColumns,
    filteredRows,
    pageRows,
    range,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/useTableState.test.js`
Expected: PASS, 14 tests.

If "restores persisted choices over defaultHidden" fails, the likely cause is
reading storage before checking for the absent-key case — an empty stored
array `[]` means "the user unhid everything" and must not fall back to
`defaultHidden`. That is why the initialiser checks `stored === null` directly
rather than relying on `readHidden` alone.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/useTableState.js src/tests/components/table/useTableState.test.js
git commit -m "Add useTableState hook for search, sort, paging and column visibility"
```

---

### Task 6: Synced top scrollbar

**Files:**
- Create: `src/components/table/useSyncedScroll.js`
- Test: `src/tests/components/table/useSyncedScroll.test.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `useSyncedScroll()` → `{ topRef, innerRef, bodyRef, onTopScroll, onBodyScroll }`. `topRef` is the thin strip above the table, `innerRef` the spacer inside it whose width mirrors the body's `scrollWidth`, `bodyRef` the table's scroll container.

This preserves the behaviour built in `DealsPage.jsx:47-64` — the horizontal
scrollbar sits above the table, not below it, so it is reachable without
scrolling to the bottom of a long list.

- [ ] **Step 1: Write the failing test**

```jsx
// src/tests/components/table/useSyncedScroll.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useSyncedScroll } from '@/components/table/useSyncedScroll'

function Harness() {
  const { topRef, innerRef, bodyRef, onTopScroll, onBodyScroll } = useSyncedScroll()
  return (
    <div>
      <div data-testid="strip" ref={topRef} onScroll={onTopScroll}>
        <div data-testid="inner" ref={innerRef} />
      </div>
      <div data-testid="body" ref={bodyRef} onScroll={onBodyScroll}>
        <table><tbody><tr><td>wide</td></tr></tbody></table>
      </div>
    </div>
  )
}

describe('useSyncedScroll', () => {
  it('mirrors the body scrollWidth onto the strip spacer', () => {
    render(<Harness />)
    const body = screen.getByTestId('body')
    Object.defineProperty(body, 'scrollWidth', { value: 1800, configurable: true })
    fireEvent.scroll(body)
    expect(screen.getByTestId('inner').style.width).toBe('1800px')
  })

  it('scrolling the strip scrolls the body', () => {
    render(<Harness />)
    const strip = screen.getByTestId('strip')
    const body = screen.getByTestId('body')
    strip.scrollLeft = 240
    fireEvent.scroll(strip)
    expect(body.scrollLeft).toBe(240)
  })

  it('scrolling the body scrolls the strip', () => {
    render(<Harness />)
    const strip = screen.getByTestId('strip')
    const body = screen.getByTestId('body')
    body.scrollLeft = 120
    fireEvent.scroll(body)
    expect(strip.scrollLeft).toBe(120)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/useSyncedScroll.test.jsx`
Expected: FAIL — cannot resolve `@/components/table/useSyncedScroll`.

- [ ] **Step 3: Write the implementation**

```js
// src/components/table/useSyncedScroll.js
import { useRef, useEffect, useCallback } from 'react'

/**
 * Drives a horizontal scrollbar rendered ABOVE a wide table.
 *
 * The strip is an empty scroll container holding a 1px-tall spacer whose width
 * mirrors the table's scrollWidth; scroll positions are synced both ways. The
 * table's own bottom scrollbar is hidden via the .hide-h-scrollbar class.
 */
export function useSyncedScroll() {
  const topRef = useRef(null)
  const innerRef = useRef(null)
  const bodyRef = useRef(null)
  // Guards the two scroll handlers against re-entering each other.
  const syncing = useRef(false)

  const measure = useCallback(() => {
    if (bodyRef.current && innerRef.current) {
      innerRef.current.style.width = bodyRef.current.scrollWidth + 'px'
    }
  }, [])

  useEffect(() => {
    measure()
    if (!bodyRef.current) return
    const observer = new ResizeObserver(measure)
    observer.observe(bodyRef.current)
    if (bodyRef.current.firstElementChild) observer.observe(bodyRef.current.firstElementChild)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const onTopScroll = useCallback(() => {
    if (syncing.current || !topRef.current || !bodyRef.current) return
    syncing.current = true
    bodyRef.current.scrollLeft = topRef.current.scrollLeft
    syncing.current = false
  }, [])

  const onBodyScroll = useCallback(() => {
    measure()
    if (syncing.current || !topRef.current || !bodyRef.current) return
    syncing.current = true
    topRef.current.scrollLeft = bodyRef.current.scrollLeft
    syncing.current = false
  }, [measure])

  return { topRef, innerRef, bodyRef, onTopScroll, onBodyScroll }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/useSyncedScroll.test.jsx`
Expected: PASS, 3 tests.

jsdom provides `ResizeObserver` from v27 onward; this repo is on jsdom 29, so
no polyfill is needed. If the observer is ever missing, the test fails with
"ResizeObserver is not defined" — add a stub to `src/tests/setup.js` rather
than removing the observer.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/useSyncedScroll.js src/tests/components/table/useSyncedScroll.test.jsx
git commit -m "Extract synced top scrollbar into a reusable hook"
```

---

### Task 7: Chip and StatStrip

**Files:**
- Create: `src/components/table/Chip.jsx`, `src/components/table/StatStrip.jsx`
- Test: `src/tests/components/table/Chip.test.jsx`, `src/tests/components/table/StatStrip.test.jsx`

**Interfaces:**
- Consumes: chip tokens from Task 1.
- Produces:
  - `<Chip label tone />` — `tone` is `'neutral' | 'blue' | 'teal' | 'green' | 'amber' | 'red'`, defaulting to `'neutral'`.
  - `<StatStrip stats />` — `stats` is `[{ label, value, meta }]`. A `value` of `null` renders `'—'` muted.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/tests/components/table/Chip.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Chip from '@/components/table/Chip'

describe('Chip', () => {
  it('renders its label', () => {
    render(<Chip label="Offer Made" tone="blue" />)
    expect(screen.getByText('Offer Made')).toBeInTheDocument()
  })

  it('uses the tone tokens', () => {
    render(<Chip label="Declined" tone="red" />)
    const chip = screen.getByText('Declined').closest('span')
    expect(chip).toHaveStyle({ background: 'var(--chip-red-bg)' })
  })

  it('falls back to the neutral tone', () => {
    render(<Chip label="Unknown" />)
    const chip = screen.getByText('Unknown').closest('span')
    expect(chip).toHaveStyle({ background: 'var(--chip-neutral-bg)' })
  })
})
```

```jsx
// src/tests/components/table/StatStrip.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatStrip from '@/components/table/StatStrip'

const STATS = [
  { label: 'Deals in view', value: '237', meta: '184 still in progress' },
  { label: 'Combined value', value: '£500.9m', meta: 'Sum of deal value' },
]

describe('StatStrip', () => {
  it('renders a card per stat', () => {
    render(<StatStrip stats={STATS} />)
    expect(screen.getByText('Deals in view')).toBeInTheDocument()
    expect(screen.getByText('£500.9m')).toBeInTheDocument()
    expect(screen.getByText('184 still in progress')).toBeInTheDocument()
  })

  it('renders a dash for a null value', () => {
    render(<StatStrip stats={[{ label: 'Avg multiple', value: null, meta: 'None priced yet' }]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders nothing when there are no stats', () => {
    const { container } = render(<StatStrip stats={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/Chip.test.jsx src/tests/components/table/StatStrip.test.jsx`
Expected: FAIL — cannot resolve either module.

- [ ] **Step 3: Write the implementations**

```jsx
// src/components/table/Chip.jsx

/** A coloured pill. The label is always present — colour is never the only signal. */
export default function Chip({ label, tone = 'neutral' }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px 3px 8px', borderRadius: 999,
        fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
        background: `var(--chip-${tone}-bg)`,
        color: `var(--chip-${tone}-fg)`,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flex: 'none' }} />
      {label}
    </span>
  )
}
```

```jsx
// src/components/table/StatStrip.jsx
import { EMPTY } from './format'

/** Summary figures above a table. Each stat is { label, value, meta }. */
export default function StatStrip({ stats }) {
  if (!stats?.length) return null

  return (
    <div style={{
      display: 'grid', gap: 12, marginBottom: 16,
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    }}>
      {stats.map(stat => (
        <div
          key={stat.label}
          style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px 13px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', gap: 5,
          }}
        >
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 500,
            letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          }}>
            {stat.label}
          </span>
          <span style={{
            fontFamily: 'var(--font-data)', fontWeight: 600, fontSize: 22,
            letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
            color: stat.value == null ? 'var(--ink-soft)' : 'var(--text)',
          }}>
            {stat.value ?? EMPTY}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{stat.meta}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/Chip.test.jsx src/tests/components/table/StatStrip.test.jsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/Chip.jsx src/components/table/StatStrip.jsx src/tests/components/table/Chip.test.jsx src/tests/components/table/StatStrip.test.jsx
git commit -m "Add Chip and StatStrip table components"
```

---

### Task 8: TabRail

**Files:**
- Create: `src/components/table/TabRail.jsx`
- Test: `src/tests/components/table/TabRail.test.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<TabRail tabs active onChange counts />` where `tabs` is `string[]`, `active` a string, `onChange(tab)` a callback, and `counts` an object keyed by tab label. A tab with no entry in `counts` shows no number.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/tests/components/table/TabRail.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TabRail from '@/components/table/TabRail'

const TABS = ['All deals', 'Completed', 'Declined']
const COUNTS = { 'All deals': 237, Completed: 32, Declined: 15 }

describe('TabRail', () => {
  it('renders a tab per label with its count', () => {
    render(<TabRail tabs={TABS} active="All deals" counts={COUNTS} onChange={() => {}} />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(screen.getByRole('tab', { name: /Completed/ })).toHaveTextContent('32')
  })

  it('marks the active tab', () => {
    render(<TabRail tabs={TABS} active="Completed" counts={COUNTS} onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /Completed/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Declined/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked tab', async () => {
    const onChange = vi.fn()
    render(<TabRail tabs={TABS} active="All deals" counts={COUNTS} onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /Declined/ }))
    expect(onChange).toHaveBeenCalledWith('Declined')
  })

  it('omits the count when none is supplied', () => {
    render(<TabRail tabs={['Only']} active="Only" counts={{}} onChange={() => {}} />)
    expect(screen.getByRole('tab')).toHaveTextContent(/^Only$/)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/TabRail.test.jsx`
Expected: FAIL — cannot resolve `@/components/table/TabRail`. It will also
fail on the missing `@testing-library/user-event` package.

- [ ] **Step 3: Install user-event, then write the implementation**

```bash
npm install -D @testing-library/user-event@^14
```

`user-event` drives real pointer and keyboard sequences rather than firing
synthetic events, which matters for the popover and row-click tests later.

```jsx
// src/components/table/TabRail.jsx

/** Horizontal chip tabs with per-tab counts. Scrolls horizontally when it overflows. */
export default function TabRail({ tabs, active, counts = {}, onChange }) {
  return (
    <div style={{ borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
      <div role="tablist" style={{ display: 'flex', gap: 6, padding: '12px 16px', minWidth: 'max-content' }}>
        {tabs.map(tab => {
          const selected = tab === active
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab)}
              style={{
                font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1px solid transparent', borderRadius: 999,
                padding: '6px 13px', whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: selected ? 'var(--accent-wash)' : 'transparent',
                color: selected ? 'var(--accent)' : 'var(--ink-soft)',
              }}
            >
              {tab}
              {counts[tab] !== undefined && (
                <span style={{
                  fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: selected ? 'var(--accent)' : 'var(--ink-faint)',
                  opacity: selected ? 0.75 : 1,
                }}>
                  {counts[tab]}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/TabRail.test.jsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add package.json package-lock.json src/components/table/TabRail.jsx src/tests/components/table/TabRail.test.jsx
git commit -m "Add TabRail component with per-tab counts"
```

---

### Task 9: Pagination

**Files:**
- Create: `src/components/table/Pagination.jsx`
- Test: `src/tests/components/table/Pagination.test.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<Pagination range page totalPages perPage perPageOptions onPageChange onPerPageChange />`. `range` is `{ start, end, total }` from `useTableState`. `perPageOptions` defaults to `[10, 25, 50, 100]`.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/tests/components/table/Pagination.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from '@/components/table/Pagination'

const props = {
  range: { start: 1, end: 25, total: 237 },
  page: 1, totalPages: 10, perPage: 25,
  onPageChange: () => {}, onPerPageChange: () => {},
}

describe('Pagination', () => {
  it('states the visible range', () => {
    render(<Pagination {...props} />)
    expect(screen.getByText('Showing 1–25 of 237')).toBeInTheDocument()
  })

  it('states when there is nothing to show', () => {
    render(<Pagination {...props} range={{ start: 0, end: 0, total: 0 }} totalPages={1} />)
    expect(screen.getByText('No rows to show')).toBeInTheDocument()
  })

  it('disables previous on the first page', () => {
    render(<Pagination {...props} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
  })

  it('disables next on the last page', () => {
    render(<Pagination {...props} page={10} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('advances the page', async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...props} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('changes rows per page', async () => {
    const onPerPageChange = vi.fn()
    render(<Pagination {...props} onPerPageChange={onPerPageChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '50')
    expect(onPerPageChange).toHaveBeenCalledWith(50)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/Pagination.test.jsx`
Expected: FAIL — cannot resolve `@/components/table/Pagination`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/table/Pagination.jsx

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

const stepButton = disabled => ({
  font: 'inherit', cursor: disabled ? 'default' : 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--line-strong)', background: 'var(--surface)',
  color: 'var(--ink-soft)', opacity: disabled ? 0.4 : 1,
})

export default function Pagination({
  range, page, totalPages, perPage,
  perPageOptions = [10, 25, 50, 100],
  onPageChange, onPerPageChange,
}) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
      padding: '9px 16px', borderBottom: '1px solid var(--line)',
      fontSize: 12.5, color: 'var(--ink-soft)',
    }}>
      <span>
        {range.total === 0
          ? 'No rows to show'
          : `Showing ${range.start}–${range.end} of ${range.total}`}
      </span>

      <div style={{ flex: '1 1 auto' }} />

      <select
        aria-label="Rows per page"
        value={perPage}
        onChange={e => onPerPageChange(Number(e.target.value))}
        style={{
          font: 'inherit', fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)',
          border: '1px solid var(--line-strong)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
        }}
      >
        {perPageOptions.map(n => <option key={n} value={n}>{n} per page</option>)}
      </select>

      <button
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={stepButton(page <= 1)}
      >
        <ChevronLeft />
      </button>

      <span style={{ fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums' }}>
        {page} / {totalPages}
      </span>

      <button
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        style={stepButton(page >= totalPages)}
      >
        <ChevronRight />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/Pagination.test.jsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/Pagination.jsx src/tests/components/table/Pagination.test.jsx
git commit -m "Add Pagination component"
```

---

### Task 10: ColumnPicker

**Files:**
- Create: `src/components/table/ColumnPicker.jsx`
- Test: `src/tests/components/table/ColumnPicker.test.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<ColumnPicker columns hidden onToggle />`. `columns` is the full config array, `hidden` a `string[]`, `onToggle(key)` a callback. Columns marked `sticky` or `alwaysVisible` render as disabled checkboxes.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/tests/components/table/ColumnPicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ColumnPicker from '@/components/table/ColumnPicker'

const COLUMNS = [
  { key: 'title', label: 'Title', sticky: true },
  { key: 'value', label: 'Value' },
  { key: 'address', label: 'Deal address' },
]

describe('ColumnPicker', () => {
  it('shows the visible-of-total count on the trigger', () => {
    render(<ColumnPicker columns={COLUMNS} hidden={['address']} onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: /Columns/ })).toHaveTextContent('2/3')
  })

  it('keeps the popover closed until opened', () => {
    render(<ColumnPicker columns={COLUMNS} hidden={[]} onToggle={() => {}} />)
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument()
  })

  it('lists a checkbox per column when opened', async () => {
    render(<ColumnPicker columns={COLUMNS} hidden={['address']} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Columns/ }))
    expect(screen.getByLabelText('Value')).toBeChecked()
    expect(screen.getByLabelText('Deal address')).not.toBeChecked()
  })

  it('disables the pinned column so it cannot be hidden', async () => {
    render(<ColumnPicker columns={COLUMNS} hidden={[]} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Columns/ }))
    expect(screen.getByLabelText(/Title/)).toBeDisabled()
  })

  it('calls onToggle with the column key', async () => {
    const onToggle = vi.fn()
    render(<ColumnPicker columns={COLUMNS} hidden={[]} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: /Columns/ }))
    await userEvent.click(screen.getByLabelText('Deal address'))
    expect(onToggle).toHaveBeenCalledWith('address')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<ColumnPicker columns={COLUMNS} hidden={[]} onToggle={() => {}} />)
    const trigger = screen.getByRole('button', { name: /Columns/ })
    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on an outside click', async () => {
    render(
      <div>
        <ColumnPicker columns={COLUMNS} hidden={[]} onToggle={() => {}} />
        <button>elsewhere</button>
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: /Columns/ }))
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/ColumnPicker.test.jsx`
Expected: FAIL — cannot resolve `@/components/table/ColumnPicker`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/table/ColumnPicker.jsx
import { useState, useRef, useEffect } from 'react'

function ColumnsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </svg>
  )
}

/** Popover listing every column with a checkbox. Pinned columns cannot be hidden. */
export default function ColumnPicker({ columns, hidden, onToggle }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(e) {
      if (!anchorRef.current?.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const visibleCount = columns.length - hidden.length

  return (
    <div ref={anchorRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 13px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)',
        }}
      >
        <ColumnsIcon />
        Columns
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--ink-faint)' }}>
          {visibleCount}/{columns.length}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 40, width: 250,
          background: 'var(--surface)', border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
          padding: 8, maxHeight: 320, overflowY: 'auto',
        }}>
          <div style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, letterSpacing: '.1em',
            textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '6px 8px 8px',
          }}>
            Visible columns
          </div>
          {columns.map(column => {
            const locked = column.sticky || column.alwaysVisible
            return (
              <label
                key={column.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px',
                  borderRadius: 6, fontSize: 13, cursor: locked ? 'default' : 'pointer',
                  color: 'var(--text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={!hidden.includes(column.key)}
                  disabled={locked}
                  onChange={() => onToggle(column.key)}
                  style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                />
                {column.label}
                {locked && <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>(pinned)</span>}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/ColumnPicker.test.jsx`
Expected: PASS, 7 tests.

The outside-click listener uses `mousedown`, not `click`: with `click`, the
same event that opened the popover can immediately close it again.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/ColumnPicker.jsx src/tests/components/table/ColumnPicker.test.jsx
git commit -m "Add ColumnPicker popover"
```

---

### Task 11: TableToolbar

**Files:**
- Create: `src/components/table/TableToolbar.jsx`
- Test: `src/tests/components/table/TableToolbar.test.jsx`

**Interfaces:**
- Consumes: `ColumnPicker`.
- Produces: `<TableToolbar search onSearchChange searchPlaceholder columns hidden onToggleColumn onExport />`. `onExport` is optional — when absent, no export button renders (Users has none).

Search is live as you type; the current pages require pressing a Search
button. Filtering a few hundred client-side rows on each keystroke is
cheap, and instant feedback is the point of the redesign.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/tests/components/table/TableToolbar.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TableToolbar from '@/components/table/TableToolbar'

const COLUMNS = [{ key: 'title', label: 'Title', sticky: true }, { key: 'value', label: 'Value' }]

const props = {
  search: '', onSearchChange: () => {}, searchPlaceholder: 'Search deals…',
  columns: COLUMNS, hidden: [], onToggleColumn: () => {},
}

describe('TableToolbar', () => {
  it('renders the search box with its placeholder', () => {
    render(<TableToolbar {...props} />)
    expect(screen.getByPlaceholderText('Search deals…')).toBeInTheDocument()
  })

  it('reports every keystroke', async () => {
    const onSearchChange = vi.fn()
    render(<TableToolbar {...props} onSearchChange={onSearchChange} />)
    await userEvent.type(screen.getByPlaceholderText('Search deals…'), 'ab')
    expect(onSearchChange).toHaveBeenCalledTimes(2)
    expect(onSearchChange).toHaveBeenLastCalledWith('b')
  })

  it('renders an export button when onExport is given', async () => {
    const onExport = vi.fn()
    render(<TableToolbar {...props} onExport={onExport} />)
    await userEvent.click(screen.getByRole('button', { name: /Export/ }))
    expect(onExport).toHaveBeenCalled()
  })

  it('omits the export button when onExport is absent', () => {
    render(<TableToolbar {...props} />)
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument()
  })

  it('renders the column picker', () => {
    render(<TableToolbar {...props} />)
    expect(screen.getByRole('button', { name: /Columns/ })).toBeInTheDocument()
  })
})
```

Note: `onSearchChange` receives the new value, not the event. The
`toHaveBeenLastCalledWith('b')` assertion is correct because the mock does not
update the controlled `search` prop, so each keystroke replaces the value.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/TableToolbar.test.jsx`
Expected: FAIL — cannot resolve `@/components/table/TableToolbar`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/table/TableToolbar.jsx
import ColumnPicker from './ColumnPicker'

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function TableToolbar({
  search, onSearchChange, searchPlaceholder,
  columns, hidden, onToggleColumn, onExport,
}) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface-alt)',
    }}>
      <div style={{ position: 'relative', flex: '0 1 300px', minWidth: 200 }}>
        <span style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ink-faint)', pointerEvents: 'none', display: 'flex',
        }}>
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            width: '100%', font: 'inherit', fontSize: 13, color: 'var(--text)',
            background: 'var(--surface)', border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px 8px 33px',
          }}
        />
      </div>

      <div style={{ flex: '1 1 auto' }} />

      {onExport && (
        <button
          onClick={onExport}
          style={{
            font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 13px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--nav)', background: 'var(--nav)', color: 'var(--surface)',
          }}
        >
          <DownloadIcon /> Export
        </button>
      )}

      <ColumnPicker columns={columns} hidden={hidden} onToggle={onToggleColumn} />
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/TableToolbar.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/TableToolbar.jsx src/tests/components/table/TableToolbar.test.jsx
git commit -m "Add TableToolbar with live search"
```

---

### Task 12: DataTable

**Files:**
- Create: `src/components/table/DataTable.jsx`
- Test: `src/tests/components/table/DataTable.test.jsx`

**Interfaces:**
- Consumes: `formatCell`, `getValue`, `EMPTY` from `./format`.
- Produces: `<DataTable columns rows getRowKey sort onSort onRowClick emptyMessage bodyRef onBodyScroll />`.
  - `columns` — the **visible** column config array.
  - `getRowKey(row)` → a stable key.
  - `onRowClick(row)` — optional; when absent, rows are not clickable.
  - `emptyMessage` — shown when `rows` is empty.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/tests/components/table/DataTable.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from '@/components/table/DataTable'

const COLUMNS = [
  { key: 'title', label: 'Title', type: 'text', sticky: true },
  { key: 'value', label: 'Value', type: 'gbp', align: 'right' },
  { key: 'stage', label: 'Stage', render: row => <em>{row.stage}</em> },
]

const ROWS = [
  { id: 1, title: 'Ashcombe Wealth', value: '1850000', stage: 'Offer Made' },
  { id: 2, title: 'Barwell Financial', value: '', stage: 'Completed' },
]

const props = {
  columns: COLUMNS, rows: ROWS, getRowKey: r => r.id,
  sort: { key: 'value', dir: 'desc' }, onSort: () => {},
  emptyMessage: 'No deals found.',
}

describe('DataTable', () => {
  it('renders a header per configured column', () => {
    render(<DataTable {...props} />)
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
  })

  it('formats cells by type', () => {
    render(<DataTable {...props} />)
    expect(screen.getByText('£1,850,000')).toBeInTheDocument()
  })

  it('renders an em dash for an empty value', () => {
    render(<DataTable {...props} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('uses a custom render when the column supplies one', () => {
    render(<DataTable {...props} />)
    expect(screen.getByText('Offer Made').tagName).toBe('EM')
  })

  it('marks the sorted column with aria-sort', () => {
    render(<DataTable {...props} />)
    expect(screen.getByRole('columnheader', { name: /Value/ })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: /Title/ })).not.toHaveAttribute('aria-sort')
  })

  it('calls onSort with the column key when a header is clicked', async () => {
    const onSort = vi.fn()
    render(<DataTable {...props} onSort={onSort} />)
    await userEvent.click(screen.getByRole('button', { name: /Title/ }))
    expect(onSort).toHaveBeenCalledWith('title')
  })

  it('does not make a sortable button for sortable: false', () => {
    const columns = [{ key: 'title', label: 'Title', sortable: false }]
    render(<DataTable {...props} columns={columns} />)
    expect(screen.queryByRole('button', { name: /Title/ })).not.toBeInTheDocument()
  })

  it('calls onRowClick with the row', async () => {
    const onRowClick = vi.fn()
    render(<DataTable {...props} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Ashcombe Wealth'))
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0])
  })

  // Destructive controls live in rows; a stray row click must never fire them.
  it('does not fire onRowClick when a control inside the row is clicked', async () => {
    const onRowClick = vi.fn()
    const onDelete = vi.fn()
    const columns = [
      { key: 'title', label: 'Title', sticky: true },
      { key: 'actions', label: '', sortable: false, render: () => <button onClick={onDelete}>Delete</button> },
    ]
    render(<DataTable {...props} columns={columns} onRowClick={onRowClick} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(onDelete).toHaveBeenCalled()
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('shows the empty message when there are no rows', () => {
    render(<DataTable {...props} rows={[]} />)
    expect(screen.getByText('No deals found.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/DataTable.test.jsx`
Expected: FAIL — cannot resolve `@/components/table/DataTable`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/table/DataTable.jsx
import { formatCell, getValue, EMPTY } from './format'

const NUMERIC_ALIGN = new Set(['gbp', 'gbpShort', 'multiple', 'number'])

function isNumeric(column) {
  return column.align === 'right' || NUMERIC_ALIGN.has(column.type)
}

function headerStyle(column) {
  return {
    position: 'sticky', top: 0, zIndex: column.sticky ? 30 : 20,
    background: 'var(--surface-alt)', color: 'var(--ink-faint)',
    fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
    letterSpacing: '.085em', textTransform: 'uppercase',
    textAlign: isNumeric(column) ? 'right' : 'left',
    padding: '11px 14px', whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--line-strong)',
    ...(column.sticky ? { left: 0, boxShadow: 'var(--shadow-rail)', minWidth: column.width || 268 } : {}),
    ...(column.width && !column.sticky ? { minWidth: column.width } : {}),
  }
}

function cellStyle(column) {
  return {
    padding: '0 14px', height: 46, borderBottom: '1px solid var(--line)',
    color: 'var(--text)', verticalAlign: 'middle',
    textAlign: isNumeric(column) ? 'right' : 'left',
    whiteSpace: column.wrap ? 'normal' : 'nowrap',
    ...(column.wrap ? { minWidth: 280, maxWidth: 340, lineHeight: 1.4, fontSize: 12.5, color: 'var(--ink-soft)' } : {}),
    ...(isNumeric(column)
      ? { fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }
      : {}),
    ...(column.sticky
      ? { position: 'sticky', left: 0, zIndex: 25, background: 'var(--surface)',
          boxShadow: 'var(--shadow-rail)', minWidth: column.width || 268, fontWeight: 600 }
      : {}),
  }
}

export default function DataTable({
  columns, rows, getRowKey,
  sort, onSort, onRowClick,
  emptyMessage, bodyRef, onBodyScroll,
}) {
  return (
    <div
      ref={bodyRef}
      onScroll={onBodyScroll}
      className="hide-h-scrollbar"
      style={{ overflow: 'auto', maxHeight: '62vh' }}
    >
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(column => {
              const sorted = sort?.key === column.key
              const sortable = column.sortable !== false
              return (
                <th
                  key={column.key}
                  style={headerStyle(column)}
                  {...(sorted ? { 'aria-sort': sort.dir === 'asc' ? 'ascending' : 'descending' } : {})}
                >
                  {sortable ? (
                    <button
                      onClick={() => onSort(column.key)}
                      style={{
                        font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit',
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: sorted ? 'var(--accent)' : 'inherit',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {column.label}
                      <span aria-hidden="true" style={{ fontSize: 9, opacity: sorted ? 1 : 0.25 }}>
                        {sorted && sort.dir === 'asc' ? '▲' : '▼'}
                      </span>
                    </button>
                  ) : column.label}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map(row => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? event => {
                // Buttons and links inside a row own their own click.
                if (event.target.closest('button, a, input, select')) return
                onRowClick(row)
              } : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map(column => {
                const formatted = column.render
                  ? column.render(row)
                  : formatCell(getValue(row, column.key), column.type)
                const empty = formatted === null || formatted === undefined
                return (
                  <td
                    key={column.key}
                    style={{ ...cellStyle(column), ...(empty ? { color: 'var(--ink-faint)' } : {}) }}
                  >
                    {empty ? EMPTY : formatted}
                  </td>
                )
              })}
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: 56, textAlign: 'center', color: 'var(--ink-soft)' }}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/DataTable.test.jsx`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/components/table/DataTable.jsx src/tests/components/table/DataTable.test.jsx
git commit -m "Add DataTable with sticky column, sorting and safe row clicks"
```

---

### Task 13: TableShell

**Files:**
- Create: `src/components/table/TableShell.jsx`
- Test: `src/tests/components/table/TableShell.test.jsx`

**Interfaces:**
- Consumes: `StatStrip`, `TableToolbar`, `Pagination`, `DataTable`, `useSyncedScroll`, and `ExportModal` from `@/components/ExportModal`.
- Produces: `<TableShell title subtitle stats tabs table columns getRowKey onRowClick emptyMessage searchPlaceholder exportFilename isLoading error />`.
  - `table` — the object returned by `useTableState`.
  - `columns` — the **full** config array (the shell reads `table.visibleColumns` for rendering and needs the full list for the picker).
  - `exportFilename` — optional; when absent no export button renders.

This is the only place that knows the page layout, so all four pages stay
consistent by construction.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/tests/components/table/TableShell.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import TableShell from '@/components/table/TableShell'
import { useTableState } from '@/components/table/useTableState'

const COLUMNS = [
  { key: 'title', label: 'Title', type: 'text', sticky: true },
  { key: 'value', label: 'Value', type: 'gbp' },
]
const ROWS = [{ id: 1, title: 'Ashcombe Wealth', value: '1850000' }]

function useHarnessState() {
  return useTableState({
    rows: ROWS, columns: COLUMNS, storageKey: 'shell',
    searchKeys: ['title'], defaultSort: { key: 'value', dir: 'desc' },
  })
}

const renderShell = (extra = {}) => {
  const { result } = renderHook(useHarnessState)
  return render(
    <TableShell
      title="Deals"
      subtitle="Mirrored from Pipedrive"
      table={result.current}
      columns={COLUMNS}
      getRowKey={r => r.id}
      emptyMessage="No deals found."
      searchPlaceholder="Search deals…"
      {...extra}
    />,
  )
}

describe('TableShell', () => {
  it('renders the title, toolbar, pagination and table together', () => {
    renderShell()
    expect(screen.getByRole('heading', { name: 'Deals' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search deals…')).toBeInTheDocument()
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
  })

  it('renders the stat strip when stats are given', () => {
    renderShell({ stats: [{ label: 'Deals in view', value: '1', meta: 'all active' }] })
    expect(screen.getByText('Deals in view')).toBeInTheDocument()
  })

  it('renders a tabs node when given', () => {
    renderShell({ tabs: <div data-testid="tabs" /> })
    expect(screen.getByTestId('tabs')).toBeInTheDocument()
  })

  it('shows a loading state instead of the table', () => {
    renderShell({ isLoading: true })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
  })

  it('shows an error state instead of the table', () => {
    renderShell({ error: new Error('relation "deals" does not exist') })
    expect(screen.getByText(/Database error/)).toBeInTheDocument()
    expect(screen.getByText(/relation "deals" does not exist/)).toBeInTheDocument()
  })

  it('omits the export button when no filename is given', () => {
    renderShell()
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument()
  })

  it('offers export when a filename is given', () => {
    renderShell({ exportFilename: 'deals' })
    expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/components/table/TableShell.test.jsx`
Expected: FAIL — cannot resolve `@/components/table/TableShell`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/table/TableShell.jsx
import { useState } from 'react'
import ExportModal from '../ExportModal'
import StatStrip from './StatStrip'
import TableToolbar from './TableToolbar'
import Pagination from './Pagination'
import DataTable from './DataTable'
import { useSyncedScroll } from './useSyncedScroll'

/** Card layout shared by every list page. Owns nothing entity-specific. */
export default function TableShell({
  title, subtitle, stats, tabs,
  table, columns, getRowKey, onRowClick,
  emptyMessage, searchPlaceholder, exportFilename,
  isLoading, error, headerAction,
}) {
  const [showExport, setShowExport] = useState(false)
  const { topRef, innerRef, bodyRef, onTopScroll, onBodyScroll } = useSyncedScroll()

  return (
    <div style={{ padding: 24 }}>
      {showExport && (
        <ExportModal
          data={table.filteredRows}
          filename={exportFilename}
          onClose={() => setShowExport(false)}
        />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.022em', color: 'var(--text)' }}>
            {title}
          </h1>
          {subtitle && <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ flex: '1 1 auto' }} />
        {headerAction}
      </div>

      <StatStrip stats={stats} />

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
      }}>
        {tabs}

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder={searchPlaceholder}
          columns={columns}
          hidden={table.hidden}
          onToggleColumn={table.toggleColumn}
          onExport={exportFilename ? () => setShowExport(true) : undefined}
        />

        <Pagination
          range={table.range}
          page={table.page}
          totalPages={table.totalPages}
          perPage={table.perPage}
          onPageChange={table.setPage}
          onPerPageChange={table.setPerPage}
        />

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
        ) : error ? (
          <div style={{
            padding: 32, margin: 16, borderRadius: 6, fontSize: 13,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          }}>
            <strong>Database error:</strong> {error.message}
            <div style={{ marginTop: 8, color: 'var(--ink-soft)' }}>
              Check that schema.sql, seed.sql, and policies.sql have all been run in Supabase.
            </div>
          </div>
        ) : (
          <>
            {/* Horizontal scrollbar above the table, synced with the body below. */}
            <div
              ref={topRef}
              onScroll={onTopScroll}
              style={{ overflowX: 'auto', overflowY: 'hidden', borderBottom: '1px solid var(--line)' }}
            >
              <div ref={innerRef} style={{ height: 1 }} />
            </div>

            <DataTable
              columns={table.visibleColumns}
              rows={table.pageRows}
              getRowKey={getRowKey}
              sort={table.sort}
              onSort={table.toggleSort}
              onRowClick={onRowClick}
              emptyMessage={emptyMessage}
              bodyRef={bodyRef}
              onBodyScroll={onBodyScroll}
            />
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run src/tests/components/table/TableShell.test.jsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the whole suite — the primitives are done**

Run: `npm run test -- --run`
Expected: PASS, 90 tests across 13 files.

- [ ] **Step 6: Commit**

```bash
npm run lint
git add src/components/table/TableShell.jsx src/tests/components/table/TableShell.test.jsx
git commit -m "Add TableShell tying the table system together"
```

---

### Task 14: Deals

**Files:**
- Create: `src/features/deals/columns.jsx`
- Test: `src/tests/features/deals/columns.test.jsx`, `src/tests/pages/DealsPage.test.jsx`
- Modify: `src/pages/DealsPage.jsx` (full rewrite, 268 → ~70 lines)

**Interfaces:**
- Consumes: everything from Tasks 2–13; `useDeals` from `@/hooks/useDeals`.
- Produces: `DEAL_COLUMNS`, `DEAL_TABS`, `stageTone(stage)`, `dealFilter(tab)`, `dealStats(rows)`.

Tab labels are matched against `deals.stage` values, so they are data, not
copy — `'HoTs Signed'` etc. keep their exact casing. `'All Deals'` and
`'Archived'` are the two synthetic tabs.

- [ ] **Step 1: Write the failing tests for the config**

```jsx
// src/tests/features/deals/columns.test.jsx
import { describe, it, expect } from 'vitest'
import { DEAL_COLUMNS, stageTone, dealFilter, dealStats } from '@/features/deals/columns'

describe('DEAL_COLUMNS', () => {
  it('pins exactly one column', () => {
    expect(DEAL_COLUMNS.filter(c => c.sticky).map(c => c.key)).toEqual(['title'])
  })

  it('carries all fifteen data columns', () => {
    expect(DEAL_COLUMNS).toHaveLength(15)
  })

  it('hides the address by default', () => {
    expect(DEAL_COLUMNS.find(c => c.key === 'deal_address').defaultHidden).toBe(true)
  })
})

describe('stageTone', () => {
  it('ramps along the pipeline', () => {
    expect(stageTone('Introduction')).toBe('neutral')
    expect(stageTone('Offer Made')).toBe('blue')
    expect(stageTone('HoTs Signed')).toBe('amber')
    expect(stageTone('Exchanged')).toBe('teal')
    expect(stageTone('Completed')).toBe('green')
  })

  // --red means Declined and nothing else.
  it('reserves red for Declined', () => {
    expect(stageTone('Declined')).toBe('red')
  })

  it('falls back to neutral for an unknown stage', () => {
    expect(stageTone('Something New From Pipedrive')).toBe('neutral')
  })
})

describe('dealFilter', () => {
  const active = { stage: 'Offer Made', archive_time: null }
  const archived = { stage: 'Completed', archive_time: '2026-05-01T00:00:00Z' }

  it('All Deals shows active deals of every stage', () => {
    expect(dealFilter('All Deals')(active)).toBe(true)
  })

  // Archived deals belong under Archived only — this matches today's behaviour.
  it('All Deals excludes archived deals', () => {
    expect(dealFilter('All Deals')(archived)).toBe(false)
  })

  it('a stage tab matches that stage only, and only when active', () => {
    expect(dealFilter('Offer Made')(active)).toBe(true)
    expect(dealFilter('Completed')(active)).toBe(false)
    expect(dealFilter('Completed')(archived)).toBe(false)
  })

  it('Archived shows archived deals whatever their stage', () => {
    expect(dealFilter('Archived')(archived)).toBe(true)
    expect(dealFilter('Archived')(active)).toBe(false)
  })
})

describe('dealStats', () => {
  const rows = [
    { stage: 'Offer Made', value: '1850000', assets_under_advice: '214000000', ebitda_multiple: '7.1' },
    { stage: 'Completed', value: '4200000', assets_under_advice: '486000000', ebitda_multiple: '7.4' },
    { stage: 'Introduction', value: '', assets_under_advice: '89000000', ebitda_multiple: '' },
  ]

  it('counts the rows in view', () => {
    expect(dealStats(rows)[0]).toMatchObject({ label: 'Deals in view', value: '3' })
  })

  it('sums value and assets under advice', () => {
    expect(dealStats(rows)[1].value).toBe('£6.1m')
    expect(dealStats(rows)[2].value).toBe('£789m')
  })

  // An unpriced deal must not drag the average toward zero.
  it('averages only priced deals', () => {
    expect(dealStats(rows)[3]).toMatchObject({ value: '7.3×', meta: '2 deals priced' })
  })

  it('reports no average when nothing is priced', () => {
    expect(dealStats([{ stage: 'Introduction', value: '', ebitda_multiple: '' }])[3])
      .toMatchObject({ value: null, meta: 'None priced yet' })
  })

  it('handles an empty set without dividing by zero', () => {
    expect(dealStats([]).map(s => s.value)).toEqual(['0', null, null, null])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run src/tests/features/deals/columns.test.jsx`
Expected: FAIL — cannot resolve `@/features/deals/columns`.

- [ ] **Step 3: Write the config**

```jsx
// src/features/deals/columns.jsx
import Chip from '@/components/table/Chip'
import { formatCell } from '@/components/table/format'

/** Colour ramp following pipeline progress. Red is reserved for Declined. */
const STAGE_TONES = {
  'Introduction': 'neutral',
  'First Meeting Booked': 'neutral',
  'First Meeting Held': 'blue',
  'Offer Made': 'blue',
  'HoTs Issued': 'amber',
  'HoTs Signed': 'amber',
  'Exchanged': 'teal',
  'Completed': 'green',
  'Declined': 'red',
}

export function stageTone(stage) {
  return STAGE_TONES[stage] || 'neutral'
}

/** Tab labels are matched against deals.stage, so their casing is data, not copy. */
export const DEAL_TABS = [
  'All Deals', 'Completed', 'Exchanged', 'HoTs Signed', 'HoTs Issued', 'Offer Made',
  'First Meeting Held', 'First Meeting Booked', 'Introduction', 'Declined', 'Archived',
]

/**
 * Archived is driven by archive_time being set in Pipedrive. Archived deals
 * appear under the Archived tab and nowhere else.
 */
export function dealFilter(tab) {
  return deal => {
    const archived = !!deal.archive_time
    if (tab === 'Archived') return archived
    if (archived) return false
    return tab === 'All Deals' || deal.stage === tab
  }
}

export const DEAL_COLUMNS = [
  { key: 'title', label: 'Title', type: 'text', sticky: true, width: 268 },
  { key: 'value', label: 'Value', type: 'gbp' },
  { key: 'contact.name', label: 'Contact name', type: 'text' },
  { key: 'introductory_company', label: 'Introductory company', type: 'text' },
  {
    key: 'stage', label: 'Stage', type: 'text',
    render: deal => (
      <Chip
        label={deal.archive_time ? 'Archived' : deal.stage}
        tone={deal.archive_time ? 'neutral' : stageTone(deal.stage)}
      />
    ),
  },
  { key: 'owner', label: 'Owner', type: 'text' },
  { key: 'latest_status_acquisition_committee', label: 'Latest status (AC)', type: 'text', wrap: true },
  { key: 'deal_exchanged_date', label: 'Exchanged date', type: 'date' },
  { key: 'deal_complete_date', label: 'Complete date', type: 'date' },
  { key: 'assets_under_advice', label: 'Assets under advice', type: 'gbpShort' },
  { key: 'forecast_recurring_income', label: 'Forecast recurring income', type: 'gbp' },
  { key: 'completion_payment', label: 'Completion payment', type: 'gbp' },
  { key: 'headline_consideration', label: 'Headline consideration', type: 'gbp' },
  { key: 'ebitda_multiple', label: 'EBITDA multiple', type: 'multiple' },
  { key: 'deal_address', label: 'Deal address', type: 'text', wrap: true, defaultHidden: true },
]

const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)

export function dealStats(rows) {
  const inProgress = rows.filter(r => !['Completed', 'Declined'].includes(r.stage) && !r.archive_time)
  const multiples = rows.map(r => Number(r.ebitda_multiple)).filter(n => Number.isFinite(n) && n > 0)
  const average = multiples.length
    ? multiples.reduce((a, b) => a + b, 0) / multiples.length
    : null

  return [
    {
      label: 'Deals in view',
      value: String(rows.length),
      meta: `${inProgress.length} still in progress`,
    },
    {
      label: 'Combined value',
      value: formatCell(sum(rows, 'value'), 'gbpShort'),
      meta: 'Sum of deal value',
    },
    {
      label: 'Assets under advice',
      value: formatCell(sum(rows, 'assets_under_advice'), 'gbpShort'),
      meta: 'Across all deals in view',
    },
    {
      label: 'Avg EBITDA multiple',
      value: average === null ? null : formatCell(average, 'multiple'),
      meta: multiples.length ? `${multiples.length} deals priced` : 'None priced yet',
    },
  ]
}
```

- [ ] **Step 4: Run the config tests to verify they pass**

Run: `npm run test -- --run src/tests/features/deals/columns.test.jsx`
Expected: PASS, 16 tests.

- [ ] **Step 5: Write the failing page test**

```jsx
// src/tests/pages/DealsPage.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DealsPage from '@/pages/DealsPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => navigate,
}))

const DEALS = [
  { id: 'a', title: 'Ashcombe Wealth', stage: 'Offer Made', value: '1850000',
    archive_time: null, ebitda_multiple: '7.1', assets_under_advice: '214000000',
    contact: { name: 'Helen Ashcombe' } },
  { id: 'b', title: 'Barwell Financial', stage: 'Completed', value: '4200000',
    archive_time: null, ebitda_multiple: '7.4', assets_under_advice: '486000000',
    contact: { name: 'Douglas Vine' } },
  { id: 'c', title: 'Callaghan Advisers', stage: 'Completed', value: '2650000',
    archive_time: '2026-05-01T00:00:00Z', ebitda_multiple: '6.8',
    assets_under_advice: '298000000', contact: { name: 'Marie Callaghan' } },
]

const useDeals = vi.fn(() => ({ data: DEALS, isLoading: false, isError: false, error: null }))
vi.mock('@/hooks/useDeals', () => ({ useDeals: (...args) => useDeals(...args) }))

const renderPage = () => render(<MemoryRouter><DealsPage /></MemoryRouter>)

describe('DealsPage', () => {
  it('lists active deals', () => {
    renderPage()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
  })

  it('excludes archived deals from All Deals', () => {
    renderPage()
    expect(screen.queryByText('Callaghan Advisers')).not.toBeInTheDocument()
  })

  it('shows archived deals under the Archived tab', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('tab', { name: /Archived/ }))
    expect(screen.getByText('Callaghan Advisers')).toBeInTheDocument()
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
  })

  it('recalculates the stats against the active tab', async () => {
    renderPage()
    expect(screen.getByText('£6.1m')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /^Completed/ }))
    expect(screen.getByText('£4.2m')).toBeInTheDocument()
  })

  it('narrows on search', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Search deals/), 'barwell')
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
  })

  it('opens the deal on row click', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Ashcombe Wealth'))
    expect(navigate).toHaveBeenCalledWith('/deals/a')
  })

  it('surfaces a query error', () => {
    useDeals.mockReturnValueOnce({
      data: undefined, isLoading: false, isError: true, error: new Error('boom'),
    })
    renderPage()
    expect(screen.getByText(/Database error/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the page test to verify it fails**

Run: `npm run test -- --run src/tests/pages/DealsPage.test.jsx`
Expected: FAIL — the old page has no tabs with accessible roles and no live search.

- [ ] **Step 7: Rewrite the page**

Replace the entire contents of `src/pages/DealsPage.jsx`:

```jsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeals } from '../hooks/useDeals'
import TableShell from '../components/table/TableShell'
import TabRail from '../components/table/TabRail'
import { useTableState } from '../components/table/useTableState'
import { DEAL_COLUMNS, DEAL_TABS, dealFilter, dealStats } from '../features/deals/columns'

const SEARCH_KEYS = ['title', 'contact.name', 'owner', 'introductory_company', 'stage']

export default function DealsPage() {
  const { data: deals = [], isLoading, isError, error } = useDeals()
  const navigate = useNavigate()
  const [tab, setTab] = useState('All Deals')

  const filter = useMemo(() => dealFilter(tab), [tab])

  const table = useTableState({
    rows: deals,
    columns: DEAL_COLUMNS,
    storageKey: 'deals',
    searchKeys: SEARCH_KEYS,
    defaultSort: { key: 'value', dir: 'desc' },
    defaultPerPage: 25,
    filter,
  })

  const counts = useMemo(
    () => Object.fromEntries(DEAL_TABS.map(t => [t, deals.filter(dealFilter(t)).length])),
    [deals],
  )

  return (
    <TableShell
      title="Deals"
      subtitle="Mirrored from Pipedrive"
      stats={dealStats(table.filteredRows)}
      tabs={
        <TabRail
          tabs={DEAL_TABS}
          active={tab}
          counts={counts}
          onChange={next => { setTab(next); table.setPage(1) }}
        />
      }
      table={table}
      columns={DEAL_COLUMNS}
      getRowKey={deal => deal.id}
      onRowClick={deal => navigate(`/deals/${deal.id}`)}
      emptyMessage="No deals found."
      searchPlaceholder="Search deals, contacts, owners…"
      exportFilename="deals"
      isLoading={isLoading}
      error={isError ? error : null}
    />
  )
}
```

The `onChange` resets the page explicitly. `useTableState` treats search and
per-page as reset triggers but not `filter`, so without this an out-of-range
page would only be clamped after the fact — switching from a long tab to a
short one would land you on its last page rather than its first.

- [ ] **Step 8: Run the page test to verify it passes**

Run: `npm run test -- --run src/tests/pages/DealsPage.test.jsx`
Expected: PASS, 7 tests.

- [ ] **Step 9: Check it in the browser**

Run `npm run dev`, open http://localhost:5174/deals. Verify: stat strip
recalculates per tab; Title stays pinned when scrolling right; the top
scrollbar still mirrors the table; sorting by Value reorders; hiding a column
survives a refresh; Export still downloads the filtered set, not just the page.

- [ ] **Step 10: Commit**

```bash
npm run lint
git add src/features/deals src/pages/DealsPage.jsx src/tests/features/deals src/tests/pages/DealsPage.test.jsx
git commit -m "Rebuild the deals table on the shared table system"
```

---

### Task 15: Contacts

**Files:**
- Create: `src/features/contacts/columns.jsx`
- Test: `src/tests/features/contacts/columns.test.jsx`, `src/tests/pages/ContactsPage.test.jsx`
- Modify: `src/pages/ContactsPage.jsx` (full rewrite, 176 → ~50 lines)

**Interfaces:**
- Consumes: the table system; `useContacts` from `@/hooks/useContacts`.
- Produces: `CONTACT_COLUMNS`, `contactStats(rows)`.

- [ ] **Step 1: Write the failing config test**

```jsx
// src/tests/features/contacts/columns.test.jsx
import { describe, it, expect } from 'vitest'
import { CONTACT_COLUMNS, contactStats } from '@/features/contacts/columns'

describe('CONTACT_COLUMNS', () => {
  it('pins the name', () => {
    expect(CONTACT_COLUMNS.filter(c => c.sticky).map(c => c.key)).toEqual(['name'])
  })

  it('offers job title and date created hidden by default', () => {
    const hidden = CONTACT_COLUMNS.filter(c => c.defaultHidden).map(c => c.key)
    expect(hidden).toEqual(['job_title', 'date_created'])
  })
})

describe('contactStats', () => {
  const rows = [
    { name: 'Ada', email: 'ada@x.com', phone: '0123', organisation_id: 'org-1' },
    { name: 'Bob', email: '', phone: '0456', organisation_id: null },
    { name: 'Cai', email: 'cai@x.com', phone: '', organisation_id: 'org-2' },
  ]

  it('counts totals and coverage', () => {
    expect(contactStats(rows).map(s => s.value)).toEqual(['3', '2', '2', '2'])
  })

  it('describes coverage as a share of the total', () => {
    expect(contactStats(rows)[1].meta).toBe('67% of contacts')
  })

  it('handles an empty set without dividing by zero', () => {
    expect(contactStats([]).map(s => s.value)).toEqual(['0', '0', '0', '0'])
    expect(contactStats([])[1].meta).toBe('No contacts yet')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- --run src/tests/features/contacts/columns.test.jsx`
Expected: FAIL — cannot resolve `@/features/contacts/columns`.

- [ ] **Step 3: Write the config**

```jsx
// src/features/contacts/columns.jsx

export const CONTACT_COLUMNS = [
  { key: 'name', label: 'Contact name', type: 'text', sticky: true, width: 240 },
  {
    key: 'email', label: 'Email', type: 'text',
    render: contact => contact.email
      ? <a href={`mailto:${contact.email}`} style={{ color: 'var(--accent)' }}>{contact.email}</a>
      : null,
  },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'organisation.name', label: 'Organisation', type: 'text' },
  { key: 'job_title', label: 'Job title', type: 'text', defaultHidden: true },
  { key: 'date_created', label: 'Date created', type: 'date', defaultHidden: true },
]

const share = (count, total) => total === 0 ? 'No contacts yet' : `${Math.round((count / total) * 100)}% of contacts`

export function contactStats(rows) {
  const total = rows.length
  const linked = rows.filter(c => c.organisation_id).length
  const withEmail = rows.filter(c => c.email).length
  const withPhone = rows.filter(c => c.phone).length

  return [
    { label: 'Total contacts', value: String(total), meta: 'In the Pipedrive mirror' },
    { label: 'Linked to an org', value: String(linked), meta: share(linked, total) },
    { label: 'With an email', value: String(withEmail), meta: share(withEmail, total) },
    { label: 'With a phone', value: String(withPhone), meta: share(withPhone, total) },
  ]
}
```

Note the stat order matches the test: total, linked, email, phone.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- --run src/tests/features/contacts/columns.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing page test**

```jsx
// src/tests/pages/ContactsPage.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ContactsPage from '@/pages/ContactsPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => navigate,
}))

const CONTACTS = [
  { id: 'a', name: 'Helen Ashcombe', email: 'helen@ashcombe.co.uk', phone: '0123',
    organisation_id: 'org-1', organisation: { name: 'Ashcombe Wealth' } },
  { id: 'b', name: 'Douglas Vine', email: '', phone: '', organisation_id: null, organisation: null },
]

vi.mock('@/hooks/useContacts', () => ({
  useContacts: () => ({ data: CONTACTS, isLoading: false, isError: false, error: null }),
}))

const renderPage = () => render(<MemoryRouter><ContactsPage /></MemoryRouter>)

describe('ContactsPage', () => {
  it('lists contacts with their organisation', () => {
    renderPage()
    expect(screen.getByText('Helen Ashcombe')).toBeInTheDocument()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
  })

  it('renders the email as a mailto link', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'helen@ashcombe.co.uk' }))
      .toHaveAttribute('href', 'mailto:helen@ashcombe.co.uk')
  })

  it('shows a dash where a contact has no phone', () => {
    renderPage()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows the stat strip', () => {
    renderPage()
    expect(screen.getByText('Total contacts')).toBeInTheDocument()
  })

  it('narrows on search', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Search contacts/), 'douglas')
    expect(screen.queryByText('Helen Ashcombe')).not.toBeInTheDocument()
    expect(screen.getByText('Douglas Vine')).toBeInTheDocument()
  })

  it('opens the contact on row click', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Helen Ashcombe'))
    expect(navigate).toHaveBeenCalledWith('/contacts/a')
  })

  // The mailto link owns its own click.
  it('does not navigate when the email link is clicked', async () => {
    renderPage()
    navigate.mockClear()
    await userEvent.click(screen.getByRole('link', { name: 'helen@ashcombe.co.uk' }))
    expect(navigate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run the page test to verify it fails**

Run: `npm run test -- --run src/tests/pages/ContactsPage.test.jsx`
Expected: FAIL — the old page has no stat strip and no live search.

- [ ] **Step 7: Rewrite the page**

Replace the entire contents of `src/pages/ContactsPage.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import TableShell from '../components/table/TableShell'
import { useTableState } from '../components/table/useTableState'
import { CONTACT_COLUMNS, contactStats } from '../features/contacts/columns'

const SEARCH_KEYS = ['name', 'email', 'phone', 'organisation.name', 'job_title']

export default function ContactsPage() {
  const { data: contacts = [], isLoading, isError, error } = useContacts()
  const navigate = useNavigate()

  const table = useTableState({
    rows: contacts,
    columns: CONTACT_COLUMNS,
    storageKey: 'contacts',
    searchKeys: SEARCH_KEYS,
    defaultSort: { key: 'name', dir: 'asc' },
    defaultPerPage: 25,
  })

  return (
    <TableShell
      title="Contacts"
      subtitle="Mirrored from Pipedrive"
      stats={contactStats(table.filteredRows)}
      table={table}
      columns={CONTACT_COLUMNS}
      getRowKey={contact => contact.id}
      onRowClick={contact => navigate(`/contacts/${contact.id}`)}
      emptyMessage="No contacts found."
      searchPlaceholder="Search contacts, emails, organisations…"
      exportFilename="contacts"
      isLoading={isLoading}
      error={isError ? error : null}
    />
  )
}
```

- [ ] **Step 8: Run the page test to verify it passes**

Run: `npm run test -- --run src/tests/pages/ContactsPage.test.jsx`
Expected: PASS, 7 tests.

- [ ] **Step 9: Commit**

```bash
npm run lint
git add src/features/contacts src/pages/ContactsPage.jsx src/tests/features/contacts src/tests/pages/ContactsPage.test.jsx
git commit -m "Rebuild the contacts table on the shared table system"
```

---

### Task 16: Organisations

**Files:**
- Create: `src/features/organisations/columns.jsx`
- Test: `src/tests/features/organisations/columns.test.jsx`, `src/tests/pages/OrganisationsPage.test.jsx`
- Modify: `src/pages/OrganisationsPage.jsx` (full rewrite, 179 → ~50 lines)

**Interfaces:**
- Consumes: the table system; `useOrganisations` from `@/hooks/useOrganisations`.
- Produces: `ORGANISATION_COLUMNS`, `organisationStats(rows)`.

> **Before building, confirm the metrics.** The spec flags that
> `authorisation_status` and `fca_number` were chosen from the schema, not from
> production volumes. Query the hosted project for how many organisations have
> each field populated. If either is mostly empty, replace that stat with one
> that is not — a card reading "3" out of 800 is worse than no card.

- [ ] **Step 1: Write the failing config test**

```jsx
// src/tests/features/organisations/columns.test.jsx
import { describe, it, expect } from 'vitest'
import { ORGANISATION_COLUMNS, organisationStats } from '@/features/organisations/columns'

describe('ORGANISATION_COLUMNS', () => {
  it('pins the organisation name', () => {
    expect(ORGANISATION_COLUMNS.filter(c => c.sticky).map(c => c.key)).toEqual(['name'])
  })

  it('offers authorisation status and FCA number hidden by default', () => {
    const hidden = ORGANISATION_COLUMNS.filter(c => c.defaultHidden).map(c => c.key)
    expect(hidden).toEqual(['authorisation_status', 'fca_number'])
  })
})

describe('organisationStats', () => {
  const rows = [
    { name: 'A', authorisation_status: 'Authorised', fca_number: '123', contacts: [{ name: 'Ada' }] },
    { name: 'B', authorisation_status: '', fca_number: '', contacts: [] },
    { name: 'C', authorisation_status: 'Authorised', fca_number: '456', contacts: [{ name: 'Cai' }] },
  ]

  it('counts totals, authorised, FCA numbers and contact coverage', () => {
    expect(organisationStats(rows).map(s => s.value)).toEqual(['3', '2', '2', '2'])
  })

  it('treats a missing contacts array as no contacts', () => {
    expect(organisationStats([{ name: 'D' }])[3].value).toBe('0')
  })

  it('handles an empty set', () => {
    expect(organisationStats([]).map(s => s.value)).toEqual(['0', '0', '0', '0'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- --run src/tests/features/organisations/columns.test.jsx`
Expected: FAIL — cannot resolve `@/features/organisations/columns`.

- [ ] **Step 3: Write the config**

```jsx
// src/features/organisations/columns.jsx

export const ORGANISATION_COLUMNS = [
  { key: 'name', label: 'Organisation', type: 'text', sticky: true, width: 260 },
  { key: 'address', label: 'Address', type: 'text', wrap: true },
  { key: 'company_status', label: 'Company status', type: 'text' },
  {
    key: 'website', label: 'Website', type: 'text',
    render: org => org.website
      ? <a href={org.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{org.website}</a>
      : null,
  },
  {
    key: 'contacts', label: 'Contacts', type: 'text', sortable: false, wrap: true,
    render: org => (org.contacts || []).map(c => c.name).join(', ') || null,
  },
  { key: 'authorisation_status', label: 'Authorisation status', type: 'text', defaultHidden: true },
  { key: 'fca_number', label: 'FCA number', type: 'text', defaultHidden: true },
]

const share = (count, total) => total === 0 ? 'No organisations yet' : `${Math.round((count / total) * 100)}% of organisations`

export function organisationStats(rows) {
  const total = rows.length
  const authorised = rows.filter(o => o.authorisation_status).length
  const withFca = rows.filter(o => o.fca_number).length
  const withContacts = rows.filter(o => (o.contacts || []).length > 0).length

  return [
    { label: 'Total organisations', value: String(total), meta: 'In the Pipedrive mirror' },
    { label: 'Authorised', value: String(authorised), meta: share(authorised, total) },
    { label: 'With an FCA number', value: String(withFca), meta: share(withFca, total) },
    { label: 'With a contact', value: String(withContacts), meta: share(withContacts, total) },
  ]
}
```

`contacts` is `sortable: false` — it is an array, and sorting rows by a joined
string of names is not a thing anyone wants.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- --run src/tests/features/organisations/columns.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing page test**

```jsx
// src/tests/pages/OrganisationsPage.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OrganisationsPage from '@/pages/OrganisationsPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => navigate,
}))

const ORGS = [
  { id: 'a', name: 'Ashcombe Wealth', address: '12 Rodney Road, Cheltenham',
    company_status: 'Active', website: 'https://ashcombe.co.uk',
    authorisation_status: 'Authorised', fca_number: '123456',
    contacts: [{ name: 'Helen Ashcombe' }] },
  { id: 'b', name: 'Barwell Financial', address: '', company_status: '',
    website: '', authorisation_status: '', fca_number: '', contacts: [] },
]

vi.mock('@/hooks/useOrganisations', () => ({
  useOrganisations: () => ({ data: ORGS, isLoading: false, isError: false, error: null }),
}))

const renderPage = () => render(<MemoryRouter><OrganisationsPage /></MemoryRouter>)

describe('OrganisationsPage', () => {
  it('lists organisations', () => {
    renderPage()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
  })

  it('renders the website as an external link', () => {
    renderPage()
    const link = screen.getByRole('link', { name: 'https://ashcombe.co.uk' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('lists linked contact names', () => {
    renderPage()
    expect(screen.getByText('Helen Ashcombe')).toBeInTheDocument()
  })

  it('shows the stat strip', () => {
    renderPage()
    expect(screen.getByText('Total organisations')).toBeInTheDocument()
  })

  it('narrows on search', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Search organisations/), 'barwell')
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
  })

  it('opens the organisation on row click', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Ashcombe Wealth'))
    expect(navigate).toHaveBeenCalledWith('/organisations/a')
  })
})
```

- [ ] **Step 6: Run the page test to verify it fails**

Run: `npm run test -- --run src/tests/pages/OrganisationsPage.test.jsx`
Expected: FAIL — the old page has no stat strip and no live search.

- [ ] **Step 7: Rewrite the page**

Replace the entire contents of `src/pages/OrganisationsPage.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { useOrganisations } from '../hooks/useOrganisations'
import TableShell from '../components/table/TableShell'
import { useTableState } from '../components/table/useTableState'
import { ORGANISATION_COLUMNS, organisationStats } from '../features/organisations/columns'

const SEARCH_KEYS = ['name', 'address', 'company_status', 'fca_number']

export default function OrganisationsPage() {
  const { data: organisations = [], isLoading, isError, error } = useOrganisations()
  const navigate = useNavigate()

  const table = useTableState({
    rows: organisations,
    columns: ORGANISATION_COLUMNS,
    storageKey: 'organisations',
    searchKeys: SEARCH_KEYS,
    defaultSort: { key: 'name', dir: 'asc' },
    defaultPerPage: 100,
  })

  return (
    <TableShell
      title="Organisations"
      subtitle="Mirrored from Pipedrive"
      stats={organisationStats(table.filteredRows)}
      table={table}
      columns={ORGANISATION_COLUMNS}
      getRowKey={org => org.id}
      onRowClick={org => navigate(`/organisations/${org.id}`)}
      emptyMessage="No organisations found."
      searchPlaceholder="Search organisations, addresses…"
      exportFilename="organisations"
      isLoading={isLoading}
      error={isError ? error : null}
    />
  )
}
```

`defaultPerPage: 100` preserves the current default on this page.

- [ ] **Step 8: Run the page test to verify it passes**

Run: `npm run test -- --run src/tests/pages/OrganisationsPage.test.jsx`
Expected: PASS, 6 tests.

- [ ] **Step 9: Commit**

```bash
npm run lint
git add src/features/organisations src/pages/OrganisationsPage.jsx src/tests/features/organisations src/tests/pages/OrganisationsPage.test.jsx
git commit -m "Rebuild the organisations table on the shared table system"
```

---

### Task 17: Users

**Files:**
- Create: `src/features/users/columns.jsx`
- Test: `src/tests/features/users/columns.test.jsx`, `src/tests/pages/UsersPage.test.jsx`
- Modify: `src/pages/UsersPage.jsx:180-310` (replace the toolbar and table; keep the modals, the mutation and `canManage` exactly as they are)

**Interfaces:**
- Consumes: the table system; `useUsers`, `useAuth`, `AddUserModal`, `EditUserModal`, the existing `ConfirmDeleteModal` and `deleteMutation`.
- Produces: `userColumns({ canManage, onEdit, onDelete })` → column array, and `userStats(rows)`.

Columns are a **function** here, not a constant: the action column exists only
for Admin and Developer, and its buttons need the page's handlers.

> **Known dead control, preserved as-is.** The "Reset & Send Password" button
> in the current page has no `onClick` — it renders and does nothing. This task
> keeps it exactly that way. Wiring it up is a separate piece of work with its
> own edge-function change; do not silently implement it here.

- [ ] **Step 1: Write the failing config test**

```jsx
// src/tests/features/users/columns.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { userColumns, userStats } from '@/features/users/columns'

const USER = { id: 'u1', name: 'Ada', email: 'ada@x.com', user_status: 'active', user_permissions: ['Admin'] }

describe('userColumns', () => {
  it('omits the action column when the viewer cannot manage', () => {
    const columns = userColumns({ canManage: false, onEdit: () => {}, onDelete: () => {} })
    expect(columns.map(c => c.key)).toEqual(['name', 'email', 'user_status', 'user_permissions'])
  })

  it('adds a pinned, always-visible action column when the viewer can manage', () => {
    const columns = userColumns({ canManage: true, onEdit: () => {}, onDelete: () => {} })
    const actions = columns.find(c => c.key === 'actions')
    expect(actions.alwaysVisible).toBe(true)
    expect(actions.sortable).toBe(false)
  })

  it('wires the action buttons to their handlers', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const columns = userColumns({ canManage: true, onEdit, onDelete })
    render(<div>{columns.find(c => c.key === 'actions').render(USER)}</div>)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith(USER)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(USER)
  })

  it('keeps the reset-password button inert, as it is today', async () => {
    const columns = userColumns({ canManage: true, onEdit: vi.fn(), onDelete: vi.fn() })
    render(<div>{columns.find(c => c.key === 'actions').render(USER)}</div>)
    const reset = screen.getByRole('button', { name: /Reset/ })
    expect(reset).toBeInTheDocument()
    await userEvent.click(reset)  // must not throw
  })
})

describe('userStats', () => {
  const rows = [
    { user_status: 'active', user_permissions: ['Admin'] },
    { user_status: 'active', user_permissions: ['Staff'] },
    { user_status: 'pending', user_permissions: ['Developer'] },
  ]

  it('counts total, active, pending and elevated users', () => {
    expect(userStats(rows).map(s => s.value)).toEqual(['3', '2', '1', '2'])
  })

  it('tolerates a missing permissions array', () => {
    expect(userStats([{ user_status: 'active' }]).map(s => s.value)).toEqual(['1', '1', '0', '0'])
  })

  it('handles an empty set', () => {
    expect(userStats([]).map(s => s.value)).toEqual(['0', '0', '0', '0'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- --run src/tests/features/users/columns.test.jsx`
Expected: FAIL — cannot resolve `@/features/users/columns`.

- [ ] **Step 3: Write the config**

```jsx
// src/features/users/columns.jsx
import Chip from '@/components/table/Chip'

function PaperPlaneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

const PERMISSION_TONES = { Admin: 'amber', Developer: 'blue', Staff: 'neutral' }

const actionButton = {
  font: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--line-strong)', background: 'var(--surface)',
  color: 'var(--text)', borderRadius: 6, padding: '5px 10px',
  display: 'inline-flex', alignItems: 'center', gap: 5,
}

export function userColumns({ canManage, onEdit, onDelete }) {
  const columns = [
    { key: 'name', label: 'Name', type: 'text', sticky: true, width: 220 },
    {
      key: 'email', label: 'Email', type: 'text',
      render: user => (
        <a href={`mailto:${user.email}`} style={{ color: 'var(--accent)' }}>{user.email}</a>
      ),
    },
    {
      key: 'user_status', label: 'Status', type: 'text',
      render: user => (
        <Chip label={user.user_status} tone={user.user_status === 'active' ? 'green' : 'neutral'} />
      ),
    },
    {
      key: 'user_permissions', label: 'Permission', type: 'text', sortable: false,
      render: user => {
        const permissions = user.user_permissions || []
        if (!permissions.length) return null
        return (
          <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {permissions.map(p => <Chip key={p} label={p} tone={PERMISSION_TONES[p] || 'neutral'} />)}
          </span>
        )
      },
    },
  ]

  if (!canManage) return columns

  return [...columns, {
    key: 'actions', label: '', sortable: false, alwaysVisible: true,
    render: user => (
      <span style={{ display: 'inline-flex', gap: 6 }}>
        {/* No handler — this control is inert today and stays inert here. */}
        <button style={actionButton}><PaperPlaneIcon /> Reset &amp; send password</button>
        <button style={actionButton} onClick={() => onEdit(user)}>Edit</button>
        <button
          style={{ ...actionButton, borderColor: 'var(--chip-red-fg)', color: 'var(--chip-red-fg)' }}
          onClick={() => onDelete(user)}
        >
          Delete
        </button>
      </span>
    ),
  }]
}

export function userStats(rows) {
  const active = rows.filter(u => u.user_status === 'active').length
  const pending = rows.filter(u => u.user_status !== 'active').length
  const elevated = rows.filter(u =>
    (u.user_permissions || []).some(p => p === 'Admin' || p === 'Developer')).length

  return [
    { label: 'Total users', value: String(rows.length), meta: 'With platform access' },
    { label: 'Active', value: String(active), meta: 'Password set' },
    { label: 'Pending invite', value: String(pending), meta: 'Yet to set a password' },
    { label: 'Admins & developers', value: String(elevated), meta: 'Can manage users' },
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- --run src/tests/features/users/columns.test.jsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the failing page test**

```jsx
// src/tests/pages/UsersPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UsersPage from '@/pages/UsersPage'

const USERS = [
  { id: 'me', name: 'Ada Admin', email: 'ada@x.com', user_status: 'active', user_permissions: ['Admin'] },
  { id: 'u2', name: 'Sam Staff', email: 'sam@x.com', user_status: 'pending', user_permissions: ['Staff'] },
]

const authUser = { id: 'me' }
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }))
vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ data: USERS, isLoading: false, isError: false, error: null }),
}))
vi.mock('@/lib/platformClient', () => ({ platform: { functions: { invoke: vi.fn() } } }))

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><UsersPage /></QueryClientProvider>)
}

describe('UsersPage', () => {
  beforeEach(() => { authUser.id = 'me' })

  it('lists users with status and permission chips', () => {
    renderPage()
    expect(screen.getByText('Ada Admin')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  it('shows the stat strip', () => {
    renderPage()
    expect(screen.getByText('Total users')).toBeInTheDocument()
    expect(screen.getByText('Admins & developers')).toBeInTheDocument()
  })

  it('shows action buttons to a manager', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
  })

  it('hides action buttons from staff', () => {
    authUser.id = 'u2'
    renderPage()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('opens the edit modal from the action button', async () => {
    renderPage()
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect(screen.getByText(/Edit User/i)).toBeInTheDocument()
  })

  // The whole point of stopping propagation: Delete must never fire from a row click.
  it('does not open the edit modal when Delete is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1])
    expect(screen.getByText(/Delete User/i)).toBeInTheDocument()
    expect(screen.queryByText(/Edit User/i)).not.toBeInTheDocument()
  })

  it('narrows on search', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Search users/), 'sam')
    expect(screen.queryByText('Ada Admin')).not.toBeInTheDocument()
    expect(screen.getByText('Sam Staff')).toBeInTheDocument()
  })

  it('offers no export button', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the page test to verify it fails**

Run: `npm run test -- --run src/tests/pages/UsersPage.test.jsx`
Expected: FAIL — the old page has no stat strip and no live search.

- [ ] **Step 7: Rewrite the page's render, keeping its logic**

In `src/pages/UsersPage.jsx`: **keep** the imports, `ConfirmDeleteModal`,
`canManage`, `deleteMutation`, and all four `useState` calls for modals.
**Delete** `searchInput`, `searchTerm`, `currentPage`, `perPage`, `sorted`,
`filtered`, `totalPages`, `safePage`, `start`, `paginated`, `handleSearch`,
`handlePerPageChange`, and the entire `<div style={{ padding: 24 }}>` markup
after the three modals.

Add these imports:

```jsx
import { useMemo } from 'react'
import TableShell from '../components/table/TableShell'
import { useTableState } from '../components/table/useTableState'
import { userColumns, userStats } from '../features/users/columns'
```

Replace the deleted state and markup with:

```jsx
  const columns = useMemo(
    () => userColumns({ canManage, onEdit: setPendingEdit, onDelete: setPendingDelete }),
    [canManage],
  )

  const table = useTableState({
    rows: allUsers,
    columns,
    storageKey: 'users',
    searchKeys: ['name', 'email'],
    defaultSort: { key: 'name', dir: 'asc' },
    defaultPerPage: 100,
  })

  return (
    <>
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} />}
      {pendingEdit && <EditUserModal user={pendingEdit} onClose={() => setPendingEdit(null)} />}
      {pendingDelete && (
        <ConfirmDeleteModal
          user={pendingDelete}
          isDeleting={deleteMutation.isPending}
          onCancel={() => { if (!deleteMutation.isPending) setPendingDelete(null) }}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
        />
      )}

      <TableShell
        title="Users"
        subtitle="People with access to this platform"
        stats={userStats(table.filteredRows)}
        table={table}
        columns={columns}
        getRowKey={user => user.id}
        onRowClick={canManage ? setPendingEdit : undefined}
        emptyMessage="No users found."
        searchPlaceholder="Search users by name or email…"
        isLoading={isLoading}
        error={isError ? error : null}
        headerAction={canManage && (
          <button
            onClick={() => setShowAddUser(true)}
            style={{
              font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              padding: '8px 13px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--nav)', background: 'var(--nav)', color: 'var(--surface)',
            }}
          >
            Add user
          </button>
        )}
      />
    </>
  )
```

No `exportFilename` — the page has no export today and this design does not
add one.

- [ ] **Step 8: Run the page test to verify it passes**

Run: `npm run test -- --run src/tests/pages/UsersPage.test.jsx`
Expected: PASS, 8 tests.

If the "does not open the edit modal when Delete is clicked" test fails, the
row-click guard in `DataTable` is not matching the button — check that the
guard uses `event.target.closest('button, a, input, select')` and that the
action buttons are real `<button>` elements.

- [ ] **Step 9: Commit**

```bash
npm run lint
git add src/features/users src/pages/UsersPage.jsx src/tests/features/users src/tests/pages/UsersPage.test.jsx
git commit -m "Rebuild the users table on the shared table system"
```

---

### Task 18: Sweep and finish

**Files:**
- Modify: `CLAUDE.md` (architecture section)
- Verify: the whole suite and a build

- [ ] **Step 1: Run the whole suite**

Run: `npm run test -- --run`
Expected: PASS, roughly 151 tests across 21 files. No skipped files.

- [ ] **Step 2: Confirm no dead code is left behind**

```bash
grep -rn "EyeIcon\|hide-h-scrollbar\|per page" src/pages/ || echo "clean"
```

Expected: `clean`, except `hide-h-scrollbar` which now lives only in
`src/components/table/DataTable.jsx`. If `EyeIcon` or a `per page` select
still appears in any page, that page was not fully migrated.

- [ ] **Step 3: Build**

Run: `npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 4: Walk the app**

Run `npm run dev` and visit every list page plus one detail page from each.
Verify: no console errors; the pinned column and top scrollbar work on Deals
and Organisations; hidden columns survive a refresh; Users shows actions to an
admin and not to staff.

- [ ] **Step 5: Update CLAUDE.md**

In the **Architecture** section, replace the sentence beginning "No `features/`
code yet" with:

```markdown
**Frontend:** React 19 + Vite, React Router v7, TanStack Query, Tailwind v4.
List pages are built on the shared table system in `src/components/table/`:
a page supplies a column config and a stats function from
`src/features/<domain>/columns.jsx`, and `TableShell` + `useTableState` handle
search, sorting, pagination, column visibility and layout. Column visibility
persists per user in localStorage under `flowbird.table.<name>.columns`.
`AccountSettingsPage.jsx` is still by far the largest file and hosts Pipedrive
sync, CSV import and profile management.
```

In the **Conventions** section, replace the sentence "The suite is currently
empty and `passWithNoTests` is on, so a green run does not mean covered." with:

```markdown
Tests go in `src/tests/` mirroring `src/`. The table system and all four list
pages are covered; `AccountSettingsPage`, the detail pages and the auth flow
are not. `passWithNoTests` is still on, so check that files actually ran.
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "Document the shared table system in CLAUDE.md"
```

---

## Self-review notes

**Spec coverage.** Every spec section maps to a task: architecture → Tasks 2–13;
column config and `render` escape hatch → Task 12 and Task 17; `useTableState`
→ Task 5; persistence → Tasks 4–5; per-page specs → Tasks 14–17; visual system
→ Task 1; preserved behaviour (synced scrollbar, Archived rule, export scope,
error copy) → Tasks 6, 13, 14; accessibility → Tasks 8, 10, 12; testing → every
task; rollout order → task order.

**Deliberate deviations from the spec, and why:**
1. **`TabRail` was added** — the spec's component list omitted it, but the
   Deals stage tabs need it and it is entity-agnostic.
2. **Search became live** instead of requiring a Search button. The spec did
   not specify, and instant feedback is the point of the redesign.
3. **`userColumns` is a function, not a constant.** The action column depends
   on `canManage` and on page handlers, which a static array cannot express.

**Open item carried from the spec:** the Organisations metrics
(`authorisation_status`, `fca_number`) are unverified against production
volumes. Task 16 opens with a check; if either field is sparse, swap the stat
before building rather than shipping a card that reads "3".
