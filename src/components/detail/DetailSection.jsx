import FieldGroup from './FieldGroup'
import { visibleGroups, hiddenCount } from './visibility'

/**
 * One section, rendered as its own card so the gap between sections is real
 * space rather than a divider line. Renders nothing when every field is empty
 * and the "show all" toggle is off, so a sparse record shows no hollow cards.
 */
export default function DetailSection({ section, row, showEmpty }) {
  const groups = visibleGroups(section, row, showEmpty)

  if (groups.length === 0) return null

  const hidden = hiddenCount(section, row)

  return (
    <section
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: 'var(--surface-alt)', borderBottom: '1px solid var(--line)',
          padding: '9px 16px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
            letterSpacing: '.085em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          }}
        >
          {section.title}
        </h2>
        {!showEmpty && hidden > 0 && (
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10.5, color: 'var(--ink-faint)' }}>
            {hidden} empty
          </span>
        )}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 'var(--gap-group)' }}>
        {groups.map((entry, i) => (
          <FieldGroup key={entry.group.label || i} group={entry.group} fields={entry.fields} row={row} />
        ))}
      </div>
    </section>
  )
}
