import { useState } from 'react'
import ExportModal from '../ExportModal'
import StatStrip from './StatStrip'
import TableToolbar from './TableToolbar'
import Pagination from './Pagination'
import DataTable from './DataTable'
import { useSyncedScroll } from './useSyncedScroll'

/**
 * Card layout shared by every list page. Owns nothing entity-specific — change
 * the chrome here and all four list pages move together.
 */
export default function TableShell({
  title, subtitle, stats, tabs,
  table, columns, getRowKey, onRowClick,
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

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.022em', color: 'var(--text)' }}>
            {title}
          </h1>
          {subtitle && <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ flex: '1 1 auto' }} />
        {headerAction}
      </div>

      <StatStrip stats={stats} />

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
      }}>
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
            padding: 32, margin: 16, borderRadius: 6, fontSize: 13,
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
