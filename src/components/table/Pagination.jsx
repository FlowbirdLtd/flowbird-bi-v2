function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

const stepButton = disabled => ({
  font: 'inherit', cursor: disabled ? 'default' : 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--line-strong)', background: 'var(--surface)',
  color: 'var(--ink-soft)', opacity: disabled ? 0.4 : 1,
})

export default function Pagination({
  range, page, totalPages, perPage,
  perPageOptions = [10, 25, 50, 100],
  onPageChange, onPerPageChange,
}) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
      padding: '9px 16px', borderBottom: '1px solid var(--line)',
      fontSize: 12.5, color: 'var(--ink-soft)',
    }}>
      <span>
        {range.total === 0
          ? 'No rows to show'
          : `Showing ${range.start}–${range.end} of ${range.total}`}
      </span>

      <div style={{ flex: '1 1 auto' }} />

      <select
        aria-label="Rows per page"
        value={perPage}
        onChange={e => onPerPageChange(Number(e.target.value))}
        style={{
          font: 'inherit', fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)',
          border: '1px solid var(--line-strong)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
        }}
      >
        {perPageOptions.map(n => <option key={n} value={n}>{n} per page</option>)}
      </select>

      <button
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={stepButton(page <= 1)}
      >
        <ChevronLeft />
      </button>

      <span style={{ fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums' }}>
        {page} / {totalPages}
      </span>

      <button
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        style={stepButton(page >= totalPages)}
      >
        <ChevronRight />
      </button>
    </div>
  )
}
