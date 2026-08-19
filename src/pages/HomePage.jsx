import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/deals', label: 'Deals', description: 'Browse the pipeline mirrored from Pipedrive.' },
  { to: '/organisations', label: 'Organisations', description: 'Companies and accounts on file.' },
  { to: '/contacts', label: 'Contacts', description: 'People linked to organisations and deals.' },
  { to: '/users', label: 'Users', description: 'People with access to this platform.' },
]

export default function HomePage() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
        maxWidth: 640, padding: '28px 28px 24px',
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.022em', color: 'var(--text)' }}>
          Welcome
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, marginTop: 6, marginBottom: 22 }}>
          This is the Flowbird BI dashboard. Pick where you'd like to go.
        </p>

        <div style={{
          display: 'grid', gap: 10,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}>
          {LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--surface-alt)', border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)', padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {link.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>
                {link.description}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
