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
