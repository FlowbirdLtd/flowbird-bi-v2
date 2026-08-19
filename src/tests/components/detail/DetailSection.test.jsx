import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DetailSection from '@/components/detail/DetailSection'

const SECTION = {
  title: 'Summary',
  groups: [
    {
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'value', label: 'Value', type: 'gbp' },
      ],
    },
    {
      label: 'Commentary',
      fields: [{ key: 'notes', label: 'Notes', type: 'text', wide: true }],
    },
  ],
}

describe('DetailSection', () => {
  it('renders a populated field with its formatted value', () => {
    render(<DetailSection section={SECTION} row={{ title: 'Ashcombe Wealth', value: '1850000' }} showEmpty={false} />)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Ashcombe Wealth')).toBeInTheDocument()
    expect(screen.getByText('£1,850,000')).toBeInTheDocument()
  })

  it('does not render an empty field by default', () => {
    render(<DetailSection section={SECTION} row={{ title: 'Ashcombe Wealth' }} showEmpty={false} />)
    expect(screen.queryByText('Value')).not.toBeInTheDocument()
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })

  it('shows a hidden-field count when some fields are empty and the toggle is off', () => {
    render(<DetailSection section={SECTION} row={{ title: 'Ashcombe Wealth' }} showEmpty={false} />)
    expect(screen.getByText('2 empty')).toBeInTheDocument()
  })

  it('omits the hidden-field count once nothing is hidden', () => {
    render(<DetailSection section={SECTION} row={{ title: 'A', value: '1', notes: 'n' }} showEmpty={false} />)
    expect(screen.queryByText(/empty$/)).not.toBeInTheDocument()
  })

  it('renders nothing at all when every field is empty and the toggle is off', () => {
    const { container } = render(<DetailSection section={SECTION} row={{}} showEmpty={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reveals empty fields as the em dash when the toggle is on', () => {
    render(<DetailSection section={SECTION} row={{ title: 'Ashcombe Wealth' }} showEmpty />)
    expect(screen.getByText('Value')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('renders the section even when everything is empty, once the toggle is on', () => {
    render(<DetailSection section={SECTION} row={{}} showEmpty />)
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(3)
  })

  it('treats £0 as empty, matching the table system ("not priced yet")', () => {
    render(<DetailSection section={SECTION} row={{ title: 'A', value: 0 }} showEmpty={false} />)
    expect(screen.queryByText('Value')).not.toBeInTheDocument()
  })
})
