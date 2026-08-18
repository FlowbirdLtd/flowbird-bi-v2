import Chip from '@/components/table/Chip'
import { formatCell } from '@/components/table/format'

/** Colour ramp following pipeline progress. Red is reserved for Declined. */
const STAGE_TONES = {
  'Introduction': 'neutral',
  'First Meeting Booked': 'neutral',
  'First Meeting Held': 'blue',
  'Offer Made': 'blue',
  'HoTs Issued': 'amber',
  'HoTs Signed': 'amber',
  'Exchanged': 'teal',
  'Completed': 'green',
  'Declined': 'red',
}

export function stageTone(stage) {
  return STAGE_TONES[stage] || 'neutral'
}

/** Tab labels are matched against deals.stage, so their casing is data, not copy. */
export const DEAL_TABS = [
  'All Deals', 'Completed', 'Exchanged', 'HoTs Signed', 'HoTs Issued', 'Offer Made',
  'First Meeting Held', 'First Meeting Booked', 'Introduction', 'Declined', 'Archived',
]

/**
 * Archived is driven by archive_time being set in Pipedrive. Archived deals
 * appear under the Archived tab and nowhere else.
 */
export function dealFilter(tab) {
  return deal => {
    const archived = !!deal.archive_time
    if (tab === 'Archived') return archived
    if (archived) return false
    return tab === 'All Deals' || deal.stage === tab
  }
}

export const DEAL_COLUMNS = [
  { key: 'title', label: 'Title', type: 'text', sticky: true, width: 268 },
  { key: 'value', label: 'Value', type: 'gbp' },
  { key: 'contact.name', label: 'Contact name', type: 'text' },
  { key: 'introductory_company', label: 'Introductory company', type: 'text' },
  {
    key: 'stage', label: 'Stage', type: 'text',
    render: deal => (
      <Chip
        label={deal.archive_time ? 'Archived' : deal.stage}
        tone={deal.archive_time ? 'neutral' : stageTone(deal.stage)}
      />
    ),
  },
  { key: 'owner', label: 'Owner', type: 'text' },
  { key: 'latest_status_acquisition_committee', label: 'Latest status (AC)', type: 'text', wrap: true },
  { key: 'deal_exchanged_date', label: 'Exchanged date', type: 'date' },
  { key: 'deal_complete_date', label: 'Complete date', type: 'date' },
  { key: 'assets_under_advice', label: 'Assets under advice', type: 'gbpShort' },
  { key: 'forecast_recurring_income', label: 'Forecast recurring income', type: 'gbp' },
  { key: 'completion_payment', label: 'Completion payment', type: 'gbp' },
  { key: 'headline_consideration', label: 'Headline consideration', type: 'gbp' },
  { key: 'ebitda_multiple', label: 'EBITDA multiple', type: 'multiple' },
  { key: 'deal_address', label: 'Deal address', type: 'text', wrap: true, defaultHidden: true },
]

const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)

export function dealStats(rows) {
  const inProgress = rows.filter(r => !['Completed', 'Declined'].includes(r.stage) && !r.archive_time)
  const multiples = rows.map(r => Number(r.ebitda_multiple)).filter(n => Number.isFinite(n) && n > 0)
  const average = multiples.length
    ? multiples.reduce((a, b) => a + b, 0) / multiples.length
    : null

  return [
    {
      label: 'Deals in view',
      value: String(rows.length),
      meta: `${inProgress.length} still in progress`,
    },
    {
      label: 'Combined value',
      value: formatCell(sum(rows, 'value'), 'gbpShort'),
      meta: 'Sum of deal value',
    },
    {
      label: 'Assets under advice',
      value: formatCell(sum(rows, 'assets_under_advice'), 'gbpShort'),
      meta: 'Across all deals in view',
    },
    {
      label: 'Avg EBITDA multiple',
      value: average === null ? null : formatCell(average, 'multiple'),
      meta: multiples.length ? `${multiples.length} deals priced` : 'None priced yet',
    },
  ]
}
