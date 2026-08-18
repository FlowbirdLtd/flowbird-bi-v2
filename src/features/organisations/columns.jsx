
export const ORGANISATION_COLUMNS = [
  { key: 'name', label: 'Organisation', type: 'text', sticky: true, width: 260 },
  { key: 'address', label: 'Address', type: 'text', wrap: true },
  { key: 'company_status', label: 'Company status', type: 'text' },
  {
    key: 'website', label: 'Website', type: 'text',
    render: org => org.website
      ? <a href={org.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{org.website}</a>
      : null,
  },
  {
    key: 'contacts', label: 'Contacts', type: 'text', sortable: false, wrap: true,
    render: org => (org.contacts || []).map(c => c.name).join(', ') || null,
  },
  { key: 'authorisation_status', label: 'Authorisation status', type: 'text', defaultHidden: true },
  { key: 'fca_number', label: 'FCA number', type: 'text', defaultHidden: true },
]

const share = (count, total) => total === 0 ? 'No organisations yet' : `${Math.round((count / total) * 100)}% of organisations`

export function organisationStats(rows) {
  const total = rows.length
  const authorised = rows.filter(o => o.authorisation_status).length
  const withFca = rows.filter(o => o.fca_number).length
  const withContacts = rows.filter(o => (o.contacts || []).length > 0).length

  return [
    { label: 'Total organisations', value: String(total), meta: 'In the Pipedrive mirror' },
    { label: 'Authorised', value: String(authorised), meta: share(authorised, total) },
    { label: 'With an FCA number', value: String(withFca), meta: share(withFca, total) },
    { label: 'With a contact', value: String(withContacts), meta: share(withContacts, total) },
  ]
}
