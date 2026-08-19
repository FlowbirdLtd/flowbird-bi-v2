import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SECTIONS } from '@/features/deals/detailFields'
import { formatCell, getValue } from '@/components/table/format'

const DEAL = {
  deal_pipedrive_id: '42',
  title: 'Ashcombe Wealth',
  value: '1850000',
  expected_close_date: '2026-07-22',
  contact: { id: 'c1', name: 'Helen Ashcombe' },
  organisation: { id: 'o1', name: 'Ashcombe Group' },
  stage: 'Offer Made',
  ebitda_multiple: '7.1',
  assets_under_advice: '214000000',
  adviser_contracts_requested: 'Yes',
  reason_for_decline_detail: 'Went with a competing bidder.',
}

describe('deals SECTIONS structure', () => {
  it('preserves every original section title in order', () => {
    expect(SECTIONS.map(s => s.title)).toEqual([
      'Summary', 'General', 'Transaction Overview', 'Intermediary Details',
      'Financial Overview and KPIs', 'HoTs Stage - Key Dates', 'Clients', 'Staff',
      'Property', 'Costs', 'Regulatory', 'Back Office', 'Declined Deals',
    ])
  })

  it('has no duplicate field keys across the whole config', () => {
    const keys = SECTIONS.flatMap(s => s.fields.map(f => f.key))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('deals SECTIONS type assignment', () => {
  const field = key => SECTIONS.flatMap(s => s.fields).find(f => f.key === key)

  it('marks every formatDate-driven field as type date', () => {
    for (const key of ['expected_close_date', 'introduction_date', 'deal_exchanged_date', 'date_declined', 'cic_submitted_date']) {
      expect(field(key).type).toBe('date')
    }
  })

  // The original page rendered this one with plain val(), not formatDate() — preserved deliberately.
  it('keeps the one HoTs-stage field that was never date-formatted as text', () => {
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

  it('marks long free-text fields as wide', () => {
    expect(field('reason_for_decline_detail').wide).toBe(true)
    expect(field('details_of_property').wide).toBe(true)
  })
})

describe('deals field rendering', () => {
  const section = title => SECTIONS.find(s => s.title === title)

  it('formats the Value field as GBP via formatCell', () => {
    const field = section('Summary').fields.find(f => f.key === 'value')
    expect(formatCell(getValue(DEAL, field.key), field.type)).toBe('£1,850,000')
  })

  it('formats the EBITDA Multiple field via formatCell', () => {
    const field = section('Transaction Overview').fields.find(f => f.key === 'ebitda_multiple')
    expect(formatCell(getValue(DEAL, field.key), field.type)).toBe('7.1×')
  })

  it('links Contact Name to the contact record via the custom render', () => {
    const field = section('Summary').fields.find(f => f.key === 'contact.name')
    render(<MemoryRouter>{field.render(DEAL)}</MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Helen Ashcombe' })
    expect(link).toHaveAttribute('href', '/contacts/c1')
  })

  it('links Organisation Name to the organisation record via the custom render', () => {
    const field = section('Summary').fields.find(f => f.key === 'organisation.name')
    render(<MemoryRouter>{field.render(DEAL)}</MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Ashcombe Group' })
    expect(link).toHaveAttribute('href', '/organisations/o1')
  })
})
