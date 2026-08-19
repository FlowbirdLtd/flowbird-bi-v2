import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  title, subtitle, breadcrumb, sections, panels = [], row, backLink,
}) {
  const [showEmpty, setShowEmpty] = useState(() => readShowEmpty())

  function toggleShowEmpty() {
    setShowEmpty(prev => {
      const next = !prev
      writeShowEmpty(next)
      return next
    })
  }

  const hasRail = visiblePanels(panels, row, showEmpty).length > 0

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumb={breadcrumb && (
          <>
            <Link to={breadcrumb.to} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              {breadcrumb.label}
            </Link>
            {breadcrumb.trail}
          </>
        )}
        action={
          <button
            type="button"
            aria-pressed={showEmpty}
            onClick={toggleShowEmpty}
            style={{
              font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid transparent', borderRadius: 999, padding: '6px 13px',
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

      {backLink && (
        <div style={{ marginTop: 'var(--gap-section)' }}>
          <Link to={backLink.to} style={{ color: 'var(--accent)', fontSize: 13 }}>
            &larr; {backLink.label}
          </Link>
        </div>
      )}
    </div>
  )
}
