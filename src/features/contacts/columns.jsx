
export const CONTACT_COLUMNS = [
  { key: 'name', label: 'Contact name', type: 'text', sticky: true, width: 240 },
  {
    key: 'email', label: 'Email', type: 'text',
    render: contact => contact.email
      ? <a href={`mailto:${contact.email}`} style={{ color: 'var(--accent)' }}>{contact.email}</a>
      : null,
  },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'organisation.name', label: 'Organisation', type: 'text' },
  { key: 'job_title', label: 'Job title', type: 'text', defaultHidden: true },
  { key: 'date_created', label: 'Date created', type: 'date', defaultHidden: true },
]

const share = (count, total) => total === 0 ? 'No contacts yet' : `${Math.round((count / total) * 100)}% of contacts`

export function contactStats(rows) {
  const total = rows.length
  const linked = rows.filter(c => c.organisation_id).length
  const withEmail = rows.filter(c => c.email).length
  const withPhone = rows.filter(c => c.phone).length

  return [
    { label: 'Total contacts', value: String(total), meta: 'In the Pipedrive mirror' },
    { label: 'Linked to an org', value: String(linked), meta: share(linked, total) },
    { label: 'With an email', value: String(withEmail), meta: share(withEmail, total) },
    { label: 'With a phone', value: String(withPhone), meta: share(withPhone, total) },
  ]
}
