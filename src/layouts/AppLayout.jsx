import { Link, NavLink, useNavigate } from 'react-router-dom'
import logo from '../images/Logo_full_white.png'
import iconDeals from '../images/Deals.png'
import iconOrgs from '../images/Orgs.png'
import iconContacts from '../images/Contacts.png'
import iconReports from '../images/Reports.png'
import iconUsers from '../images/Users.png'
import iconPin from '../images/Pin.png'
import { useAuth } from '../contexts/AuthContext'

const NAV_HEIGHT = 62

/* Brand red sits too dark on the navy bar to read as an accent, so the nav
   uses a lifted tint of it for active state. */
const ACTIVE_TINT = '#FF6076'

const navLinks = [
  { to: '/deals', label: 'Deals', icon: iconDeals },
  { to: '/organisations', label: 'Organisations', icon: iconOrgs },
  { to: '/contacts', label: 'Contacts', icon: iconContacts },
  { to: '/reports', label: 'Reports', icon: iconReports },
  { to: '/users', label: 'Users', icon: iconUsers },
  { to: '/key-deal-contacts', label: 'Key Deal Contacts', icon: iconPin },
]

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.63.68 1.09 1.32 1.09H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

/** First two meaningful characters of the email, e.g. `jo.bloggs@…` → `JB`. */
function initialsFor(email) {
  if (!email) return '?'
  const [local] = email.split('@')
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export default function AppLayout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>
      <header style={{
        background: 'rgba(27, 42, 74, .88)',
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,.09)',
        height: NAV_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        gap: 18,
        boxShadow: '0 1px 20px -6px rgba(0,0,0,.45)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none' }}>
          <img src={logo} alt="Logo" style={{ height: 32, width: 'auto' }} />
        </Link>

        <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,.14)', flexShrink: 0 }} />

        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className="nav-link"
              style={({ isActive }) => ({
                color: isActive ? '#fff' : 'rgba(255,255,255,.72)',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '-.005em',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                whiteSpace: 'nowrap',
                background: isActive ? 'rgba(255,255,255,.13)' : 'transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="nav-icon"
                    style={{
                      display: 'inline-block',
                      width: 15,
                      height: 15,
                      flexShrink: 0,
                      maskImage: `url(${link.icon})`,
                      maskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskImage: `url(${link.icon})`,
                      WebkitMaskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      backgroundColor: isActive ? ACTIVE_TINT : 'rgba(255,255,255,.72)',
                      transition: 'background-color .16s ease',
                    }}
                  />
                  {link.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingRight: 4 }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.2)',
              color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.02em',
            }}>
              {initialsFor(user?.email)}
            </span>
            <span style={{
              color: 'rgba(255,255,255,.62)', fontSize: 12.5,
              maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.email ?? ''}
            </span>
          </div>

          <Link
            to="/account-settings"
            className="nav-btn"
            title="Account Settings"
            aria-label="Account Settings"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              color: '#fff', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.07)',
            }}
          >
            <GearIcon />
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="nav-btn"
            title="Log Out"
            aria-label="Log Out"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              font: 'inherit', color: '#fff',
              border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.07)',
            }}
          >
            <SignOutIcon />
          </button>
        </div>
      </header>

      <main style={{ paddingTop: NAV_HEIGHT }}>
        {children}
      </main>
    </div>
  )
}
