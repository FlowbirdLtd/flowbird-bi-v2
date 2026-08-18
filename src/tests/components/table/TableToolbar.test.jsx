import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TableToolbar from '@/components/table/TableToolbar'

const COLUMNS = [{ key: 'title', label: 'Title', sticky: true }, { key: 'value', label: 'Value' }]

const props = {
  search: '', onSearchChange: () => {}, searchPlaceholder: 'Search deals…',
  columns: COLUMNS, hidden: [], onToggleColumn: () => {},
}

describe('TableToolbar', () => {
  it('renders the search box with its placeholder', () => {
    render(<TableToolbar {...props} />)
    expect(screen.getByPlaceholderText('Search deals…')).toBeInTheDocument()
  })

  it('reports every keystroke', async () => {
    const onSearchChange = vi.fn()
    render(<TableToolbar {...props} onSearchChange={onSearchChange} />)
    await userEvent.type(screen.getByPlaceholderText('Search deals…'), 'ab')
    expect(onSearchChange).toHaveBeenCalledTimes(2)
    expect(onSearchChange).toHaveBeenLastCalledWith('b')
  })

  it('renders an export button when onExport is given', async () => {
    const onExport = vi.fn()
    render(<TableToolbar {...props} onExport={onExport} />)
    await userEvent.click(screen.getByRole('button', { name: /Export/ }))
    expect(onExport).toHaveBeenCalled()
  })

  it('omits the export button when onExport is absent', () => {
    render(<TableToolbar {...props} />)
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument()
  })

  it('renders the column picker', () => {
    render(<TableToolbar {...props} />)
    expect(screen.getByRole('button', { name: /Columns/ })).toBeInTheDocument()
  })
})
