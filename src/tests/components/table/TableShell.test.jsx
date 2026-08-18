import { describe, it, expect } from 'vitest'
import { render, screen, renderHook } from '@testing-library/react'
import TableShell from '@/components/table/TableShell'
import { useTableState } from '@/components/table/useTableState'

const COLUMNS = [
  { key: 'title', label: 'Title', type: 'text', sticky: true },
  { key: 'value', label: 'Value', type: 'gbp' },
]
const ROWS = [{ id: 1, title: 'Ashcombe Wealth', value: '1850000' }]

function useHarnessState() {
  return useTableState({
    rows: ROWS, columns: COLUMNS, storageKey: 'shell',
    searchKeys: ['title'], defaultSort: { key: 'value', dir: 'desc' },
  })
}

const renderShell = (extra = {}) => {
  const { result } = renderHook(useHarnessState)
  return render(
    <TableShell
      title="Deals"
      subtitle="Mirrored from Pipedrive"
      table={result.current}
      columns={COLUMNS}
      getRowKey={r => r.id}
      emptyMessage="No deals found."
      searchPlaceholder="Search deals…"
      {...extra}
    />,
  )
}

describe('TableShell', () => {
  it('renders the title, toolbar, pagination and table together', () => {
    renderShell()
    expect(screen.getByRole('heading', { name: 'Deals' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search deals…')).toBeInTheDocument()
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
  })

  it('renders the stat strip when stats are given', () => {
    renderShell({ stats: [{ label: 'Deals in view', value: '1', meta: 'all active' }] })
    expect(screen.getByText('Deals in view')).toBeInTheDocument()
  })

  it('renders a tabs node when given', () => {
    renderShell({ tabs: <div data-testid="tabs" /> })
    expect(screen.getByTestId('tabs')).toBeInTheDocument()
  })

  it('shows a loading state instead of the table', () => {
    renderShell({ isLoading: true })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('Ashcombe Wealth')).not.toBeInTheDocument()
  })

  it('shows an error state instead of the table', () => {
    renderShell({ error: new Error('relation "deals" does not exist') })
    expect(screen.getByText(/Database error/)).toBeInTheDocument()
    expect(screen.getByText(/relation "deals" does not exist/)).toBeInTheDocument()
  })

  it('omits the export button when no filename is given', () => {
    renderShell()
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument()
  })

  it('offers export when a filename is given', () => {
    renderShell({ exportFilename: 'deals' })
    expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument()
  })
})

describe('TableShell notice', () => {
  it('renders a page-level notice when given', () => {
    renderShell({ notice: 'Delete failed: policy missing.' })
    expect(screen.getByText('Delete failed: policy missing.')).toBeInTheDocument()
  })

  it('renders no notice element when none is given', () => {
    renderShell()
    expect(screen.queryByText(/Delete failed/)).not.toBeInTheDocument()
  })
})
