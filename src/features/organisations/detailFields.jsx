/**
 * Field config for OrganisationDetailPage. Grouped into 'Details': identity
 * and public-facing info, then the regulatory pair (labelled — it genuinely
 * aids comprehension to know Authorisation Status and FCA Number sit
 * together), then ownership and record metadata.
 *
 * `date_created` was rendered with plain `val()`, not `formatDate()`, on the
 * original page — unlike Contact and Deal, so it stays type 'text' here.
 */
export const SECTIONS = [
  {
    title: 'Details',
    groups: [
      {
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
        ],
      },
      {
        label: 'Regulatory',
        fields: [
          { key: 'authorisation_status', label: 'Authorisation Status', type: 'text' },
          { key: 'fca_number', label: 'FCA Number', type: 'text' },
        ],
      },
      {
        fields: [
          { key: 'vendor_ownership_structure', label: 'Vendor & Ownership Structure', type: 'text' },
          { key: 'id_urn', label: 'id_urn', type: 'text' },
          { key: 'date_created', label: 'Date Created', type: 'text' },
        ],
      },
    ],
  },
]
