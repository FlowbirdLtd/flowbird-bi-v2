import { Link } from 'react-router-dom'

/**
 * One association: the records of a given type linked to the record being
 * viewed. A panel with no records is withheld by RelatedRail rather than
 * rendered empty, so this component always has something to show.
 */
export default function RelatedPanel({ panel, items }) {
  return (
    <section
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: 'var(--surface-alt)', borderBottom: '1px solid var(--line)',
          padding: '9px 14px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
            letterSpacing: '.085em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          }}
        >
          {panel.title}
        </h2>
        <span
          style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, fontVariantNumeric: 'tabular-nums',
            color: 'var(--ink-faint)',
          }}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--ink-faint)' }}>
          {panel.emptyMessage}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map(item => (
            <Link
              key={item.id}
              to={panel.to(item)}
              style={{
                display: 'block', padding: '11px 14px', textDecoration: 'none',
                borderTop: '1px solid var(--line)',
              }}
            >
              {panel.renderItem(item)}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
