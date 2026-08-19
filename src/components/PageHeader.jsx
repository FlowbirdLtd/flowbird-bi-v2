/**
 * The title block every page opens with. Owns nothing entity-specific — list,
 * board and detail views all render through this so their headers stay
 * identical. `breadcrumb` sits above the title; `action` is right-aligned.
 */
export default function PageHeader({ title, subtitle, breadcrumb, action }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {breadcrumb && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 8 }}>
          {breadcrumb}
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
