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
