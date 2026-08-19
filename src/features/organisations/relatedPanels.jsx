import Chip from '@/components/table/Chip'
import { stageTone } from '@/features/deals/columns'
import { formatCell } from '@/components/table/format'

/**
 * Association panels for OrganisationDetailPage's rail: the contacts and
 * deals linked to this organisation. Both join on the text Pipedrive id
 * (contacts.organisation_id / deals.organisation_id -> org_pipedrive_id), so
 * the embeds are pulled by useOrganisation and archived deals are filtered
 * here rather than in Postgres — that keeps the rule testable without
 * depending on embed-filter syntax.
 */

function renderContactItem(contact) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{contact.name}</div>
      {contact.job_title && (
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{contact.job_title}</div>
      )}
    </div>
  )
}

function renderDealItem(deal) {
  const value = formatCell(deal.value, 'gbp')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{deal.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Chip label={deal.stage} tone={stageTone(deal.stage)} />
        {value && (
          <span
            style={{
              fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums',
              fontSize: 12, color: 'var(--ink-soft)',
            }}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

export const PANELS = [
  {
    key: 'contacts',
    title: 'Contacts',
    items: row => row.contacts || [],
    to: contact => `/contacts/${contact.id}`,
    renderItem: renderContactItem,
    emptyMessage: 'No contacts linked.',
  },
  {
    key: 'deals',
    title: 'Deals',
    items: row => (row.deals || []).filter(deal => !deal.archive_time),
    to: deal => `/deals/${deal.id}`,
    renderItem: renderDealItem,
    emptyMessage: 'No deals linked.',
  },
]
