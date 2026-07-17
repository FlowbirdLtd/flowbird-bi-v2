import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUsers } from '../hooks/useUsers'
import { platform } from '../lib/platformClient'
import { useAuth } from '../contexts/AuthContext'
import AddUserModal from '../components/AddUserModal'
import EditUserModal from '../components/EditUserModal'

function PaperPlaneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function ConfirmDeleteModal({ user, onCancel, onConfirm, isDeleting }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: 8, width: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: '#fef2f2', borderRadius: '8px 8px 0 0',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⚠</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#991b1b' }}>Delete User</span>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
            Are you sure you want to delete <strong>{user.name}</strong>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 0 }}>
            {user.email} &mdash; This will remove their profile and access from the platform. This action cannot be undone.
          </p>
        </div>

        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: '#f9fafb', borderRadius: '0 0 8px 8px',
        }}>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              background: '#fff', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              background: isDeleting ? '#fca5a5' : 'var(--red)', color: '#fff',
              border: 'none', borderRadius: 4, padding: '7px 16px',
              fontSize: 13, cursor: isDeleting ? 'default' : 'pointer', fontWeight: 700,
            }}
          >
            {isDeleting ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { user: authUser } = useAuth()
  const { data: allUsers = [], isLoading } = useUsers()

  // Staff get a read-only view; only Admin/Developer can manage users
  const me = allUsers.find(u => u.id === authUser?.id)
  const canManage = (me?.user_permissions ?? []).some(p => p === 'Admin' || p === 'Developer')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(100)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingEdit, setPendingEdit] = useState(null)
  const [showAddUser, setShowAddUser] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      const { data, error } = await platform.functions.invoke('manage-user', {
        body: { action: 'delete', userId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setPendingDelete(null)
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setPendingDelete(null)
    },
  })

  const sorted = [...allUsers].sort((a, b) => a.name.localeCompare(b.name))

  const filtered = sorted.filter(u =>
    !searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * perPage
  const paginated = filtered.slice(start, start + perPage)

  function handleSearch() {
    setSearchTerm(searchInput)
    setCurrentPage(1)
  }

  function handlePerPageChange(e) {
    setPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  return (
    <div style={{ padding: 24 }}>
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} />}
      {pendingEdit && <EditUserModal user={pendingEdit} onClose={() => setPendingEdit(null)} />}
      {pendingDelete && (
        <ConfirmDeleteModal
          user={pendingDelete}
          isDeleting={deleteMutation.isPending}
          onCancel={() => { if (!deleteMutation.isPending) setPendingDelete(null) }}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
        />
      )}

      <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
          {canManage && (
            <button
              onClick={() => setShowAddUser(true)}
              style={{ background: 'var(--nav)', color: '#fff', border: 'none', borderRadius: 4, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 700, marginRight: 8 }}
            >
              + ADD USER
            </button>
          )}
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search users..."
            style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, width: 240 }}
          />
          <button
            onClick={handleSearch}
            style={{ background: 'var(--nav)', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            Search
          </button>
          <button
            style={{ background: '#fff', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
          >
            Add filters
          </button>
        </div>

        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + perPage, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select value={perPage} onChange={handlePerPageChange} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13 }}>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <select
              value={safePage}
              onChange={e => setCurrentPage(Number(e.target.value))}
              style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13 }}
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>Page {i + 1}</option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              style={{ border: '1px solid var(--border)', background: '#fff', borderRadius: 4, padding: '4px 8px', cursor: safePage <= 1 ? 'default' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}
            >
              &lt;
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              style={{ border: '1px solid var(--border)', background: '#fff', borderRadius: 4, padding: '4px 8px', cursor: safePage >= totalPages ? 'default' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}
            >
              &gt;
            </button>
          </div>
        </div>

        {deleteMutation.isError && (
          <div style={{ margin: '8px 16px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, fontSize: 13, color: '#b91c1c' }}>
            Delete failed: {deleteMutation.error?.message}. Ensure the delete policy has been applied in Supabase.
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Name', 'Email', 'Status', 'Permission', ...(canManage ? ['Reset Password', 'Edit', 'Delete'] : [])].map(col => (
                    <th key={col} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text)', background: '#f9fafb', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((user, i) => (
                  <tr
                    key={user.id}
                    style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f9fafb'}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{user.name}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <a href={`mailto:${user.email}`} style={{ color: 'var(--accent)' }}>{user.email}</a>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        background: user.user_status === 'active' ? '#dcfce7' : '#f3f4f6',
                        color: user.user_status === 'active' ? '#166534' : '#6b7280',
                      }}>
                        {user.user_status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(user.user_permissions || []).map(p => (
                          <span key={p} style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            background: p === 'Admin' ? '#fef3c7' : p === 'Developer' ? '#ede9fe' : '#dbeafe',
                            color:      p === 'Admin' ? '#92400e' : p === 'Developer' ? '#5b21b6' : '#1e40af',
                          }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    {canManage && (
                      <>
                        <td style={{ padding: '8px 12px' }}>
                          <button
                            style={{ background: '#e5e7eb', color: 'var(--text)', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                          >
                            <PaperPlaneIcon /> Reset &amp; Send Password
                          </button>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <button
                            onClick={() => setPendingEdit(user)}
                            style={{ background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                          >
                            Edit
                          </button>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <button
                            onClick={() => setPendingDelete(user)}
                            style={{ background: '#fca5a5', color: '#7f1d1d', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 7 : 4} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
