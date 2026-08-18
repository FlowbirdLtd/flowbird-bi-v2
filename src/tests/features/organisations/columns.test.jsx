import { describe, it, expect } from 'vitest'
import { ORGANISATION_COLUMNS, organisationStats } from '@/features/organisations/columns'

describe('ORGANISATION_COLUMNS', () => {
  it('pins the organisation name', () => {
    expect(ORGANISATION_COLUMNS.filter(c => c.sticky).map(c => c.key)).toEqual(['name'])
  })

  it('offers authorisation status and FCA number hidden by default', () => {
    const hidden = ORGANISATION_COLUMNS.filter(c => c.defaultHidden).map(c => c.key)
    expect(hidden).toEqual(['authorisation_status', 'fca_number'])
  })
})

describe('organisationStats', () => {
  const rows = [
    { name: 'A', authorisation_status: 'Authorised', fca_number: '123', contacts: [{ name: 'Ada' }] },
    { name: 'B', authorisation_status: '', fca_number: '', contacts: [] },
    { name: 'C', authorisation_status: 'Authorised', fca_number: '456', contacts: [{ name: 'Cai' }] },
  ]

  it('counts totals, authorised, FCA numbers and contact coverage', () => {
    expect(organisationStats(rows).map(s => s.value)).toEqual(['3', '2', '2', '2'])
  })

  it('treats a missing contacts array as no contacts', () => {
    expect(organisationStats([{ name: 'D' }])[3].value).toBe('0')
  })

  it('handles an empty set', () => {
    expect(organisationStats([]).map(s => s.value)).toEqual(['0', '0', '0', '0'])
  })
})
