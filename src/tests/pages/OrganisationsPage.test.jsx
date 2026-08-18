import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OrganisationsPage from '@/pages/OrganisationsPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => navigate,
}))

const ORGS = [
  { id: 'a', name: 'Ashcombe Wealth', address: '12 Rodney Road, Cheltenham',
    company_status: 'Active', website: 'https://ashcombe.co.uk',
    authorisation_status: 'Authorised', fca_number: '123456',
    contacts: [{ name: 'Helen Ashcombe' }] },
  { id: 'b', name: 'Barwell Financial', address: '', company_status: '',
    website: '', authorisation_status: '', fca_number: '', contacts: [] },
]

vi.mock('@/hooks/useOrganisations', () => ({
  useOrganisations: () => ({ data: ORGS, isLoading: false, isError: false, error: null }),
}))

const renderPage = () => render(<MemoryRouter><OrganisationsPage /></MemoryRouter>)

describe('OrganisationsPage', () => {
  it('lists organisations', () => {
    renderPage()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
  })

  it('renders the website as an external link', () => {
    renderPage()
    const link = screen.getByRole('link', { name: 'https://ashcombe.co.uk' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('lists linked contact names', () => {
    renderPage()
    expect(screen.getByText('Helen Ashcombe')).toBeInTheDocument()
  })

  it('shows the stat strip', () => {
    renderPage()
    expect(screen.getByText('Total organisations')).toBeInTheDocument()
  })

  it('narrows on search', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Search organisations/), 'barwell')
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
  })

  it('opens the organisation on row click', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Ashcombe Wealth'))
    expect(navigate).toHaveBeenCalledWith('/organisations/a')
  })
})
