import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { platform } from '../lib/platformClient'
import logo from '../images/logo.webp'

export default function SetPasswordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    // Supabase automatically detects the token from the URL hash/query and fires
    // PASSWORD_RECOVERY when the user arrives via a password-reset link.
    const { data: { subscription } } = platform.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setUserId(session?.user?.id ?? null)
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await platform.auth.updateUser({ password: form.password })
      if (updateError) throw updateError

      // Mark account as active now that the user has completed setup
      if (userId) {
        await platform.from('users').update({ user_status: 'active' }).eq('id', userId)
      }

      setSuccess(true)
      setTimeout(async () => {
        await platform.auth.signOut()
        navigate('/login', { replace: true })
      }, 2500)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)',
    padding: '9px 12px', fontSize: 14, boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1B2A4A 0%, #0B3A86 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', width: 420, padding: '40px 40px 36px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <img src={logo} alt="Perspective Financial" style={{ height: 44, width: 'auto' }} />
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 24, color: '#166534',
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
              Password set successfully
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Redirecting you to the login page…
            </p>
          </div>

        ) : !sessionReady ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
              Verifying your invitation link…
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              If this page stays here, your link may have expired.
              Ask an admin to send a new invitation.
            </p>
          </div>

        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 6, color: 'var(--text)' }}>
              Set your password
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center', marginBottom: 28 }}>
              Choose a password to complete your account setup.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat your password"
                  style={inputStyle}
                  required
                />
              </div>

              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px', fontSize: 13, color: '#b91c1c', marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: 'var(--nav)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: 14,
                  cursor: loading ? 'default' : 'pointer', fontWeight: 700,
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? 'Setting password…' : 'Set Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
