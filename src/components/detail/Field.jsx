import { formatCell, getValue, isEmpty, EMPTY } from '@/components/table/format'

const NUMERIC_TYPES = new Set(['gbp', 'gbpShort', 'multiple', 'number', 'date'])


/**
 * One label/value pair in a section's field grid. `field.render` is only
 * invoked once the field is known to be non-empty, so a custom render never
 * has to null-check its own value.
 */
export default function Field({ field, row }) {
  const value = getValue(row, field.key)
  const empty = isEmpty(value, field.type)
  const formatted = empty ? null : (field.render ? field.render(row) : formatCell(value, field.type))
  const numeric = NUMERIC_TYPES.has(field.type)

  return (
    <div
      style={{
        gridColumn: field.wide ? '1 / -1' : undefined,
        padding: '10px 14px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', gap: 3,
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{field.label}</span>
      <span
        style={{
          fontSize: 13,
          color: empty ? 'var(--ink-faint)' : 'var(--text)',
          ...(numeric && !empty
            ? { fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums' }
            : {}),
        }}
      >
        {empty ? EMPTY : formatted}
      </span>
    </div>
  )
}
