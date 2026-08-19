import BoardColumn from './BoardColumn'

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

/**
 * A read-only kanban view over the same rows the table would show. Purely
 * presentational — it groups pre-filtered rows into columns and never fetches.
 */
export default function BoardView({ deals, columns: stages, onCardClick, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface-alt)' }}>
        <div style={{ position: 'relative', flex: '0 1 300px', minWidth: 200, maxWidth: 300 }}>
          <span style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--ink-faint)', pointerEvents: 'none', display: 'flex',
          }}>
            <SearchIcon />
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: '100%', font: 'inherit', fontSize: 13, color: 'var(--text)',
              background: 'var(--surface)', border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-sm)', padding: '8px 12px 8px 33px',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: 16, overflowX: 'auto', alignItems: 'flex-start' }}>
        {stages.map(stage => (
          <BoardColumn
            key={stage}
            stage={stage}
            deals={deals.filter(deal => deal.stage === stage)}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}
