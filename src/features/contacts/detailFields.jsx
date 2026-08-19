import { Link } from 'react-router-dom'

/**
 * Field config for ContactDetailPage. Grouped into 'Contact Information':
 * identity (name, role, organisation), reach (phone, email), then the
 * record-metadata fields that matter least to a first read.
 */
export const SECTIONS = [
  {
    title: 'Contact Information',
    groups: [
      {
        fields: [
          { key: 'name', label: 'Contact Name', type: 'text' },
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
      {
        fields: [
          { key: 'phone', label: 'Phone', type: 'text' },
          {
            key: 'email', label: 'Email', type: 'text',
            render: contact => (
              <a href={`mailto:${contact.email}`} style={{ color: 'var(--accent)' }}>{contact.email}</a>
            ),
          },
        ],
      },
      {
        fields: [
          { key: 'contact_pipedrive_id', label: 'Contact Pipedrive ID', type: 'text' },
          { key: 'date_created', label: 'Date Created', type: 'date' },
          { key: 'age', label: 'Age', type: 'number' },
        ],
      },
    ],
  },
]
