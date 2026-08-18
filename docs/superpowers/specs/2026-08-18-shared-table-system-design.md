# Shared table system — design

**Date:** 2026-08-18
**Status:** Awaiting review
**Scope:** `DealsPage`, `ContactsPage`, `OrganisationsPage`, `UsersPage`

## Why

The four list pages each hand-roll the same table: an identical ~40-line
toolbar/pagination block, the same zebra-striped `<table>`, the same eye-icon
view column, the same inline styles. Changing the look of one table today means
editing four files and accepting that they will drift apart again.

At the same time the tables are dated: 16 columns with no sorting, no way to
hide a column, no summary, and nothing pinned — scroll right on Deals and you
lose track of which deal you are reading.

This design replaces the four copies with one config-driven table, and applies
the visual direction approved in the mockup (soft modern SaaS: hairline rows,
counted stage chips, pinned title column, tabular figures).

## Decisions already taken

| Question | Decision |
|---|---|
| Users page | Adopts the shared shell, keeps its Reset Password / Edit / Delete action column. Row click opens Edit for users who can manage. |
| Column preferences | `localStorage`, one key per table. No migration, no backend work. |
| Typography | App-wide. Manrope + IBM Plex Mono replace `system-ui` in `index.css`. |
| Stat strips | On all four tables, each with metrics genuinely worth the space — not bare counts. |
| Structure | Config-driven `<DataTable>` over adopting TanStack Table. |

## Architecture

```
src/
  components/table/
    DataTable.jsx        # <table>: header, rows, sticky column, sort affordance
    TableShell.jsx       # card wrapper: tabs slot, toolbar, meta strip, scrollbars
    TableToolbar.jsx     # search box, columns picker, export button
    ColumnPicker.jsx     # popover, checkbox per column
    Pagination.jsx       # per-page select, page indicator, prev/next
    StatStrip.jsx        # responsive grid of stat cards
    Chip.jsx             # coloured pill (stage, status, permission)
    useTableState.js     # search, sort, page, perPage, column visibility
    useSyncedScroll.js   # top scrollbar mirroring the table's scrollWidth
  features/
    deals/columns.jsx           organisations/columns.jsx
    contacts/columns.jsx        users/columns.jsx
```

`components/table/` is generic and knows nothing about deals or contacts.
`features/<domain>/columns.jsx` holds the column config and the metrics
function for that entity. Pages become thin: fetch via the existing hook,
hand the rows and the config to `<TableShell>`.

This is the first `features/` code in the repo, and matches the structure
`docs/conventions.md` already prescribes.

### Column config

One array per entity. The `render` escape hatch is required from day one —
without it the Users action column would bend the component out of shape.

```js
{
  key: 'value',            // property on the row; also the sort key
  label: 'Value',          // header text
  align: 'right',          // 'left' | 'right'
  type: 'gbp',             // 'text'|'gbp'|'gbpShort'|'number'|'multiple'|'date'|'chip'
  sortable: true,          // default true
  sticky: true,            // at most one column; pins left
  width: 260,              // optional min-width in px
  wrap: true,              // allow the cell to wrap, clamped to 2 lines
  defaultHidden: false,    // hidden until the user enables it
  alwaysVisible: false,    // cannot be hidden (sticky column, action column)
  render: (row) => <JSX/>, // full control; overrides `type`
}
```

`type` drives formatting and alignment so pages never repeat a formatter:
`gbp` → `£1,850,000`; `gbpShort` → `£214m`; `multiple` → `7.1×`;
`date` → `dd/mm/yyyy`; empty values → a muted em dash in every column.

### useTableState

```js
const table = useTableState({
  rows,                        // already fetched
  columns,                     // config array
  storageKey: 'deals',         // localStorage namespace
  searchKeys: ['title', 'contact.name', 'owner'],
  defaultSort: { key: 'value', dir: 'desc' },
  defaultPerPage: 25,
  filter: row => boolean,      // optional; the Deals stage tabs use this
})
// → { visible, page, pageRows, filteredRows, sort, setSort, search, setSearch,
//     perPage, setPerPage, columnsVisible, toggleColumn, range, totalPages }
```

Sorting is stable and type-aware: numbers numerically, dates chronologically,
everything else via `localeCompare(..., 'en-GB')`. Blanks always sort last
regardless of direction, so an empty column never floods the first page.
Changing tab, search or per-page resets to page 1 — matching today's behaviour.

### Persistence

`localStorage` key `flowbird.table.<name>.columns`, holding an array of hidden
column keys. Reads are defensive: unparseable JSON, or keys that no longer
exist in the config, are ignored rather than throwing. Sort order, page and
search are deliberately **not** persisted — they are per-visit state.

## Per-page specification

### Deals
The 15 data columns are unchanged. The `View` column is removed — the row
click replaces it.
`Title` is sticky. `Stage` renders as a chip on a pipeline ramp: grey at
Introduction, blue mid-funnel, amber at HoTs, teal at Exchanged, green at
Completed, `--red` at Declined only. `Deal Address` ships `defaultHidden`.
Stage tabs stay exactly as they are in behaviour — including Archived being
driven by `archive_time` — but render as counted chips.

Stats: deals in view · combined value · assets under advice · average EBITDA
multiple. All four recalculate against the active tab and search.

### Contacts
Columns: Contact Name (sticky) · Email · Phone · Organisation · Job Title ·
Date Created. Job Title and Date Created are new to the table and both
`defaultHidden`; they exist on `contacts` and cost nothing to offer.

Stats: total contacts · linked to an organisation · with an email address ·
with a phone number.

### Organisations
Columns: Organisation (sticky) · Address · Company Status · Website ·
Contacts · Authorisation Status · FCA Number. The last two are new and
`defaultHidden`.

Stats: total organisations · authorised · with an FCA number · with at least
one contact.

> **To confirm against production.** These metrics were chosen from the schema,
> not from real volumes — the local stack holds only 10 organisations and 12
> contacts. In that seed, `website` is populated on 1 of 10 rows, which is why
> it is not a metric. If `authorisation_status` or `fca_number` turn out to be
> as sparse in production, swap them before building.

### Users
Columns: Name (sticky) · Email · Status chip · Permission chips · action
column. The action column is `alwaysVisible`, pinned right, and rendered
through `render` — Reset Password, Edit, Delete, gated on `canManage` exactly
as today. Search and pagination behave as they do now. No export button: the
page has none today and this design does not add one.

Stats: total users · active · pending invite · admins and developers.

Row click opens the Edit modal when `canManage`, and does nothing otherwise.
Action buttons call `stopPropagation` so Delete can never fire from a stray
row click.

## Visual system

New tokens in `src/index.css`, additive — existing `--nav`, `--accent`,
`--red`, `--text`, `--border`, `--radius` keep their current values and
meanings so nothing outside the tables shifts.

```
--ground #F4F6FA   --surface #FFFFFF   --surface-alt #FAFBFD
--ink-soft #5A6580 --ink-faint #8B94A8 --line #E4E8F0 --line-strong #CFD6E4
--accent-wash #EDF2FC
--chip-{neutral,blue,teal,green,amber,red}-{bg,fg}
--shadow-sm --shadow-md --shadow-rail
```

Light mode only, matching the rest of the app — no dark theme.

Typography: Manrope for UI, IBM Plex Mono for figures, uppercase labels and
stat readouts. Self-hosted via `@fontsource/manrope` and
`@fontsource/ibm-plex-mono` rather than a Google Fonts `<link>`, so the app
carries no external request and works on a poor connection. Two new
dependencies; both are static font packages with no runtime.

Rows are 46px with a single hairline rule and no zebra striping. Whole-row
hover uses `--accent-wash`. Figures are `font-variant-numeric: tabular-nums`
and right-aligned.

## Behaviour to preserve

- The top-mounted horizontal scrollbar on Deals, synced both ways, moves into
  `useSyncedScroll` and stays. It applies to any table wide enough to scroll.
- Loading, error and empty states keep their current wording. The Deals error
  panel keeps its "check that schema.sql, seed.sql and policies.sql have been
  run" hint.
- Export continues to hand `filtered` (not the current page) to `ExportModal`,
  so exporting a filtered view exports everything that matches.
- All reads stay in the existing TanStack Query hooks. No data-layer change,
  no new queries, no edge function change.

## Accessibility

Sortable headers are `<button>`s inside `<th>` carrying `aria-sort`. The
column picker is a labelled popover that closes on outside click and Escape,
returning focus to its trigger. Every interactive element has a visible
`:focus-visible` ring. Row click is mirrored by a keyboard-reachable control:
the sticky title cell contains a real link to the detail route, so the row is
operable without a mouse. Chip colour is never the only signal — the label is
always present.

## Testing

`src/tests/` is currently empty and `passWithNoTests` is on, so a green run
today means nothing. This work adds the first real coverage:

- `useTableState` — sorting by each type, blanks-last, search across nested
  keys, page reset on filter change, column toggle round-trip through
  localStorage, corrupt localStorage ignored.
- `DataTable` — renders configured columns only, respects `render`, sticky
  column present, empty state when no rows.
- One page-level test per entity: rows render, search narrows, sort reorders.
- Users specifically: an action-button click does not trigger the row click,
  and non-managers see no action column.

## Out of scope

Server-side sorting or pagination (client-side is fine at current volumes);
saved views or filter presets; multi-column sort; column reordering or
resizing; `AccountSettingsPage`; the detail pages; any change to
`sync-pipedrive` or the schema.

## Risks

1. **Over-abstraction.** Four tables is a thin base to generalise from. The
   `render` escape hatch is the mitigation; if a page starts fighting the
   config, that page keeps its own markup rather than distorting `DataTable`.
2. **Volume.** Rendering 100 rows × 16 columns with sticky positioning is
   heavier than today's markup. Current data is small, but this should be
   checked against a production-sized deals table before shipping.
3. **App-wide font change** touches every page, including ones not otherwise
   in scope. It is a one-line change in `index.css` and easily reverted, but
   it should be looked at on Account Settings and the detail pages before merge.

## Rollout

Build in this order, each step independently reviewable:

1. Tokens, fonts, and the `components/table/` primitives, with tests.
2. Deals — the hardest table; it exercises sticky, chips, tabs and formatting.
3. Contacts and Organisations — thin once Deals is proven.
4. Users — last, because of the action column and permission gating.
