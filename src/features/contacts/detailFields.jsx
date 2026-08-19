import { Link } from 'react-router-dom'

/**
 * Field config for ContactDetailPage, mirroring the section/label/order of
 * the pre-shared-table-system page exactly.
 */
export const SECTIONS = [
  {
    title: 'Contact Information',
    fields: [
      { key: 'contact_pipedrive_id', label: 'Contact Pipedrive ID', type: 'text' },
      { key: 'name', label: 'Contact Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      {
        key: 'email', label: 'Email', type: 'text',
        render: contact => (
          <a href={`mailto:${contact.email}`} style={{ color: 'var(--accent)' }}>{contact.email}</a>
        ),
      },
      { key: 'date_created', label: 'Date Created', type: 'date' },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'job_title', label: 'Job Title', type: 'text' },
      {
        key: 'organisation.name', label: 'Organisation', type: 'text',
        render: contact => (
          <Link to={`/organisations/${contact.organisation.id}`} style={{ color: 'var(--accent)' }}>
            {contact.organisation.name}
          </Link>
        ),
      },
    ],
  },
]
