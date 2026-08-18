import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeals } from '../hooks/useDeals'
import TableShell from '../components/table/TableShell'
import TabRail from '../components/table/TabRail'
import { useTableState } from '../components/table/useTableState'
import { DEAL_COLUMNS, DEAL_TABS, dealFilter, dealStats } from '../features/deals/columns'

const SEARCH_KEYS = ['title', 'contact.name', 'owner', 'introductory_company', 'stage']

export default function DealsPage() {
  const { data: deals = [], isLoading, isError, error } = useDeals()
  const navigate = useNavigate()
  const [tab, setTab] = useState('All Deals')

  const filter = useMemo(() => dealFilter(tab), [tab])

  const table = useTableState({
    rows: deals,
    columns: DEAL_COLUMNS,
    storageKey: 'deals',
    searchKeys: SEARCH_KEYS,
    defaultSort: { key: 'value', dir: 'desc' },
    defaultPerPage: 25,
    filter,
  })

  const counts = useMemo(
    () => Object.fromEntries(DEAL_TABS.map(t => [t, deals.filter(dealFilter(t)).length])),
    [deals],
  )

  return (
    <TableShell
      title="Deals"
      subtitle="Mirrored from Pipedrive"
      stats={dealStats(table.filteredRows)}
      tabs={
        <TabRail
          tabs={DEAL_TABS}
          active={tab}
          counts={counts}
          onChange={next => { setTab(next); table.setPage(1) }}
        />
      }
      table={table}
      columns={DEAL_COLUMNS}
      getRowKey={deal => deal.id}
      onRowClick={deal => navigate(`/deals/${deal.id}`)}
      emptyMessage="No deals found."
      searchPlaceholder="Search deals, contacts, owners…"
      exportFilename="deals"
      isLoading={isLoading}
      error={isError ? error : null}
    />
  )
}
