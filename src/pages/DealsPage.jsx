import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeals } from '../hooks/useDeals'
import TableShell from '../components/table/TableShell'
import TabRail from '../components/table/TabRail'
import PageHeader from '../components/PageHeader'
import StatStrip from '../components/table/StatStrip'
import { useTableState } from '../components/table/useTableState'
import { getValue } from '../components/table/format'
import { DEAL_COLUMNS, DEAL_TABS, DEAL_STAGES, dealFilter, dealStats } from '../features/deals/columns'
import BoardView from '../components/board/BoardView'
import ViewToggle from '../components/board/ViewToggle'
import { readView, writeView } from '../components/board/viewStorage'

const SEARCH_KEYS = ['title', 'contact.name', 'owner', 'introductory_company', 'stage']

export default function DealsPage() {
  const { data: deals = [], isLoading, isError, error } = useDeals()
  const navigate = useNavigate()
  const [tab, setTab] = useState('All Deals')
  const [view, setViewRaw] = useState(readView)
  const [boardSearch, setBoardSearch] = useState('')

  function setView(next) {
    setViewRaw(next)
    writeView(next)
  }

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

  // Board mode always reflects "All Deals" — archived deals excluded, no
  // single-stage narrowing — regardless of whatever tab the table view was
  // last left on, since the stage tabs are hidden while the board is shown.
  const boardDeals = useMemo(() => {
    const active = deals.filter(dealFilter('All Deals'))
    const term = boardSearch.trim().toLowerCase()
    if (!term) return active
    return active.filter(deal =>
      SEARCH_KEYS.some(key => String(getValue(deal, key) ?? '').toLowerCase().includes(term)),
    )
  }, [deals, boardSearch])

  const viewToggle = <ViewToggle view={view} onChange={setView} />

  if (view === 'board') {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader title="Deals" subtitle="Every deal in the pipeline, mirrored from Pipedrive" action={viewToggle} />
        <StatStrip stats={dealStats(boardDeals)} />

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
        ) : isError ? (
          <div style={{
            padding: 32, borderRadius: 'var(--radius-sm)', fontSize: 13,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          }}>
            <strong>Database error:</strong> {error.message}
            <div style={{ marginTop: 8, color: 'var(--ink-soft)' }}>
              Check that schema.sql, seed.sql, and policies.sql have all been run in Supabase.
            </div>
          </div>
        ) : (
          <BoardView
            deals={boardDeals}
            columns={DEAL_STAGES}
            onCardClick={deal => navigate(`/deals/${deal.id}`)}
            searchValue={boardSearch}
            onSearchChange={setBoardSearch}
            searchPlaceholder="Search deals, contacts, owners…"
          />
        )}
      </div>
    )
  }

  return (
    <TableShell
      title="Deals"
      subtitle="Every deal in the pipeline, mirrored from Pipedrive"
      stats={dealStats(table.filteredRows)}
      headerAction={viewToggle}
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
