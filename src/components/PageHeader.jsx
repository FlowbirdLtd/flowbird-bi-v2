import { Link } from 'react-router-dom'

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

/**
 * The title block every page opens with. Owns nothing entity-specific — list,
 * board and detail views all render through this so their headers stay
 * identical. `back` renders as a chip in the nav row above the title;
 * `action` is right-aligned against the title.
 */
export default function PageHeader({ title, subtitle, back, action }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {back && (
        <div style={{ marginBottom: 10 }}>
          <Link to={back.to} className="back-btn">
            <BackIcon />
            {back.label}
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.022em', color: 'var(--text)' }}>
            {title}
          </h1>
          {subtitle && (
            <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        <div style={{ flex: '1 1 auto' }} />
        {action}
      </div>
    </div>
  )
}
