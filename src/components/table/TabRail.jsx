/** Horizontal chip tabs with per-tab counts. Scrolls horizontally when it overflows. */
export default function TabRail({ tabs, active, counts = {}, onChange }) {
  return (
    <div style={{ borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
      <div role="tablist" style={{ display: 'flex', gap: 6, padding: '12px 16px', minWidth: 'max-content' }}>
        {tabs.map(tab => {
          const selected = tab === active
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab)}
              style={{
                font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
                padding: '6px 13px', whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: selected ? 'var(--accent-wash)' : 'transparent',
                color: selected ? 'var(--accent)' : 'var(--ink-soft)',
              }}
            >
              {tab}
              {counts[tab] !== undefined && (
                <span style={{
                  fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: selected ? 'var(--accent)' : 'var(--ink-faint)',
                  opacity: selected ? 0.75 : 1,
                }}>
                  {counts[tab]}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
