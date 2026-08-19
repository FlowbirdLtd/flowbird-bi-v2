import { getValue, isEmpty } from '@/components/table/format'
import Field from './Field'

/**
 * One card section: an uppercase micro-label bar (mirrors DataTable's
 * `headerStyle`) over a responsive field grid. Renders nothing when every
 * field is empty and the "show all" toggle is off — the section header,
 * grid and all, so no dangling empty card appears on a sparsely-filled row.
 */
export default function DetailSection({ title, fields, row, showEmpty }) {
  const emptyFlags = fields.map(field => isEmpty(getValue(row, field.key), field.type))
  const hiddenCount = emptyFlags.filter(Boolean).length

  if (!showEmpty && hiddenCount === fields.length) return null

  const visibleFields = showEmpty ? fields : fields.filter((_, i) => !emptyFlags[i])

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: 'var(--surface-alt)', borderBottom: '1px solid var(--line-strong)',
          padding: '9px 14px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
            letterSpacing: '.085em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          }}
        >
          {title}
        </span>
        {!showEmpty && hiddenCount > 0 && (
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10.5, color: 'var(--ink-faint)' }}>
            {hiddenCount} empty
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {visibleFields.map(field => (
          <Field key={field.key} field={field} row={row} />
        ))}
      </div>
    </div>
  )
}
