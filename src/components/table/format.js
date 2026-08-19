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

/**
 * Rounds to one decimal place of `unit` using integer division.
 * Dividing first and calling toFixed loses the boundary case: 6_050_000 / 1e6
 * is stored as 6.04999…, so (6.05).toFixed(1) is "6.0" and £6.05m would
 * display as £6m. Dividing by unit/10 keeps the intermediate exact.
 */
function roundToTenth(n, unit) {
  return Math.round(n / (unit / 10)) / 10
}

function gbpShort(n) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return '£' + roundToTenth(n, 1e9) + 'bn'
  if (abs >= 1e6) return '£' + roundToTenth(n, 1e6) + 'm'
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

/**
 * True when a value has nothing worth showing, using the same rule as the
 * table: whatever `formatCell` refuses to render is empty. Keeping one rule
 * means "£0 is not priced yet" holds in a detail field as well as a cell.
 */
export function isEmpty(value, type = 'text') {
  return formatCell(value, type) === null
}
