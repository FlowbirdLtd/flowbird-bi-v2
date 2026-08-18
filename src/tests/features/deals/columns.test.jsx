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
