/** A coloured pill. The label is always present — colour is never the only signal. */
export default function Chip({ label, tone = 'neutral' }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px 3px 8px', borderRadius: 'var(--radius-sm)',
        fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
        background: `var(--chip-${tone}-bg)`,
        color: `var(--chip-${tone}-fg)`,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flex: 'none' }} />
      {label}
    </span>
  )
}
