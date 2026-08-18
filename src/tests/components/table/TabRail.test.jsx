import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TabRail from '@/components/table/TabRail'

const TABS = ['All deals', 'Completed', 'Declined']
const COUNTS = { 'All deals': 237, Completed: 32, Declined: 15 }

describe('TabRail', () => {
  it('renders a tab per label with its count', () => {
    render(<TabRail tabs={TABS} active="All deals" counts={COUNTS} onChange={() => {}} />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(screen.getByRole('tab', { name: /Completed/ })).toHaveTextContent('32')
  })

  it('marks the active tab', () => {
    render(<TabRail tabs={TABS} active="Completed" counts={COUNTS} onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /Completed/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Declined/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked tab', async () => {
    const onChange = vi.fn()
    render(<TabRail tabs={TABS} active="All deals" counts={COUNTS} onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /Declined/ }))
    expect(onChange).toHaveBeenCalledWith('Declined')
  })

  it('omits the count when none is supplied', () => {
    render(<TabRail tabs={['Only']} active="Only" counts={{}} onChange={() => {}} />)
    expect(screen.getByRole('tab')).toHaveTextContent(/^Only$/)
  })
})
