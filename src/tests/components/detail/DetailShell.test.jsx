import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DetailShell from '@/components/detail/DetailShell'

const SECTIONS = [
  {
    title: 'Summary',
    groups: [{ fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'value', label: 'Value', type: 'gbp' },
      { key: 'expected_close_date', label: 'Expected Close Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'text' },
    ] }],
  },
  {
    title: 'Empty Section',
    groups: [{ fields: [
      { key: 'ghost', label: 'Ghost Field', type: 'text' },
    ] }],
  },
]

const PANELS = [
  {
    key: 'contacts',
    title: 'Contacts',
    items: row => row.contacts,
    to: contact => `/contacts/${contact.id}`,
    renderItem: contact => contact.name,
    emptyMessage: 'No contacts linked.',
  },
]

const ROW = { contacts: [{ id: 'c1', name: 'Helen Ashcombe' }], title: 'Ashcombe Wealth', value: '1850000', expected_close_date: '2026-07-22' }

const renderShell = (extra = {}) => render(
  <MemoryRouter>
    <DetailShell
      title="Deal Information"
      breadcrumb={{ to: '/deals', label: 'Deals', trail: ' > View Deal Details.' }}
      sections={SECTIONS}
      row={ROW}
      backLink={{ to: '/deals', label: 'Back to Deals' }}
      {...extra}
    />
  </MemoryRouter>,
)

describe('DetailShell', () => {
  beforeEach(() => localStorage.clear())

  it('renders the title, breadcrumb link and back link', () => {
    renderShell()
    expect(screen.getByRole('heading', { name: 'Deal Information' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Deals' })).toHaveAttribute('href', '/deals')
    expect(screen.getByRole('link', { name: /Back to Deals/ })).toHaveAttribute('href', '/deals')
  })

  it('formats a date field via formatCell (en-GB)', () => {
    renderShell()
    expect(screen.getByText('22/07/2026')).toBeInTheDocument()
  })

  it('formats a money field via formatCell (GBP, thousands separators)', () => {
    renderShell()
    expect(screen.getByText('£1,850,000')).toBeInTheDocument()
  })

  it('hides an entirely-empty section by default', () => {
    renderShell()
    expect(screen.queryByText('Empty Section')).not.toBeInTheDocument()
  })

  it('starts with the toggle off and empty fields hidden', () => {
    renderShell()
    const toggle = screen.getByRole('button', { name: 'Show all fields' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })

  it('reveals hidden fields and sections on toggle, and re-hides them on toggle again', async () => {
    renderShell()
    const toggle = screen.getByRole('button', { name: 'Show all fields' })

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Empty Section')).toBeInTheDocument()

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
    expect(screen.queryByText('Empty Section')).not.toBeInTheDocument()
  })

  it('persists the preference through localStorage across mounts', async () => {
    const { unmount } = renderShell()
    await userEvent.click(screen.getByRole('button', { name: 'Show all fields' }))
    expect(localStorage.getItem('flowbird.detail.showEmpty')).toBe('true')
    unmount()

    renderShell()
    expect(screen.getByRole('button', { name: 'Show all fields' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('degrades a corrupt stored preference to false', () => {
    localStorage.setItem('flowbird.detail.showEmpty', '{not json')
    renderShell()
    expect(screen.getByRole('button', { name: 'Show all fields' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders a related panel that has records', () => {
    renderShell({ panels: PANELS })
    expect(screen.getByRole('link', { name: /Helen Ashcombe/ })).toBeInTheDocument()
  })

  it('withholds a related panel with no records, and the rail with it', () => {
    renderShell({ panels: PANELS, row: { ...ROW, contacts: [] } })
    expect(screen.queryByRole('complementary', { name: 'Related records' })).not.toBeInTheDocument()
  })

  it('reveals an empty related panel through the same toggle as empty fields', async () => {
    renderShell({ panels: PANELS, row: { ...ROW, contacts: [] } })
    await userEvent.click(screen.getByRole('button', { name: 'Show all fields' }))
    expect(screen.getByRole('complementary', { name: 'Related records' })).toBeInTheDocument()
    expect(screen.getByText('No contacts linked.')).toBeInTheDocument()
  })
})
