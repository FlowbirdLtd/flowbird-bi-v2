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
