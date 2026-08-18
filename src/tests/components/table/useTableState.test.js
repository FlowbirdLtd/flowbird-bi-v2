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
