import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Chip from '@/components/table/Chip'

describe('Chip', () => {
  it('renders its label', () => {
    render(<Chip label="Offer Made" tone="blue" />)
    expect(screen.getByText('Offer Made')).toBeInTheDocument()
  })

  it('uses the tone tokens', () => {
    render(<Chip label="Declined" tone="red" />)
    const chip = screen.getByText('Declined').closest('span')
    expect(chip).toHaveStyle({ background: 'var(--chip-red-bg)' })
  })

  it('falls back to the neutral tone', () => {
    render(<Chip label="Unknown" />)
    const chip = screen.getByText('Unknown').closest('span')
    expect(chip).toHaveStyle({ background: 'var(--chip-neutral-bg)' })
  })
})
