function flattenRow(row) {
  const flat = {}
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        flat[`${k}.${k2}`] = v2 ?? ''
      }
    } else if (Array.isArray(v)) {
      flat[k] = v.join('; ')
    } else {
      flat[k] = v ?? ''
    }
  }
  return flat
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toDelimited(data, sep) {
  if (!data.length) return ''
  const rows = data.map(flattenRow)
  const headers = Object.keys(rows[0])
  const escape = (val, s) => s === ',' ? `"${String(val).replace(/"/g, '""')}"` : String(val)
  return [
    headers.map(h => escape(h, sep)).join(sep),
    ...rows.map(r => headers.map(h => escape(r[h] ?? '', sep)).join(sep)),
  ].join('\n')
}

export default function ExportModal({ data, filename, onClose }) {
  function handleExport(format) {
    if (format === 'csv') {
      triggerDownload(toDelimited(data, ','), `${filename}.csv`, 'text/csv')
    } else if (format === 'txt') {
      triggerDownload(toDelimited(data, '\t'), `${filename}.txt`, 'text/plain')
    } else {
      triggerDownload(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json')
    }
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 29, 59, 0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)', width: 420,
          boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--line)',
          background: 'var(--surface-alt)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Export Data</span>
          <button
            onClick={onClose}
            style={{
              background: 'var(--line)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer',
              fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px 24px 28px' }}>
          <p style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
            letterSpacing: '.085em', textTransform: 'uppercase', color: 'var(--ink-faint)',
            marginBottom: 12,
          }}>
            Select a format
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Commas (.csv)', format: 'csv' },
              { label: 'Tabs (.txt)',   format: 'txt' },
              { label: 'JSON',          format: 'json' },
            ].map(({ label, format }) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                style={{
                  font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  textAlign: 'left', color: 'var(--text)',
                  background: 'var(--surface-alt)', border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)', padding: '9px 13px',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
