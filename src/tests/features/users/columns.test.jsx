import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { userColumns, userStats } from '@/features/users/columns'

const USER = { id: 'u1', name: 'Ada', email: 'ada@x.com', user_status: 'active', user_permissions: ['Admin'] }

describe('userColumns', () => {
  it('omits the action column when the viewer cannot manage', () => {
    const columns = userColumns({ canManage: false, onEdit: () => {}, onDelete: () => {} })
    expect(columns.map(c => c.key)).toEqual(['name', 'email', 'user_status', 'user_permissions'])
  })

  it('adds a pinned, always-visible action column when the viewer can manage', () => {
    const columns = userColumns({ canManage: true, onEdit: () => {}, onDelete: () => {} })
    const actions = columns.find(c => c.key === 'actions')
    expect(actions.alwaysVisible).toBe(true)
    expect(actions.sortable).toBe(false)
  })

  it('wires the action buttons to their handlers', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const columns = userColumns({ canManage: true, onEdit, onDelete })
    render(<div>{columns.find(c => c.key === 'actions').render(USER)}</div>)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith(USER)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(USER)
  })

  it('keeps the reset-password button inert, as it is today', async () => {
    const columns = userColumns({ canManage: true, onEdit: vi.fn(), onDelete: vi.fn() })
    render(<div>{columns.find(c => c.key === 'actions').render(USER)}</div>)
    const reset = screen.getByRole('button', { name: /Reset/ })
    expect(reset).toBeInTheDocument()
    await userEvent.click(reset)  // must not throw
  })
})

describe('userStats', () => {
  const rows = [
    { user_status: 'active', user_permissions: ['Admin'] },
    { user_status: 'active', user_permissions: ['Staff'] },
    { user_status: 'pending', user_permissions: ['Developer'] },
  ]

  it('counts total, active, pending and elevated users', () => {
    expect(userStats(rows).map(s => s.value)).toEqual(['3', '2', '1', '2'])
  })

  it('tolerates a missing permissions array', () => {
    expect(userStats([{ user_status: 'active' }]).map(s => s.value)).toEqual(['1', '1', '0', '0'])
  })

  it('handles an empty set', () => {
    expect(userStats([]).map(s => s.value)).toEqual(['0', '0', '0', '0'])
  })
})
