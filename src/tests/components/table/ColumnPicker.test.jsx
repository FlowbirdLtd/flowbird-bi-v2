import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ColumnPicker from '@/components/table/ColumnPicker'

const COLUMNS = [
  { key: 'title', label: 'Title', sticky: true },
  { key: 'value', label: 'Value' },
  { key: 'address', label: 'Deal address' },
]

describe('ColumnPicker', () => {
  it('shows the visible-of-total count on the trigger', () => {
    render(<ColumnPicker columns={COLUMNS} hidden={['address']} onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: /Columns/ })).toHaveTextContent('2/3')
  })

  it('keeps the popover closed until opened', () => {
    render(<ColumnPicker columns={COLUMNS} hidden={[]} onToggle={() => {}} />)
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument()
  })

  it('lists a checkbox per column when opened', async () => {
    render(<ColumnPicker columns={COLUMNS} hidden={['address']} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Columns/ }))
    expect(screen.getByLabelText('Value')).toBeChecked()
    expect(screen.getByLabelText('Deal address')).not.toBeChecked()
  })

  it('disables the pinned column so it cannot be hidden', async () => {
    render(<ColumnPicker columns={COLUMNS} hidden={[]} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Columns/ }))
    expect(screen.getByLabelText(/Title/)).toBeDisabled()
  })

  it('calls onToggle with the column key', async () => {
    const onToggle = vi.fn()
    render(<ColumnPicker columns={COLUMNS} hidden={[]} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: /Columns/ }))
    await userEvent.click(screen.getByLabelText('Deal address'))
    expect(onToggle).toHaveBeenCalledWith('address')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<ColumnPicker columns={COLUMNS} hidden={[]} onToggle={() => {}} />)
    const trigger = screen.getByRole('button', { name: /Columns/ })
    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on an outside click', async () => {
    render(
      <div>
        <ColumnPicker columns={COLUMNS} hidden={[]} onToggle={() => {}} />
        <button>elsewhere</button>
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: /Columns/ }))
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument()
  })
})
