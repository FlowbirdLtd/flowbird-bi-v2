import { formatCell } from '@/components/table/format'

/**
 * Related-records rail for DealDetailPage. `useDeal` embeds the full contact
 * and organisation rows (`contact:contacts(*)`, `organisation:organisations(*)`),
 * so each panel just re-presents the single linked record as a card — richer
 * than the plain link already shown in the Summary section, and consistent
 * with the record-card contract RelatedPanel expects (an array of items with
 * an `id`).
 */

/** One secondary attribute line, e.g. "Financial Adviser" or "FCA 123456". Omits null/blank values. */
function attr(value) {
  const formatted = formatCell(value, 'text')
  return formatted
}

export const PANELS = [
  {
    key: 'contact',
    title: 'Contact',
    items: row => (row.contact ? [row.contact] : []),
    to: item => `/contacts/${item.id}`,
    emptyMessage: 'No contact linked.',
    renderItem: item => {
      const jobTitle = attr(item.job_title)
      const email = attr(item.email)
      const phone = attr(item.phone)
      return (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.name}</div>
          {jobTitle && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{jobTitle}</div>
          )}
          {email && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{email}</div>
          )}
          {phone && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{phone}</div>
          )}
        </div>
      )
    },
  },
  {
    key: 'organisation',
    title: 'Organisation',
    items: row => (row.organisation ? [row.organisation] : []),
    to: item => `/organisations/${item.id}`,
    emptyMessage: 'No organisation linked.',
    renderItem: item => {
      const status = attr(item.company_status)
      const fca = attr(item.fca_number)
      const authorisation = attr(item.authorisation_status)
      return (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.name}</div>
          {status && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{status}</div>
          )}
          {fca && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>FCA {fca}</div>
          )}
          {authorisation && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{authorisation}</div>
          )}
        </div>
      )
    },
  },
]
