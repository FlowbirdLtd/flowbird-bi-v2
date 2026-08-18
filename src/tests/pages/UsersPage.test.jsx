import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UsersPage from '@/pages/UsersPage'

const USERS = [
  { id: 'me', name: 'Ada Admin', email: 'ada@x.com', user_status: 'active', user_permissions: ['Admin'] },
  { id: 'u2', name: 'Sam Staff', email: 'sam@x.com', user_status: 'pending', user_permissions: ['Staff'] },
]

const authUser = { id: 'me' }
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }))
vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ data: USERS, isLoading: false, isError: false, error: null }),
}))
vi.mock('@/lib/platformClient', () => ({ platform: { functions: { invoke: vi.fn() } } }))

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><UsersPage /></QueryClientProvider>)
}

describe('UsersPage', () => {
  beforeEach(() => { authUser.id = 'me' })

  it('lists users with status and permission chips', () => {
    renderPage()
    expect(screen.getByText('Ada Admin')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  it('shows the stat strip', () => {
    renderPage()
    expect(screen.getByText('Total users')).toBeInTheDocument()
    expect(screen.getByText('Admins & developers')).toBeInTheDocument()
  })

  it('shows action buttons to a manager', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
  })

  it('hides action buttons from staff', () => {
    authUser.id = 'u2'
    renderPage()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('opens the edit modal from the action button', async () => {
    renderPage()
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    // The modal titles its header and its confirm button identically, so match all.
    expect(screen.getAllByText(/Edit User/i).length).toBeGreaterThan(0)
  })

  // The whole point of stopping propagation: Delete must never fire from a row click.
  it('does not open the edit modal when Delete is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1])
    expect(screen.getAllByText(/Delete User/i).length).toBeGreaterThan(0)
    expect(screen.queryAllByText(/Edit User/i)).toHaveLength(0)
  })

  it('narrows on search', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText(/Search users/), 'sam')
    expect(screen.queryByText('Ada Admin')).not.toBeInTheDocument()
    expect(screen.getByText('Sam Staff')).toBeInTheDocument()
  })

  it('offers no export button', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument()
  })
})
