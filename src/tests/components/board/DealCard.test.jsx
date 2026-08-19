import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DealCard from '@/components/board/DealCard'

const DEAL = {
  id: 'a', title: 'Ashcombe Wealth', value: '1850000', owner: 'Helen Brooks',
  ebitda_multiple: '7.1', organisation: { name: 'Ashcombe Holdings Ltd' },
}

describe('DealCard', () => {
  it('renders the title, organisation, value, owner and multiple', () => {
    render(<DealCard deal={DEAL} onClick={() => {}} />)
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('Ashcombe Holdings Ltd')).toBeInTheDocument()
    expect(screen.getByText('£1,850,000')).toBeInTheDocument()
    expect(screen.getByText('Helen Brooks')).toBeInTheDocument()
    expect(screen.getByText('7.1×')).toBeInTheDocument()
  })

  it('renders the empty-value placeholder rather than a blank gap for missing fields', () => {
    render(<DealCard deal={{ id: 'b', title: 'No Owner Deal', value: '', owner: null, organisation: null }} onClick={() => {}} />)
    // Organisation and owner are both missing — both should fall back to the EMPTY glyph.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('omits the EBITDA multiple field entirely when it is not present', () => {
    render(<DealCard deal={{ id: 'c', title: 'No Multiple', value: '100', ebitda_multiple: '' }} onClick={() => {}} />)
    expect(screen.queryByText('EBITDA multiple')).not.toBeInTheDocument()
  })

  it('is a real interactive control that calls onClick with the deal on activation', async () => {
    const onClick = vi.fn()
    render(<DealCard deal={DEAL} onClick={onClick} />)
    const control = screen.getByRole('button')
    await userEvent.click(control)
    expect(onClick).toHaveBeenCalledWith(DEAL)
  })
})
