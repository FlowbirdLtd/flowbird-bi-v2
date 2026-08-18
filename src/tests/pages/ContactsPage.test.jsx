import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ContactsPage from '@/pages/ContactsPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => navigate,
}))

const CONTACTS = [
  { id: 'a', name: 'Helen Ashcombe', email: 'helen@ashcombe.co.uk', phone: '0123',
    organisation_id: 'org-1', organisation: { name: 'Ashcombe Wealth' } },
  { id: 'b', name: 'Douglas Vine', email: '', phone: '', organisation_id: null, organisation: null },
]

vi.mock('@/hooks/useContacts', () => ({
  useContacts: () => ({ data: CONTACTS, isLoading: false, isError: false, error: null }),
}))

const renderPage = () => render(<MemoryRouter><ContactsPage /></MemoryRouter>)

describe('ContactsPage', () => {
  it('lists contacts with their organisation', () => {
    renderPage()
    expect(screen.getByText('Helen Ashcombe')).toBeInTheDocument()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
  })

  it('renders the email as a mailto link', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'helen@ashcombe.co.uk' }))
      .toHaveAttribute('href', 'mailto:helen@ashcombe.co.uk')
  })

  it('shows a dash where a contact has no phone', () => {
    renderPage()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows the stat strip', () => {
    renderPage()
    expect(screen.getByText('Total contacts')).toBeInTheDocument()
  })

  it('narrows on search', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Search contacts/), 'douglas')
    expect(screen.queryByText('Helen Ashcombe')).not.toBeInTheDocument()
    expect(screen.getByText('Douglas Vine')).toBeInTheDocument()
  })

  it('opens the contact on row click', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Helen Ashcombe'))
    expect(navigate).toHaveBeenCalledWith('/contacts/a')
  })

  // The mailto link owns its own click.
  it('does not navigate when the email link is clicked', async () => {
    renderPage()
    navigate.mockClear()
    await userEvent.click(screen.getByRole('link', { name: 'helen@ashcombe.co.uk' }))
    expect(navigate).not.toHaveBeenCalled()
  })
})
