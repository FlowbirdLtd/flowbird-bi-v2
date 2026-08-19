import { useState } from 'react'
import PageHeader from '../PageHeader'
import DetailSection from './DetailSection'
import RelatedRail from './RelatedRail'
import { visiblePanels } from './visibility'
import { readShowEmpty, writeShowEmpty } from './emptyStorage'

/**
 * Card layout shared by every object-view page — the detail-page counterpart to
 * TableShell. Owns nothing entity-specific: a page supplies `sections` (the
 * field-config groups from its `features/<domain>/detailFields.jsx`), optional
 * `panels` (its associations) and the fetched `row`.
 *
 * One toggle governs everything withheld on the page: empty fields, sections
 * that are entirely empty, and associations with no records.
 */
export default function DetailShell({
  title, subtitle, sections, panels = [], row, backLink, isLoading, missingLabel,
}) {
  const [showEmpty, setShowEmpty] = useState(() => readShowEmpty())

  function toggleShowEmpty() {
    setShowEmpty(prev => {
      const next = !prev
      writeShowEmpty(next)
      return next
    })
  }

  // Loading and not-found are the shell's job, the same way TableShell owns
  // its own states — and both keep the back link, so a missing record is never
  // a dead end the user has to reach for the browser Back button to escape.
  if (isLoading || !row) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader title={isLoading ? '' : 'Not found'} back={backLink} />
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
          padding: '48px 24px', textAlign: 'center',
          fontSize: 13.5, color: 'var(--ink-soft)',
        }}>
          {isLoading ? 'Loading…' : `This ${missingLabel} no longer exists, or you don't have access to it.`}
        </div>
      </div>
    )
  }

  const hasRail = visiblePanels(panels, row, showEmpty).length > 0

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={backLink}
        action={
          <button
            type="button"
            aria-pressed={showEmpty}
            onClick={toggleShowEmpty}
            style={{
              font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid transparent', borderRadius: 'var(--radius-sm)', padding: '6px 13px',
              background: showEmpty ? 'var(--accent-wash)' : 'transparent',
              color: showEmpty ? 'var(--accent)' : 'var(--ink-soft)',
            }}
          >
            Show all fields
          </button>
        }
      />

      <div
        style={{
          display: 'grid', alignItems: 'start', gap: 'var(--gap-section)',
          gridTemplateColumns: hasRail ? 'minmax(0, 1fr) 300px' : 'minmax(0, 1fr)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)', minWidth: 0 }}>
          {sections.map(section => (
            <DetailSection key={section.title} section={section} row={row} showEmpty={showEmpty} />
          ))}
        </div>

        <RelatedRail panels={panels} row={row} showEmpty={showEmpty} />
      </div>
    </div>
  )
}
