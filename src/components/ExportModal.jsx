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
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 8, width: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: '#f9fafb', borderRadius: '8px 8px 0 0',
        }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Export Data</span>
          <button
            onClick={onClose}
            style={{
              background: '#e5e7eb', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer',
              fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px 24px 28px' }}>
          <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
            Select the format to export the data in:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Commas (.csv)', format: 'csv' },
              { label: 'Tabs (.txt)',   format: 'txt' },
              { label: 'JSON',          format: 'json' },
            ].map(({ label, format }) => (
              <li key={format}>
                <button
                  onClick={() => handleExport(format)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--accent)', fontSize: 13,
                    textDecoration: 'underline', padding: 0,
                  }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
