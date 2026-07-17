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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        background: 'var(--nav)',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        gap: 32,
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

        <div style={{ color: '#fff', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
          Logged in as {user?.email ?? ''}
          {' - '}
          <Link to="/account-settings" style={{ color: '#fff', textDecoration: 'underline' }}>Account Settings</Link>
          {' - '}
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={handleSignOut}>
            Log Out
          </span>
        </div>
      </header>

      <main style={{ paddingTop: 60 }}>
        {children}
      </main>
    </div>
  )
}
