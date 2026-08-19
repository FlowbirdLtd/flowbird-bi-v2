import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../PageHeader'
import DetailSection from './DetailSection'
import { readShowEmpty, writeShowEmpty } from './emptyStorage'

/**
 * Card layout shared by every object-view page — the detail-page counterpart
 * to TableShell. Owns nothing entity-specific: a page supplies `sections`
 * (the field-config groups from its `features/<domain>/detailFields.jsx`)
 * and the fetched `row`.
 */
export default function DetailShell({ title, subtitle, breadcrumb, sections, row, backLink, children }) {
  const [showEmpty, setShowEmpty] = useState(() => readShowEmpty())

  function toggleShowEmpty() {
    setShowEmpty(prev => {
      const next = !prev
      writeShowEmpty(next)
      return next
    })
  }

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
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}
      >
        {sections.map(section => (
          <DetailSection
            key={section.title}
            title={section.title}
            fields={section.fields}
            row={row}
            showEmpty={showEmpty}
          />
        ))}
      </div>

      {children}

      {backLink && (
        <div style={{ marginTop: 24 }}>
          <Link to={backLink.to} style={{ color: 'var(--accent)', fontSize: 13 }}>
            &larr; {backLink.label}
          </Link>
        </div>
      )}
    </div>
  )
}
