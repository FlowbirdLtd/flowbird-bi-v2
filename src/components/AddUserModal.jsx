import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { platform } from '../lib/platformClient'

const PERMISSIONS = ['Staff', 'Admin', 'Developer']

export default function AddUserModal({ onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', permissions: [] })
  const [errors, setErrors] = useState({})
  const [createdUser, setCreatedUser] = useState(null)

  const addMutation = useMutation({
    mutationFn: async () => {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
      const email = form.email.trim()

      const { data, error } = await platform.functions.invoke('manage-user', {
        body: {
          action: 'create',
          name: fullName,
          email,
          permissions: form.permissions,
          redirectTo: `${window.location.origin}/set-password`,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return { id: data.id, name: fullName, email }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setCreatedUser(result)
    },
  })

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!form.lastName.trim()) e.lastName = 'Last name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (form.permissions.length === 0) e.permissions = 'Select a permission'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length > 0) { setErrors(e2); return }
    setErrors({})
    addMutation.mutate()
  }

  function selectPermission(p) {
    setForm(f => ({ ...f, permissions: [p] }))
  }

  const inputStyle = {
    border: '1px solid var(--border)', borderRadius: 4,
    padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box',
  }
  const errStyle = { color: '#b91c1c', fontSize: 11, marginTop: 3 }
  const labelStyle = { fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'block' }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 8, width: 540,
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: '#f3f4f6',
          borderBottom: '1px solid var(--border)', borderRadius: '8px 8px 0 0',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Add User</span>
          <button
            onClick={onClose}
            style={{
              background: '#9ca3af', border: 'none', borderRadius: '50%',
              width: 26, height: 26, cursor: 'pointer', color: '#fff',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Success — invitation sent */}
        {createdUser ? (
          <div style={{ padding: '32px 32px 28px' }}>
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 6, padding: '20px 24px', marginBottom: 24,
            }}>
              <p style={{ fontWeight: 700, color: '#166534', fontSize: 15, marginBottom: 8 }}>
                Invitation sent
              </p>
              <p style={{ fontSize: 13, color: '#15803d', marginBottom: 6 }}>
                An email has been sent to <strong>{createdUser.email}</strong>.
              </p>
              <p style={{ fontSize: 13, color: '#166534' }}>
                {createdUser.name} can click the link in the email to set their own password and log in.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--nav)', color: '#fff', border: 'none',
                borderRadius: 4, padding: '8px 20px', fontSize: 13,
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24, color: 'var(--text)' }}>
              Add User
            </h2>

            {/* Name */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>
                Name <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <input
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First"
                    style={{ ...inputStyle, borderColor: errors.firstName ? '#fca5a5' : undefined }}
                  />
                  {errors.firstName && <div style={errStyle}>{errors.firstName}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last"
                    style={{ ...inputStyle, borderColor: errors.lastName ? '#fca5a5' : undefined }}
                  />
                  {errors.lastName && <div style={errStyle}>{errors.lastName}</div>}
                </div>
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>
                Email <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ ...inputStyle, borderColor: errors.email ? '#fca5a5' : undefined }}
              />
              {errors.email && <div style={errStyle}>{errors.email}</div>}
            </div>

            {/* Permissions */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>User Permissions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PERMISSIONS.map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="radio"
                      name="user-permission"
                      checked={form.permissions[0] === p}
                      onChange={() => selectPermission(p)}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--nav)' }}
                    />
                    {p}
                  </label>
                ))}
              </div>
              {errors.permissions && <div style={errStyle}>{errors.permissions}</div>}
              <p style={{ fontSize: 12, marginTop: 10, color: 'var(--text)' }}>
                <strong><em>Admin</em></strong> <em>have the ability to add and remove <strong>Users</strong>.</em>
              </p>
            </div>

            {addMutation.isError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4,
                padding: '8px 12px', fontSize: 13, color: '#b91c1c', marginBottom: 16,
              }}>
                {addMutation.error?.message}
              </div>
            )}

            <button
              type="submit"
              disabled={addMutation.isPending}
              style={{
                background: addMutation.isPending ? '#374151' : '#111827',
                color: '#fff', border: 'none', borderRadius: 4,
                padding: '10px 28px', fontSize: 14,
                cursor: addMutation.isPending ? 'default' : 'pointer',
                fontWeight: 600,
              }}
            >
              {addMutation.isPending ? 'Creating…' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
