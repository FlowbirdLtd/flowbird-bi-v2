import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DealsPage from '@/pages/DealsPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => navigate,
}))

const DEALS = [
  { id: 'a', title: 'Ashcombe Wealth', stage: 'Offer Made', value: '1850000',
    archive_time: null, ebitda_multiple: '7.1', assets_under_advice: '214000000',
    contact: { name: 'Helen Ashcombe' } },
  { id: 'b', title: 'Barwell Financial', stage: 'Completed', value: '4200000',
    archive_time: null, ebitda_multiple: '7.4', assets_under_advice: '486000000',
    contact: { name: 'Douglas Vine' } },
  { id: 'c', title: 'Callaghan Advisers', stage: 'Completed', value: '2650000',
    archive_time: '2026-05-01T00:00:00Z', ebitda_multiple: '6.8',
    assets_under_advice: '298000000', contact: { name: 'Marie Callaghan' } },
]

beforeEach(() => localStorage.clear())

const useDeals = vi.fn(() => ({ data: DEALS, isLoading: false, isError: false, error: null }))
vi.mock('@/hooks/useDeals', () => ({ useDeals: (...args) => useDeals(...args) }))

const renderPage = () => render(<MemoryRouter><DealsPage /></MemoryRouter>)

describe('DealsPage', () => {
  it('lists active deals', () => {
    renderPage()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
  })

  it('excludes archived deals from All Deals', () => {
    renderPage()
    expect(screen.queryByText('Callaghan Advisers')).not.toBeInTheDocument()
  })

  it('shows archived deals under the Archived tab', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('tab', { name: /Archived/ }))
    expect(screen.getByText('Callaghan Advisers')).toBeInTheDocument()
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
  })

  it('recalculates the stats against the active tab', async () => {
    renderPage()
    expect(screen.getByText('£6.1m')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /^Completed/ }))
    expect(screen.getByText('£4.2m')).toBeInTheDocument()
  })

  it('narrows on search', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Search deals/), 'barwell')
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
  })

  it('opens the deal on row click', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Ashcombe Wealth'))
    expect(navigate).toHaveBeenCalledWith('/deals/a')
  })

  it('surfaces a query error', () => {
    useDeals.mockReturnValueOnce({
      data: undefined, isLoading: false, isError: true, error: new Error('boom'),
    })
    renderPage()
    expect(screen.getByText(/Database error/)).toBeInTheDocument()
  })
})

describe('DealsPage view switching', () => {
  it('starts on the table view by default', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: 'Table' })).toHaveAttribute('aria-selected', 'true')
    // The stage TabRail is a table-only concept.
    expect(screen.getByRole('tab', { name: /^Completed/ })).toBeInTheDocument()
  })

  it('switches to the board view, hiding the stage tabs and pagination', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('tab', { name: 'Board' }))
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: /^Completed/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  it('groups deals into their stage column on the board and excludes archived deals entirely', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('tab', { name: 'Board' }))
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
    // Archived deals must not appear on any board column.
    expect(screen.queryByText('Callaghan Advisers')).not.toBeInTheDocument()
    expect(screen.queryByText('Archived')).not.toBeInTheDocument()
  })

  it('filters board cards on search', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('tab', { name: 'Board' }))
    await userEvent.type(screen.getByPlaceholderText(/Search deals/), 'barwell')
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
  })

  it('navigates to the deal on card click in the board view', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('tab', { name: 'Board' }))
    await userEvent.click(screen.getByText('Ashcombe Wealth'))
    expect(navigate).toHaveBeenCalledWith('/deals/a')
  })

  it('persists the chosen view across a remount', async () => {
    const { unmount } = renderPage()
    await userEvent.click(screen.getByRole('tab', { name: 'Board' }))
    expect(localStorage.getItem('flowbird.deals.view')).toBe('board')
    unmount()
    renderPage()
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')
  })

  it('degrades a corrupt stored view to table', () => {
    localStorage.setItem('flowbird.deals.view', 'kanban-please')
    renderPage()
    expect(screen.getByRole('tab', { name: 'Table' })).toHaveAttribute('aria-selected', 'true')
  })
})
