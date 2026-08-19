import { useState, useRef, useEffect } from 'react'

function ColumnsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </svg>
  )
}

/** Popover listing every column with a checkbox. Pinned columns cannot be hidden. */
export default function ColumnPicker({ columns, hidden, onToggle }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(e) {
      if (!anchorRef.current?.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const visibleCount = columns.length - hidden.length

  return (
    <div ref={anchorRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 13px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)',
        }}
      >
        <ColumnsIcon />
        Columns
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--ink-faint)' }}>
          {visibleCount}/{columns.length}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 40, width: 250,
          background: 'var(--surface)', border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
          padding: 8, maxHeight: 320, overflowY: 'auto',
        }}>
          <div style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, letterSpacing: '.1em',
            textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '6px 8px 8px',
          }}>
            Visible columns
          </div>
          {columns.map(column => {
            const locked = column.sticky || column.alwaysVisible
            return (
              <label
                key={column.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: locked ? 'default' : 'pointer',
                  color: 'var(--text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={!hidden.includes(column.key)}
                  disabled={locked}
                  onChange={() => onToggle(column.key)}
                  style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                />
                {column.label}
                {locked && <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>(pinned)</span>}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
