import { formatCell, getValue, isEmpty, EMPTY } from '@/components/table/format'

const NUMERIC_TYPES = new Set(['gbp', 'gbpShort', 'multiple', 'number', 'date'])

/**
 * One label/value pair. Carries no separator of its own — grouping is expressed
 * purely through the spacing scale, so a field never draws a line that would
 * compete with a section or group boundary.
 *
 * `field.render` is only invoked once the field is known to be non-empty, so a
 * custom render never has to null-check its own value.
 */
export default function Field({ field, row }) {
  const value = getValue(row, field.key)
  const empty = isEmpty(value, field.type)
  const formatted = empty ? null : (field.render ? field.render(row) : formatCell(value, field.type))
  const numeric = NUMERIC_TYPES.has(field.type)

  return (
    <div style={{ gridColumn: field.wide ? '1 / -1' : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 2 }}>{field.label}</div>
      <div
        style={{
          fontSize: 13, lineHeight: 1.4, overflowWrap: 'anywhere',
          color: empty ? 'var(--ink-faint)' : 'var(--text)',
          ...(numeric && !empty
            ? { fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums' }
            : {}),
        }}
      >
        {empty ? EMPTY : formatted}
      </div>
    </div>
  )
}
