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
