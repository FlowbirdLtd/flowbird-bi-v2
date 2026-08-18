import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from '@/components/table/DataTable'

const COLUMNS = [
  { key: 'title', label: 'Title', type: 'text', sticky: true },
  { key: 'value', label: 'Value', type: 'gbp', align: 'right' },
  { key: 'stage', label: 'Stage', render: row => <em>{row.stage}</em> },
]

const ROWS = [
  { id: 1, title: 'Ashcombe Wealth', value: '1850000', stage: 'Offer Made' },
  { id: 2, title: 'Barwell Financial', value: '', stage: 'Completed' },
]

const props = {
  columns: COLUMNS, rows: ROWS, getRowKey: r => r.id,
  sort: { key: 'value', dir: 'desc' }, onSort: () => {},
  emptyMessage: 'No deals found.',
}

describe('DataTable', () => {
  it('renders a header per configured column', () => {
    render(<DataTable {...props} />)
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
  })

  it('formats cells by type', () => {
    render(<DataTable {...props} />)
    expect(screen.getByText('£1,850,000')).toBeInTheDocument()
  })

  it('renders an em dash for an empty value', () => {
    render(<DataTable {...props} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('uses a custom render when the column supplies one', () => {
    render(<DataTable {...props} />)
    expect(screen.getByText('Offer Made').tagName).toBe('EM')
  })

  it('marks the sorted column with aria-sort', () => {
    render(<DataTable {...props} />)
    expect(screen.getByRole('columnheader', { name: /Value/ })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: /Title/ })).not.toHaveAttribute('aria-sort')
  })

  it('calls onSort with the column key when a header is clicked', async () => {
    const onSort = vi.fn()
    render(<DataTable {...props} onSort={onSort} />)
    await userEvent.click(screen.getByRole('button', { name: /Title/ }))
    expect(onSort).toHaveBeenCalledWith('title')
  })

  it('does not make a sortable button for sortable: false', () => {
    const columns = [{ key: 'title', label: 'Title', sortable: false }]
    render(<DataTable {...props} columns={columns} />)
    expect(screen.queryByRole('button', { name: /Title/ })).not.toBeInTheDocument()
  })

  it('calls onRowClick with the row', async () => {
    const onRowClick = vi.fn()
    render(<DataTable {...props} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Ashcombe Wealth'))
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0])
  })

  // Destructive controls live in rows; a stray row click must never fire them.
  it('does not fire onRowClick when a control inside the row is clicked', async () => {
    const onRowClick = vi.fn()
    const onDelete = vi.fn()
    const columns = [
      { key: 'title', label: 'Title', sticky: true },
      { key: 'actions', label: '', sortable: false, render: () => <button onClick={onDelete}>Delete</button> },
    ]
    render(<DataTable {...props} columns={columns} onRowClick={onRowClick} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(onDelete).toHaveBeenCalled()
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('shows the empty message when there are no rows', () => {
    render(<DataTable {...props} rows={[]} />)
    expect(screen.getByText('No deals found.')).toBeInTheDocument()
  })
})
