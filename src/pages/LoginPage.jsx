import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { platform } from '../lib/platformClient'
import logo from '../images/Logo_full_white.png'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'forgot-sent'
  const [resetEmail, setResetEmail] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(form.email, form.password)
      navigate('/deals', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: resetError } = await platform.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/set-password`,
      })
      if (resetError) throw resetError
      setMode('forgot-sent')
    } catch (err) {
      setError(err.message || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F1D3B 0%, #1B2A4A 60%, #0B3A86 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        width: '100%',
        maxWidth: 420,
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'var(--nav)',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <img src={logo} alt="Flowbird BI" style={{ height: 48, width: 'auto' }} />
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: 1 }}>
            BUSINESS INTELLIGENCE PLATFORM
          </div>
        </div>

        <div style={{ padding: '32px 32px 36px' }}>

          {/* ── SIGN IN ── */}
          {mode === 'login' && (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--nav)', marginBottom: 6 }}>
                Sign in to your account
              </h1>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 28 }}>
                Enter your credentials to access the platform.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Email address</label>
                  <input
                    type="email" required autoComplete="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--line)'}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Password</label>
                    <button
                      type="button"
                      onClick={() => { setError(''); setMode('forgot') }}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password" required autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--line)'}
                  />
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 13, color: '#b91c1c' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{ background: loading ? 'var(--ink-soft)' : 'var(--nav)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4, transition: 'background 0.15s' }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--nav)', marginBottom: 6 }}>
                Reset your password
              </h1>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 28 }}>
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Email address</label>
                  <input
                    type="email" required autoFocus
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--line)'}
                  />
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 13, color: '#b91c1c' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{ background: loading ? 'var(--ink-soft)' : 'var(--nav)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
                >
                  {loading ? 'Sending…' : 'Send Reset Email'}
                </button>

                <button
                  type="button"
                  onClick={() => { setError(''); setMode('login') }}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' }}
                >
                  Back to sign in
                </button>
              </form>
            </>
          )}

          {/* ── EMAIL SENT CONFIRMATION ── */}
          {mode === 'forgot-sent' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 26 }}>
                ✉
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--nav)', marginBottom: 10 }}>
                Check your email
              </h2>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>
                We've sent a password reset link to
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
                {resetEmail}
              </p>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 28 }}>
                Click the link in the email to choose a new password. The link expires in 1 hour.
              </p>
              <button
                type="button"
                onClick={() => { setError(''); setMode('login') }}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Back to sign in
              </button>
            </div>
          )}

        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: '14px 32px', textAlign: 'center', fontSize: 12, color: 'var(--ink-soft)' }}>
          © Flowbird BI · Perspective Financial
        </div>
      </div>
    </div>
  )
}
