import Chip from '@/components/table/Chip'
import { stageTone } from '@/features/deals/columns'
import { formatCell } from '@/components/table/format'

/**
 * Association panels for ContactDetailPage's rail: the deals this contact is
 * linked to, and the organisation it belongs to. Deals join on the text
 * Pipedrive id (deals.contact_id -> contacts.contact_pipedrive_id), so the
 * embed is pulled by useContact and filtered here rather than in Postgres —
 * that keeps the archived-deal rule testable without depending on
 * embed-filter syntax.
 */

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

function renderOrganisationItem(organisation) {
  const status = formatCell(organisation.company_status, 'text')
  const fca = formatCell(organisation.fca_number, 'text')
  const meta = [status, fca].filter(Boolean).join(' · ')

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{organisation.name}</div>
      {meta && (
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{meta}</div>
      )}
    </div>
  )
}

export const PANELS = [
  {
    key: 'deals',
    title: 'Deals',
    items: row => (row.deals || []).filter(deal => !deal.archive_time),
    to: deal => `/deals/${deal.id}`,
    renderItem: renderDealItem,
    emptyMessage: 'No deals linked.',
  },
  {
    key: 'organisation',
    title: 'Organisation',
    items: row => (row.organisation ? [row.organisation] : []),
    to: organisation => `/organisations/${organisation.id}`,
    renderItem: renderOrganisationItem,
    emptyMessage: 'No organisation linked.',
  },
]
