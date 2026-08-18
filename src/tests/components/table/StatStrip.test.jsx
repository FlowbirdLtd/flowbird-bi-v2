import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatStrip from '@/components/table/StatStrip'

const STATS = [
  { label: 'Deals in view', value: '237', meta: '184 still in progress' },
  { label: 'Combined value', value: '£500.9m', meta: 'Sum of deal value' },
]

describe('StatStrip', () => {
  it('renders a card per stat', () => {
    render(<StatStrip stats={STATS} />)
    expect(screen.getByText('Deals in view')).toBeInTheDocument()
    expect(screen.getByText('£500.9m')).toBeInTheDocument()
    expect(screen.getByText('184 still in progress')).toBeInTheDocument()
  })

  it('renders a dash for a null value', () => {
    render(<StatStrip stats={[{ label: 'Avg multiple', value: null, meta: 'None priced yet' }]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders nothing when there are no stats', () => {
    const { container } = render(<StatStrip stats={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
