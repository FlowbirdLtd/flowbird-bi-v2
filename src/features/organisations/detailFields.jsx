/**
 * Field config for OrganisationDetailPage, mirroring the pre-shared-table-
 * system page exactly. The linked-contacts list is not a scalar field, so it
 * is rendered separately by the page itself, not through this config.
 *
 * `date_created` was rendered with plain `val()`, not `formatDate()`, on the
 * original page — unlike Contact and Deal, so it stays type 'text' here.
 */
export const SECTIONS = [
  {
    title: 'Details',
    fields: [
      { key: 'name', label: 'Organisation Name', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'company_status', label: 'Company Status', type: 'text' },
      {
        key: 'website', label: 'Website', type: 'text',
        render: org => (
          <a href={org.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            {org.website}
          </a>
        ),
      },
      { key: 'vendor_ownership_structure', label: 'Vendor & Ownership Structure', type: 'text' },
      { key: 'authorisation_status', label: 'Authorisation Status', type: 'text' },
      { key: 'fca_number', label: 'FCA Number', type: 'text' },
      { key: 'id_urn', label: 'id_urn', type: 'text' },
      { key: 'date_created', label: 'Date Created', type: 'text' },
    ],
  },
]
