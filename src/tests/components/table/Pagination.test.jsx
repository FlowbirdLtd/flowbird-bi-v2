import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from '@/components/table/Pagination'

const props = {
  range: { start: 1, end: 25, total: 237 },
  page: 1, totalPages: 10, perPage: 25,
  onPageChange: () => {}, onPerPageChange: () => {},
}

describe('Pagination', () => {
  it('states the visible range', () => {
    render(<Pagination {...props} />)
    expect(screen.getByText('Showing 1–25 of 237')).toBeInTheDocument()
  })

  it('states when there is nothing to show', () => {
    render(<Pagination {...props} range={{ start: 0, end: 0, total: 0 }} totalPages={1} />)
    expect(screen.getByText('No rows to show')).toBeInTheDocument()
  })

  it('disables previous on the first page', () => {
    render(<Pagination {...props} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
  })

  it('disables next on the last page', () => {
    render(<Pagination {...props} page={10} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('advances the page', async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...props} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('changes rows per page', async () => {
    const onPerPageChange = vi.fn()
    render(<Pagination {...props} onPerPageChange={onPerPageChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '50')
    expect(onPerPageChange).toHaveBeenCalledWith(50)
  })
})
