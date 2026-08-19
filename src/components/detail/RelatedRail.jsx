import RelatedPanel from './RelatedPanel'
import { visiblePanels } from './visibility'

/**
 * The records linked to the one being viewed, alongside the fields rather than
 * buried beneath them. Renders nothing at all when every panel is withheld, so
 * the layout never leaves a dead column.
 */
export default function RelatedRail({ panels, row, showEmpty }) {
  const entries = visiblePanels(panels, row, showEmpty)
  if (entries.length === 0) return null

  return (
    <aside
      aria-label="Related records"
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)',
        position: 'sticky', top: 84, alignSelf: 'start',
      }}
    >
      {entries.map(entry => (
        <RelatedPanel key={entry.panel.key} panel={entry.panel} items={entry.items} />
      ))}
    </aside>
  )
}
