import { describe, it, expect } from 'vitest'
import { CONTACT_COLUMNS, contactStats } from '@/features/contacts/columns'

describe('CONTACT_COLUMNS', () => {
  it('pins the name', () => {
    expect(CONTACT_COLUMNS.filter(c => c.sticky).map(c => c.key)).toEqual(['name'])
  })

  it('offers job title and date created hidden by default', () => {
    const hidden = CONTACT_COLUMNS.filter(c => c.defaultHidden).map(c => c.key)
    expect(hidden).toEqual(['job_title', 'date_created'])
  })
})

describe('contactStats', () => {
  const rows = [
    { name: 'Ada', email: 'ada@x.com', phone: '0123', organisation_id: 'org-1' },
    { name: 'Bob', email: '', phone: '0456', organisation_id: null },
    { name: 'Cai', email: 'cai@x.com', phone: '', organisation_id: 'org-2' },
  ]

  it('counts totals and coverage', () => {
    expect(contactStats(rows).map(s => s.value)).toEqual(['3', '2', '2', '2'])
  })

  it('describes coverage as a share of the total', () => {
    expect(contactStats(rows)[1].meta).toBe('67% of contacts')
  })

  it('handles an empty set without dividing by zero', () => {
    expect(contactStats([]).map(s => s.value)).toEqual(['0', '0', '0', '0'])
    expect(contactStats([])[1].meta).toBe('No contacts yet')
  })
})
