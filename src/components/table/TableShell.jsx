import { useState } from 'react'
import ExportModal from '../ExportModal'
import PageHeader from '../PageHeader'
import StatStrip from './StatStrip'
import TableToolbar from './TableToolbar'
import Pagination from './Pagination'
import DataTable from './DataTable'
import { useSyncedScroll } from './useSyncedScroll'

/**
 * Card layout shared by every list page. Owns nothing entity-specific — change
 * the chrome here and all four list pages move together.
 *
 * `notice` is a page-level banner slot (e.g. a failed mutation). The shell owns
 * how it looks so pages never restyle it.
 */
export default function TableShell({
  title, subtitle, stats, tabs,
  table, columns, getRowKey, onRowClick, notice,
  emptyMessage, searchPlaceholder, exportFilename,
  isLoading, error, headerAction,
}) {
  const [showExport, setShowExport] = useState(false)
  const { topRef, innerRef, bodyRef, onTopScroll, onBodyScroll } = useSyncedScroll()

  return (
    <div style={{ padding: 24 }}>
      {showExport && (
        <ExportModal
          data={table.filteredRows}
          filename={exportFilename}
          onClose={() => setShowExport(false)}
        />
      )}

      <PageHeader title={title} subtitle={subtitle} action={headerAction} />

      <StatStrip stats={stats} />

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
      }}>
        {notice && (
          <div style={{
            margin: '12px 16px 0', padding: '9px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          }}>
            {notice}
          </div>
        )}

        {tabs}

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder={searchPlaceholder}
          columns={columns}
          hidden={table.hidden}
          onToggleColumn={table.toggleColumn}
          onExport={exportFilename ? () => setShowExport(true) : undefined}
        />

        <Pagination
          range={table.range}
          page={table.page}
          totalPages={table.totalPages}
          perPage={table.perPage}
          onPageChange={table.setPage}
          onPerPageChange={table.setPerPage}
        />

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
        ) : error ? (
          <div style={{
            padding: 32, margin: 16, borderRadius: 'var(--radius-sm)', fontSize: 13,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          }}>
            <strong>Database error:</strong> {error.message}
            <div style={{ marginTop: 8, color: 'var(--ink-soft)' }}>
              Check that schema.sql, seed.sql, and policies.sql have all been run in Supabase.
            </div>
          </div>
        ) : (
          <>
            {/* Horizontal scrollbar above the table, synced with the body below. */}
            <div
              ref={topRef}
              onScroll={onTopScroll}
              style={{ overflowX: 'auto', overflowY: 'hidden', borderBottom: '1px solid var(--line)' }}
            >
              <div ref={innerRef} style={{ height: 1 }} />
            </div>

            <DataTable
              columns={table.visibleColumns}
              rows={table.pageRows}
              getRowKey={getRowKey}
              sort={table.sort}
              onSort={table.toggleSort}
              onRowClick={onRowClick}
              emptyMessage={emptyMessage}
              bodyRef={bodyRef}
              onBodyScroll={onBodyScroll}
            />
          </>
        )}
      </div>
    </div>
  )
}
