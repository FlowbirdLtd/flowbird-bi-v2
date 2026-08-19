import Field from './Field'

/**
 * A cluster of closely related fields. The group is the unit proximity acts on:
 * fields inside it sit --gap-field apart, while groups sit --gap-group apart, so
 * the eye reads the cluster before it reads any individual field.
 *
 * A label is optional and used only where it earns its place ("Latest" vs
 * "Forecast"); elsewhere the whitespace alone carries the grouping.
 */
export default function FieldGroup({ group, row, fields }) {
  return (
    <div>
      {group.label && (
        <div
          style={{
            fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600,
            letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'var(--ink-faint)', marginBottom: 8,
          }}
        >
          {group.label}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          columnGap: 24,
          rowGap: 'var(--gap-field)',
        }}
      >
        {fields.map(field => (
          <Field key={field.key} field={field} row={row} />
        ))}
      </div>
    </div>
  )
}
