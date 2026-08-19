import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PANELS } from '@/features/contacts/relatedPanels'
import { SECTIONS } from '@/features/contacts/detailFields'

const dealsPanel = PANELS.find(p => p.key === 'deals')
const organisationPanel = PANELS.find(p => p.key === 'organisation')

describe('contacts SECTIONS structure', () => {
  it('preserves every original field key exactly once', () => {
    const keys = SECTIONS.flatMap(s => s.groups.flatMap(g => g.fields.map(f => f.key))).sort()
    expect(keys).toEqual([
      'age', 'contact_pipedrive_id', 'date_created', 'email',
      'job_title', 'name', 'organisation.name', 'phone',
    ].sort())
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('contacts Deals panel', () => {
  it('returns an empty array when there are no deals', () => {
    expect(dealsPanel.items({})).toEqual([])
    expect(dealsPanel.items({ deals: [] })).toEqual([])
  })

  it('returns the active deals when present', () => {
    const deals = [{ id: 'd1', title: 'Ashcombe Wealth', stage: 'Offer Made', value: '1850000', archive_time: null }]
    expect(dealsPanel.items({ deals })).toEqual(deals)
  })

  it('excludes archived deals', () => {
    const deals = [
      { id: 'd1', title: 'Active Deal', stage: 'Offer Made', value: '100', archive_time: null },
      { id: 'd2', title: 'Archived Deal', stage: 'Completed', value: '200', archive_time: '2026-05-01T00:00:00Z' },
    ]
    const items = dealsPanel.items({ deals })
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('d1')
  })

  it('builds the route to the deal', () => {
    expect(dealsPanel.to({ id: 'd1' })).toBe('/deals/d1')
  })

  it('renders the deal title, stage chip and formatted value', () => {
    const deal = { id: 'd1', title: 'Ashcombe Wealth', stage: 'Offer Made', value: '1850000' }
    render(<MemoryRouter>{dealsPanel.renderItem(deal)}</MemoryRouter>)
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('Offer Made')).toBeInTheDocument()
    expect(screen.getByText('£1,850,000')).toBeInTheDocument()
  })

  it('omits the value rather than rendering "undefined" when there is none', () => {
    const deal = { id: 'd1', title: 'Ashcombe Wealth', stage: 'Offer Made', value: null }
    render(<MemoryRouter>{dealsPanel.renderItem(deal)}</MemoryRouter>)
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })
})

describe('contacts Organisation panel', () => {
  it('returns an empty array when there is no organisation', () => {
    expect(organisationPanel.items({})).toEqual([])
    expect(organisationPanel.items({ organisation: null })).toEqual([])
  })

  it('returns the single linked organisation as an array', () => {
    const org = { id: 'o1', name: 'Ashcombe Group' }
    expect(organisationPanel.items({ organisation: org })).toEqual([org])
  })

  it('builds the route to the organisation', () => {
    expect(organisationPanel.to({ id: 'o1' })).toBe('/organisations/o1')
  })

  it('renders the organisation name and status/FCA number when present', () => {
    const org = { id: 'o1', name: 'Ashcombe Group', company_status: 'Active', fca_number: '123456' }
    render(<MemoryRouter>{organisationPanel.renderItem(org)}</MemoryRouter>)
    expect(screen.getByText('Ashcombe Group')).toBeInTheDocument()
    expect(screen.getByText(/Active/)).toBeInTheDocument()
    expect(screen.getByText(/123456/)).toBeInTheDocument()
  })

  it('omits the meta line rather than rendering "undefined" when nothing is present', () => {
    const org = { id: 'o1', name: 'Ashcombe Group' }
    render(<MemoryRouter>{organisationPanel.renderItem(org)}</MemoryRouter>)
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })
})
