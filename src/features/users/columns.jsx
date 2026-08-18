import Chip from '@/components/table/Chip'

function PaperPlaneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

const PERMISSION_TONES = { Admin: 'amber', Developer: 'blue', Staff: 'neutral' }

const actionButton = {
  font: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--line-strong)', background: 'var(--surface)',
  color: 'var(--text)', borderRadius: 6, padding: '5px 10px',
  display: 'inline-flex', alignItems: 'center', gap: 5,
}

export function userColumns({ canManage, onEdit, onDelete }) {
  const columns = [
    { key: 'name', label: 'Name', type: 'text', sticky: true, width: 220 },
    {
      key: 'email', label: 'Email', type: 'text',
      render: user => (
        <a href={`mailto:${user.email}`} style={{ color: 'var(--accent)' }}>{user.email}</a>
      ),
    },
    {
      key: 'user_status', label: 'Status', type: 'text',
      render: user => (
        <Chip label={user.user_status} tone={user.user_status === 'active' ? 'green' : 'neutral'} />
      ),
    },
    {
      key: 'user_permissions', label: 'Permission', type: 'text', sortable: false,
      render: user => {
        const permissions = user.user_permissions || []
        if (!permissions.length) return null
        return (
          <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {permissions.map(p => <Chip key={p} label={p} tone={PERMISSION_TONES[p] || 'neutral'} />)}
          </span>
        )
      },
    },
  ]

  if (!canManage) return columns

  return [...columns, {
    key: 'actions', label: '', sortable: false, alwaysVisible: true,
    render: user => (
      <span style={{ display: 'inline-flex', gap: 6 }}>
        {/* No handler — this control is inert today and stays inert here. */}
        <button style={actionButton}><PaperPlaneIcon /> Reset &amp; send password</button>
        <button style={actionButton} onClick={() => onEdit(user)}>Edit</button>
        <button
          style={{ ...actionButton, borderColor: 'var(--chip-red-fg)', color: 'var(--chip-red-fg)' }}
          onClick={() => onDelete(user)}
        >
          Delete
        </button>
      </span>
    ),
  }]
}

export function userStats(rows) {
  const active = rows.filter(u => u.user_status === 'active').length
  const pending = rows.filter(u => u.user_status !== 'active').length
  const elevated = rows.filter(u =>
    (u.user_permissions || []).some(p => p === 'Admin' || p === 'Developer')).length

  return [
    { label: 'Total users', value: String(rows.length), meta: 'With platform access' },
    { label: 'Active', value: String(active), meta: 'Password set' },
    { label: 'Pending invite', value: String(pending), meta: 'Yet to set a password' },
    { label: 'Admins & developers', value: String(elevated), meta: 'Can manage users' },
  ]
}
