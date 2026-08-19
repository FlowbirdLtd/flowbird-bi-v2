import { formatCell, getValue, EMPTY } from '@/components/table/format'

const fieldLabelStyle = {
  fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 500,
  letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-faint)',
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <span style={{ fontSize: 12.5, color: value == null ? 'var(--ink-faint)' : 'var(--text)' }}>
        {value ?? EMPTY}
      </span>
    </div>
  )
}

/**
 * A single deal, rendered as a scannable card. Read-only — this app has no
 * deal-write path, so the card is a navigation control, never a drag source.
 */
export default function DealCard({ deal, onClick }) {
  const organisation = formatCell(getValue(deal, 'organisation.name'), 'text')
  const owner = formatCell(deal.owner, 'text')
  const value = formatCell(deal.value, 'gbp')
  const multiple = formatCell(deal.ebitda_multiple, 'multiple')

  return (
    <button
      onClick={() => onClick?.(deal)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        padding: '12px 13px', cursor: 'pointer', font: 'inherit',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)', marginBottom: 8 }}>
        {formatCell(deal.title, 'text') ?? EMPTY}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Field label="Organisation" value={organisation} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fieldLabelStyle}>Value</span>
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 13, fontVariantNumeric: 'tabular-nums',
              color: value == null ? 'var(--ink-faint)' : 'var(--text)',
            }}>
              {value ?? EMPTY}
            </span>
          </div>
          {multiple != null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fieldLabelStyle}>EBITDA multiple</span>
              <span style={{
                fontFamily: 'var(--font-data)', fontSize: 13, fontVariantNumeric: 'tabular-nums',
                color: 'var(--text)',
              }}>
                {multiple}
              </span>
            </div>
          )}
        </div>
        <Field label="Owner" value={owner} />
      </div>
    </button>
  )
}
