import { EMPTY } from './format'

/** Summary figures above a table. Each stat is { label, value, meta }. */
export default function StatStrip({ stats }) {
  if (!stats?.length) return null

  return (
    <div style={{
      display: 'grid', gap: 12, marginBottom: 16,
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    }}>
      {stats.map(stat => (
        <div
          key={stat.label}
          style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px 13px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', gap: 5,
          }}
        >
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 500,
            letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          }}>
            {stat.label}
          </span>
          <span style={{
            fontFamily: 'var(--font-data)', fontWeight: 600, fontSize: 22,
            letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
            color: stat.value == null ? 'var(--ink-soft)' : 'var(--text)',
          }}>
            {stat.value ?? EMPTY}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{stat.meta}</span>
        </div>
      ))}
    </div>
  )
}
