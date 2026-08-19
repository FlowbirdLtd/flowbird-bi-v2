import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'

const signOut = vi.fn().mockResolvedValue(undefined)
const navigate = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'ada@x.com' }, signOut }),
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

const renderLayout = () => render(
  <MemoryRouter>
    <AppLayout>
      <div>content</div>
    </AppLayout>
  </MemoryRouter>,
)

describe('AppLayout', () => {
  it('renders Log Out as a real button, not a styled span', async () => {
    renderLayout()
    const logOut = screen.getByRole('button', { name: 'Log Out' })
    expect(logOut.tagName).toBe('BUTTON')

    await userEvent.click(logOut)
    expect(signOut).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('still shows the logged-in user and a link to account settings', () => {
    renderLayout()
    expect(screen.getByText('ada@x.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Account Settings' })).toBeInTheDocument()
  })
})
