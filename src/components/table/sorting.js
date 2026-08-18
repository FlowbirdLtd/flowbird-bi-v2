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
