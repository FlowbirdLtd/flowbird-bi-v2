import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PANELS } from '@/features/organisations/relatedPanels'
import { SECTIONS } from '@/features/organisations/detailFields'

const contactsPanel = PANELS.find(p => p.key === 'contacts')
const dealsPanel = PANELS.find(p => p.key === 'deals')

describe('organisations SECTIONS structure', () => {
  it('preserves every original field key exactly once', () => {
    const keys = SECTIONS.flatMap(s => s.groups.flatMap(g => g.fields.map(f => f.key))).sort()
    expect(keys).toEqual([
      'address', 'authorisation_status', 'company_status', 'date_created',
      'fca_number', 'id_urn', 'name', 'vendor_ownership_structure', 'website',
    ].sort())
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('organisations Contacts panel', () => {
  it('returns an empty array when there are no contacts', () => {
    expect(contactsPanel.items({})).toEqual([])
    expect(contactsPanel.items({ contacts: [] })).toEqual([])
  })

  it('returns the contacts when present', () => {
    const contacts = [{ id: 'c1', name: 'Helen Ashcombe', job_title: 'CFO' }]
    expect(contactsPanel.items({ contacts })).toEqual(contacts)
  })

  it('builds the route to the contact', () => {
    expect(contactsPanel.to({ id: 'c1' })).toBe('/contacts/c1')
  })

  it('renders the contact name and job title when present', () => {
    render(<MemoryRouter>{contactsPanel.renderItem({ id: 'c1', name: 'Helen Ashcombe', job_title: 'CFO' })}</MemoryRouter>)
    expect(screen.getByText('Helen Ashcombe')).toBeInTheDocument()
    expect(screen.getByText('CFO')).toBeInTheDocument()
  })

  it('omits the job title line rather than rendering "undefined" when absent', () => {
    render(<MemoryRouter>{contactsPanel.renderItem({ id: 'c1', name: 'Helen Ashcombe' })}</MemoryRouter>)
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })
})

describe('organisations Deals panel', () => {
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
