import { useState, useMemo } from 'react'
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
  // An empty stored array means "unhide everything", so check for the absent
  // key directly rather than treating [] as "nothing stored".
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

  // Clamp during render rather than correcting in an effect: a shrinking result
  // set should land on the last page that still has rows, and deriving it here
  // avoids a second render pass. `page` is only ever read through `safePage`.
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
