import ColumnPicker from './ColumnPicker'

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function TableToolbar({
  search, onSearchChange, searchPlaceholder,
  columns, hidden, onToggleColumn, onExport,
}) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface-alt)',
    }}>
      <div style={{ position: 'relative', flex: '0 1 300px', minWidth: 200 }}>
        <span style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ink-faint)', pointerEvents: 'none', display: 'flex',
        }}>
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            width: '100%', font: 'inherit', fontSize: 13, color: 'var(--text)',
            background: 'var(--surface)', border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px 8px 33px',
          }}
        />
      </div>

      <div style={{ flex: '1 1 auto' }} />

      {onExport && (
        <button
          onClick={onExport}
          style={{
            font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 13px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--nav)', background: 'var(--nav)', color: 'var(--surface)',
          }}
        >
          <DownloadIcon /> Export
        </button>
      )}

      <ColumnPicker columns={columns} hidden={hidden} onToggle={onToggleColumn} />
    </div>
  )
}
