import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getAdminUsers, getApiErrorMessage, updateAdminUserStatus } from '../api/client'
import type { AdminUserListItem } from '../api/types'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { UserIcon } from '../components/ui/icons'
import { formatAdminDate } from './adminUtils'

const pageSize = 20

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const usersQuery = useQuery({
    queryKey: ['admin-users', page, search, status],
    queryFn: () => getAdminUsers({ page, pageSize, search: search.trim() || undefined, status: status || undefined }),
    placeholderData: (previousData) => previousData,
  })
  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) => updateAdminUserStatus(userId, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] })
    },
  })

  const users = usersQuery.data?.items ?? []

  return (
    <main className="page admin-page">
      <PageHeader
        eyebrow="Admin console"
        title="User management"
        subtitle="Review accounts, email confirmation, upload volume, and disable access when required."
        action={<span className="hero-pill light"><UserIcon />{usersQuery.data?.totalCount.toLocaleString() ?? 0} users</span>}
      />

      <AppCard className="admin-section-card admin-table-card">
        <div className="card-header compact">
          <div>
            <h2>Accounts</h2>
            <p>Filter accounts and manage access status.</p>
          </div>
        </div>

        <div className="admin-filter-grid two">
          <label>
            <span>Search users</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Name or email"
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All users</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="unconfirmed">Email unconfirmed</option>
            </select>
          </label>
        </div>

        {usersQuery.isLoading && <LoadingState text="Loading users..." />}
        {usersQuery.error && <ErrorMessage message={getApiErrorMessage(usersQuery.error)} />}
        {statusMutation.error && <ErrorMessage message={getApiErrorMessage(statusMutation.error)} />}

        {users.length > 0 && (
          <div className="table-shell">
            <table className="premium-table admin-table admin-table-relaxed">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Account</th>
                  <th>Email</th>
                  <th>Videos</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.email}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="avatar-initial" aria-hidden="true">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                        <div>
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{user.role}</td>
                    <td><StatusBadge status={user.isActive ? 'Active' : 'Disabled'} /></td>
                    <td><StatusBadge status={user.emailConfirmed ? 'Confirmed' : 'Unconfirmed'} /></td>
                    <td>
                      <div className="admin-mini-counts">
                        <span>{user.totalVideos} total</span>
                        <span>{user.completedVideos} completed</span>
                        <span>{user.failedVideos} failed</span>
                      </div>
                    </td>
                    <td>{formatAdminDate(user.createdAt)}</td>
                    <td>
                      <UserStatusButton
                        user={user}
                        busy={statusMutation.isPending}
                        onToggle={() => statusMutation.mutate({ userId: user.userId, isActive: !user.isActive })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!usersQuery.isLoading && users.length === 0 && <p className="muted-copy">No users matched this filter.</p>}
        <AdminPagination
          page={usersQuery.data?.page ?? page}
          totalPages={usersQuery.data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </AppCard>
    </main>
  )
}

function UserStatusButton({ user, busy, onToggle }: { user: AdminUserListItem; busy: boolean; onToggle: () => void }) {
  const label = user.isActive ? 'Disable user' : 'Enable user'
  return (
    <button type="button" className={buttonClassName(user.isActive ? 'outline' : 'primary')} onClick={onToggle} disabled={busy}>
      {busy ? 'Updating...' : label}
    </button>
  )
}

function AdminPagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  return (
    <div className="admin-pagination">
      <button type="button" className={buttonClassName('outline')} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>Page {page} of {Math.max(1, totalPages)}</span>
      <button type="button" className={buttonClassName('outline')} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  )
}
