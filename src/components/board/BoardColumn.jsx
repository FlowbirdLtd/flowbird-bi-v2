import { formatCell, EMPTY } from '@/components/table/format'
import { stageTone } from '@/features/deals/columns'
import DealCard from './DealCard'

const sum = (deals, key) => deals.reduce((total, deal) => total + (Number(deal[key]) || 0), 0)

/** One pipeline stage's worth of deals, scrolling independently of the board row. */
export default function BoardColumn({ stage, deals, onCardClick }) {
  const total = sum(deals, 'value')
  const totalLabel = formatCell(total, 'gbpShort')

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', flex: '0 0 280px', width: 280,
        maxHeight: '62vh', background: 'var(--surface-alt)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
      }}
    >
      <div style={{ height: 3, background: `var(--chip-${stageTone(stage)}-fg)` }} />

      <div style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
          letterSpacing: '.085em', textTransform: 'uppercase', color: 'var(--ink-faint)',
        }}>
          <span>{stage}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{deals.length}</span>
        </div>
        <div style={{
          marginTop: 4, fontFamily: 'var(--font-data)', fontSize: 15, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums', color: totalLabel == null ? 'var(--ink-faint)' : 'var(--text)',
        }}>
          {totalLabel ?? EMPTY}
        </div>
      </div>

      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deals.length === 0 ? (
          <div style={{ padding: '20px 6px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-soft)' }}>
            No deals in this stage.
          </div>
        ) : (
          deals.map(deal => (
            <DealCard key={deal.id} deal={deal} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  )
}
