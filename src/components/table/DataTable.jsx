import { formatCell, getValue, EMPTY } from './format'

const NUMERIC_ALIGN = new Set(['gbp', 'gbpShort', 'multiple', 'number'])

function isNumeric(column) {
  return column.align === 'right' || NUMERIC_ALIGN.has(column.type)
}

function headerStyle(column) {
  return {
    position: 'sticky', top: 0, zIndex: column.sticky ? 30 : 20,
    background: 'var(--surface-alt)', color: 'var(--ink-faint)',
    fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
    letterSpacing: '.085em', textTransform: 'uppercase',
    textAlign: isNumeric(column) ? 'right' : 'left',
    padding: '11px 14px', whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--line-strong)',
    ...(column.sticky ? { left: 0, boxShadow: 'var(--shadow-rail)', minWidth: column.width || 268 } : {}),
    ...(column.width && !column.sticky ? { minWidth: column.width } : {}),
  }
}

function cellStyle(column) {
  return {
    padding: '0 14px', height: 46, borderBottom: '1px solid var(--line)',
    color: 'var(--text)', verticalAlign: 'middle',
    textAlign: isNumeric(column) ? 'right' : 'left',
    whiteSpace: column.wrap ? 'normal' : 'nowrap',
    ...(column.wrap ? { minWidth: 280, maxWidth: 340, lineHeight: 1.4, fontSize: 12.5, color: 'var(--ink-soft)' } : {}),
    ...(isNumeric(column)
      ? { fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }
      : {}),
    ...(column.sticky
      ? { position: 'sticky', left: 0, zIndex: 25, background: 'var(--surface)',
          boxShadow: 'var(--shadow-rail)', minWidth: column.width || 268, fontWeight: 600 }
      : {}),
  }
}

export default function DataTable({
  columns, rows, getRowKey,
  sort, onSort, onRowClick,
  emptyMessage, bodyRef, onBodyScroll,
}) {
  return (
    <div
      ref={bodyRef}
      onScroll={onBodyScroll}
      className="hide-h-scrollbar"
      style={{ overflow: 'auto', maxHeight: '62vh' }}
    >
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(column => {
              const sorted = sort?.key === column.key
              const sortable = column.sortable !== false
              return (
                <th
                  key={column.key}
                  style={headerStyle(column)}
                  {...(sorted ? { 'aria-sort': sort.dir === 'asc' ? 'ascending' : 'descending' } : {})}
                >
                  {sortable ? (
                    <button
                      onClick={() => onSort(column.key)}
                      style={{
                        font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit',
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: sorted ? 'var(--accent)' : 'inherit',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {column.label}
                      <span aria-hidden="true" style={{ fontSize: 9, opacity: sorted ? 1 : 0.25 }}>
                        {sorted && sort.dir === 'asc' ? '▲' : '▼'}
                      </span>
                    </button>
                  ) : column.label}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map(row => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? event => {
                // Buttons and links inside a row own their own click.
                if (event.target.closest('button, a, input, select')) return
                onRowClick(row)
              } : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map(column => {
                const formatted = column.render
                  ? column.render(row)
                  : formatCell(getValue(row, column.key), column.type)
                const empty = formatted === null || formatted === undefined
                return (
                  <td
                    key={column.key}
                    style={{ ...cellStyle(column), ...(empty ? { color: 'var(--ink-faint)' } : {}) }}
                  >
                    {empty ? EMPTY : formatted}
                  </td>
                )
              })}
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: 56, textAlign: 'center', color: 'var(--ink-soft)' }}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
