import { Link, NavLink, useNavigate } from 'react-router-dom'
import logo from '../images/Logo_full_white.png'
import iconDeals from '../images/Deals.png'
import iconOrgs from '../images/Orgs.png'
import iconContacts from '../images/Contacts.png'
import iconReports from '../images/Reports.png'
import iconUsers from '../images/Users.png'
import iconPin from '../images/Pin.png'
import { useAuth } from '../contexts/AuthContext'

const navLinks = [
  { to: '/deals', label: 'DEALS', icon: iconDeals },
  { to: '/organisations', label: 'ORGANISATIONS', icon: iconOrgs },
  { to: '/contacts', label: 'CONTACTS', icon: iconContacts },
  { to: '/reports', label: 'REPORTS', icon: iconReports },
  { to: '/users', label: 'USERS', icon: iconUsers },
  { to: '/key-deal-contacts', label: 'KEY DEAL CONTACTS', icon: iconPin },
]

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
        background: 'var(--nav)',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        gap: 32,
        boxShadow: 'var(--shadow-md)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none' }}>
          <img src={logo} alt="Logo" style={{ height: 36, width: 'auto' }} />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                color: isActive ? 'var(--red)' : '#fff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                padding: '0 12px',
                height: 60,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderBottom: isActive ? '3px solid var(--red)' : '3px solid transparent',
                whiteSpace: 'nowrap',
                opacity: isActive ? 1 : 0.9,
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    maskImage: `url(${link.icon})`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskImage: `url(${link.icon})`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    backgroundColor: isActive ? 'var(--red)' : '#fff',
                  }} />
                  {link.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
            {user?.email ?? ''}
          </span>

          <Link
            to="/account-settings"
            style={{
              color: '#fff', textDecoration: 'none', fontWeight: 600,
              fontSize: 12, padding: '6px 11px', borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.06)',
            }}
          >
            Account Settings
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              font: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: '#fff', background: 'transparent', border: 'none',
              padding: '6px 4px', textDecoration: 'underline',
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      <main style={{ paddingTop: 60 }}>
        {children}
      </main>
    </div>
  )
}
