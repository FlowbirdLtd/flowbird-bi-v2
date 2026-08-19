const OPTIONS = [
  { value: 'table', label: 'Table' },
  { value: 'board', label: 'Board' },
]

/** A two-option segmented control for switching between table and board views. */
export default function ViewToggle({ view, onChange }) {
  return (
    <div role="tablist" aria-label="View" style={{ display: 'inline-flex', gap: 6 }}>
      {OPTIONS.map(option => {
        const selected = option.value === view
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            style={{
              font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
              padding: '6px 13px', whiteSpace: 'nowrap',
              background: selected ? 'var(--accent-wash)' : 'transparent',
              color: selected ? 'var(--accent)' : 'var(--ink-soft)',
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
