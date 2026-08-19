import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUsers } from '../hooks/useUsers'
import { platform } from '../lib/platformClient'
import { useAuth } from '../contexts/AuthContext'
import AddUserModal from '../components/AddUserModal'
import EditUserModal from '../components/EditUserModal'
import TableShell from '../components/table/TableShell'
import { useTableState } from '../components/table/useTableState'
import { userColumns, userStats } from '../features/users/columns'

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
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)', width: 420,
          boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--line)',
          background: '#fef2f2',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⚠</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#991b1b' }}>Delete User</span>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
            Are you sure you want to delete <strong>{user.name}</strong>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 0 }}>
            {user.email} &mdash; This will remove their profile and access from the platform. This action cannot be undone.
          </p>
        </div>

        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: 'var(--surface-alt)',
        }}>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-sm)', padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              background: isDeleting ? '#fca5a5' : 'var(--red)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)', padding: '7px 16px',
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
  const { data: allUsers = [], isLoading, isError, error } = useUsers()

  // Staff get a read-only view; only Admin/Developer can manage users
  const me = allUsers.find(u => u.id === authUser?.id)
  const canManage = (me?.user_permissions ?? []).some(p => p === 'Admin' || p === 'Developer')
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

  const columns = useMemo(
    () => userColumns({ canManage, onEdit: setPendingEdit, onDelete: setPendingDelete }),
    [canManage],
  )

  const table = useTableState({
    rows: allUsers,
    columns,
    storageKey: 'users',
    searchKeys: ['name', 'email'],
    defaultSort: { key: 'name', dir: 'asc' },
    defaultPerPage: 100,
  })

  return (
    <>
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

      <TableShell
        title="Users"
        subtitle="People with access to this platform"
        stats={userStats(table.filteredRows)}
        table={table}
        columns={columns}
        getRowKey={user => user.id}
        onRowClick={canManage ? setPendingEdit : undefined}
        notice={deleteMutation.isError
          ? `Delete failed: ${deleteMutation.error?.message}. Ensure the delete policy has been applied in Supabase.`
          : null}
        emptyMessage="No users found."
        searchPlaceholder="Search users by name or email…"
        isLoading={isLoading}
        error={isError ? error : null}
        headerAction={canManage && (
          <button
            onClick={() => setShowAddUser(true)}
            style={{
              font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              padding: '8px 13px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--nav)', background: 'var(--nav)', color: 'var(--surface)',
            }}
          >
            Add user
          </button>
        )}
      />
    </>
  )
}
