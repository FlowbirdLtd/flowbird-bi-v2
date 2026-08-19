import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BoardView from '@/components/board/BoardView'

const STAGES = ['Introduction', 'Offer Made', 'Completed']

const DEALS = [
  { id: 'a', title: 'Ashcombe Wealth', stage: 'Offer Made', value: '1850000', owner: 'Helen Brooks' },
  { id: 'b', title: 'Barwell Financial', stage: 'Offer Made', value: '350000', owner: 'Helen Brooks' },
  { id: 'c', title: 'Callaghan Advisers', stage: 'Completed', value: '4200000', owner: 'Douglas Vine' },
]

const renderBoard = (extra = {}) => {
  const onCardClick = vi.fn()
  const utils = render(
    <BoardView
      deals={DEALS}
      columns={STAGES}
      onCardClick={onCardClick}
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search deals…"
      {...extra}
    />,
  )
  return { onCardClick, ...utils }
}

describe('BoardView', () => {
  it('groups deals into the correct stage columns', () => {
    renderBoard()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('Barwell Financial')).toBeInTheDocument()
    expect(screen.getByText('Callaghan Advisers')).toBeInTheDocument()
  })

  it("shows a column's header count and summed value", () => {
    renderBoard()
    // Offer Made carries two deals summing to £2.2m.
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('£2.2m')).toBeInTheDocument()
  })

  it('renders a placeholder for a stage with no deals rather than collapsing it', () => {
    renderBoard()
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    expect(screen.getByText('No deals in this stage.')).toBeInTheDocument()
  })

  it('renders one column per stage, in the given order', () => {
    renderBoard()
    const headers = STAGES.map(stage => screen.getByText(stage))
    expect(headers).toHaveLength(3)
  })

  it('calls onCardClick with the deal when a card is activated', async () => {
    const { onCardClick } = renderBoard()
    await userEvent.click(screen.getByText('Ashcombe Wealth'))
    expect(onCardClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('wires the search input to the given value and change handler', async () => {
    const onSearchChange = vi.fn()
    renderBoard({ searchValue: '', onSearchChange })
    await userEvent.type(screen.getByPlaceholderText('Search deals…'), 'x')
    expect(onSearchChange).toHaveBeenCalledWith('x')
  })
})
