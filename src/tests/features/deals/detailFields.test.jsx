import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SECTIONS } from '@/features/deals/detailFields'
import { PANELS } from '@/features/deals/relatedPanels'
import { formatCell, getValue } from '@/components/table/format'

const DEAL = {
  deal_pipedrive_id: '42',
  title: 'Ashcombe Wealth',
  value: '1850000',
  expected_close_date: '2026-07-22',
  contact: { id: 'c1', name: 'Helen Ashcombe', job_title: 'Financial Adviser', email: 'helen@ashcombe.test', phone: '01234 567890' },
  organisation: { id: 'o1', name: 'Ashcombe Group', company_status: 'Active', fca_number: '123456', authorisation_status: 'Authorised' },
  stage: 'Offer Made',
  ebitda_multiple: '7.1',
  assets_under_advice: '214000000',
  adviser_contracts_requested: 'Yes',
  reason_for_decline_detail: 'Went with a competing bidder.',
}

const ALL_FIELDS = SECTIONS.flatMap(s => s.groups.flatMap(g => g.fields))
const ALL_KEYS = ALL_FIELDS.map(f => f.key)
const field = key => ALL_FIELDS.find(f => f.key === key)
const section = title => SECTIONS.find(s => s.title === title)
const groupWithLabel = (title, label) => section(title).groups.find(g => g.label === label)

describe('deals SECTIONS structure', () => {
  it('has exactly 16 sections, in the specified order', () => {
    expect(SECTIONS).toHaveLength(16)
    expect(SECTIONS.map(s => s.title)).toEqual([
      'Summary', 'Deal Team', 'Deal Profile', 'Consideration & Pricing', 'Deal Timeline',
      'Financial Performance', 'Clients', 'People & Staffing', 'Additional Contacts',
      'Advisers & Intermediaries', 'Due Diligence', 'Legal & Completion', 'Regulatory',
      'Property', 'Integration & Back Office', 'Declined',
    ])
  })

  it('carries every one of the original 162 fields exactly once', () => {
    expect(ALL_KEYS).toHaveLength(162)
    expect(new Set(ALL_KEYS).size).toBe(162)
  })

  it('gives every field a non-empty label and an allowed type', () => {
    const allowed = new Set(['text', 'gbp', 'gbpShort', 'multiple', 'number', 'date'])
    for (const f of ALL_FIELDS) {
      expect(f.label).toBeTruthy()
      expect(allowed.has(f.type)).toBe(true)
    }
  })

  it('marks exactly the nine long-prose fields as wide', () => {
    const wideKeys = ALL_FIELDS.filter(f => f.wide).map(f => f.key).sort()
    expect(wideKeys).toEqual([
      'details_of_property',
      'latest_status_acquisition_committee',
      'lease_details',
      'other_integration_notes',
      'other_regulatory_items_of_note',
      'platforms',
      'post_acquisition_office_plans',
      'reason_for_decline_detail',
      'recruitment_requirements',
    ])
  })
})

describe('deals SECTIONS re-homing', () => {
  it('moves Contact 2 Name into Additional Contacts, not People & Staffing', () => {
    const additionalKeys = section('Additional Contacts').groups.flatMap(g => g.fields.map(f => f.key))
    const staffingKeys = section('People & Staffing').groups.flatMap(g => g.fields.map(f => f.key))
    expect(additionalKeys).toContain('contact_2_name')
    expect(staffingKeys).not.toContain('contact_2_name')
  })

  it('gathers Deal Lead, FDD Lead and RDD Lead into Deal Team', () => {
    const teamKeys = section('Deal Team').groups.flatMap(g => g.fields.map(f => f.key))
    expect(teamKeys).toEqual(
      expect.arrayContaining(['deal_lead', 'fdd_lead', 'rdd_lead']),
    )
  })

  it('places all eight milestone dates in the Deal Timeline "Milestones" group', () => {
    const milestones = groupWithLabel('Deal Timeline', 'Milestones').fields.map(f => f.key)
    expect(milestones).toEqual([
      'introduction_date', 'first_meeting_date', 'offer_made_date', 'hots_issued_date',
      'hots_signed_date', 'date_dd_completed', 'deal_exchanged_date', 'deal_complete_date',
    ])
  })

  it('moves the Costs fields into Financial Performance', () => {
    const financeKeys = section('Financial Performance').groups.flatMap(g => g.fields.map(f => f.key))
    expect(financeKeys).toEqual(
      expect.arrayContaining(['fca_pi_pct', 'variable_cost_pct', 'fixed_costs']),
    )
    expect(SECTIONS.find(s => s.title === 'Costs')).toBeUndefined()
  })
})

describe('deals SECTIONS type assignment (preserved verbatim)', () => {
  it('marks every formatDate-driven field as type date', () => {
    for (const key of ['expected_close_date', 'introduction_date', 'deal_exchanged_date', 'date_declined', 'cic_submitted_date']) {
      expect(field(key).type).toBe('date')
    }
  })

  it('keeps the one field that was never date-formatted as text', () => {
    expect(field('adviser_contracts_requested').type).toBe('text')
  })

  it('marks money fields as gbp', () => {
    for (const key of ['value', 'completion_payment', 'headline_consideration', 'fixed_costs', 'broker_fee_value']) {
      expect(field(key).type).toBe('gbp')
    }
  })

  it('marks multiples as multiple', () => {
    for (const key of ['ri_multiple', 'net_turnover_multiple', 'ebitda_multiple', 'ebitda_multiple_post_cambridge']) {
      expect(field(key).type).toBe('multiple')
    }
  })

  it('marks assets-under-advice-shaped fields as gbpShort, matching the deals table column', () => {
    expect(field('assets_under_advice').type).toBe('gbpShort')
  })

  it('marks staff counts as number', () => {
    for (const key of ['number_of_advisers_required', 'number_of_clients', 'households_per_adviser']) {
      expect(field(key).type).toBe('number')
    }
  })
})

describe('deals field rendering', () => {
  it('formats the Value field as GBP via formatCell', () => {
    const f = section('Summary').groups.flatMap(g => g.fields).find(fl => fl.key === 'value')
    expect(formatCell(getValue(DEAL, f.key), f.type)).toBe('£1,850,000')
  })

  it('formats the EBITDA Multiple field via formatCell', () => {
    const f = section('Consideration & Pricing').groups.flatMap(g => g.fields).find(fl => fl.key === 'ebitda_multiple')
    expect(formatCell(getValue(DEAL, f.key), f.type)).toBe('7.1×')
  })

  it('links Contact Name to the contact record via the custom render', () => {
    const f = section('Summary').groups.flatMap(g => g.fields).find(fl => fl.key === 'contact.name')
    render(<MemoryRouter>{f.render(DEAL)}</MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Helen Ashcombe' })
    expect(link).toHaveAttribute('href', '/contacts/c1')
  })

  it('links Organisation Name to the organisation record via the custom render', () => {
    const f = section('Summary').groups.flatMap(g => g.fields).find(fl => fl.key === 'organisation.name')
    render(<MemoryRouter>{f.render(DEAL)}</MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Ashcombe Group' })
    expect(link).toHaveAttribute('href', '/organisations/o1')
  })
})

describe('deals PANELS', () => {
  const contactPanel = PANELS.find(p => p.key === 'contact')
  const orgPanel = PANELS.find(p => p.key === 'organisation')

  it('returns an empty array when the contact relation is absent', () => {
    expect(contactPanel.items({})).toEqual([])
  })

  it('returns a one-element array when the contact relation is present', () => {
    expect(contactPanel.items(DEAL)).toEqual([DEAL.contact])
  })

  it('returns an empty array when the organisation relation is absent', () => {
    expect(orgPanel.items({})).toEqual([])
  })

  it('returns a one-element array when the organisation relation is present', () => {
    expect(orgPanel.items(DEAL)).toEqual([DEAL.organisation])
  })

  it('builds the contact route from the item id', () => {
    expect(contactPanel.to(DEAL.contact)).toBe('/contacts/c1')
  })

  it('builds the organisation route from the item id', () => {
    expect(orgPanel.to(DEAL.organisation)).toBe('/organisations/o1')
  })

  it('renders the contact card with name and secondary attributes, no undefined text', () => {
    render(<MemoryRouter>{contactPanel.renderItem(DEAL.contact)}</MemoryRouter>)
    expect(screen.getByText('Helen Ashcombe')).toBeInTheDocument()
    expect(screen.getByText('Financial Adviser')).toBeInTheDocument()
    expect(screen.getByText('helen@ashcombe.test')).toBeInTheDocument()
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
  })

  it('renders the organisation card with name and secondary attributes, no undefined text', () => {
    render(<MemoryRouter>{orgPanel.renderItem(DEAL.organisation)}</MemoryRouter>)
    expect(screen.getByText('Ashcombe Group')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Authorised')).toBeInTheDocument()
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
  })

  it('omits attributes that are absent rather than printing them blank', () => {
    const sparse = { id: 'c2', name: 'Bare Contact' }
    render(<MemoryRouter>{contactPanel.renderItem(sparse)}</MemoryRouter>)
    expect(screen.getByText('Bare Contact')).toBeInTheDocument()
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
  })

  it('has an empty-state message for each panel', () => {
    expect(contactPanel.emptyMessage).toBe('No contact linked.')
    expect(orgPanel.emptyMessage).toBe('No organisation linked.')
  })
})
