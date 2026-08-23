import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminProviderRequests, getAdminProviderRequestUsers, getApiErrorMessage } from '../api/client'
import type { AdminProviderRequestUserSummary } from '../api/types'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ActivityIcon } from '../components/ui/icons'
import { toVideoRouteId } from '../routes/videoRouteId'
import { formatAdminDate } from './adminUtils'

const pageSize = 15

export function AdminRequestsPage() {
  const [page, setPage] = useState(1)
  const [detailsPage, setDetailsPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminProviderRequestUserSummary | null>(null)
  const [requestStatus, setRequestStatus] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin-provider-request-users', page, search],
    queryFn: () => getAdminProviderRequestUsers({ page, pageSize, search: search.trim() || undefined }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 15000,
  })

  const requestsQuery = useQuery({
    queryKey: ['admin-provider-requests', selectedUser?.userId, detailsPage, requestStatus],
    enabled: Boolean(selectedUser),
    queryFn: () => getAdminProviderRequests({
      page: detailsPage,
      pageSize,
      status: requestStatus || undefined,
      userId: selectedUser?.userId,
    }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 15000,
  })

  const users = usersQuery.data?.items ?? []
  const requests = requestsQuery.data?.items ?? []

  function selectUser(user: AdminProviderRequestUserSummary) {
    setSelectedUser(user)
    setDetailsPage(1)
    setRequestStatus('')
  }

  return (
    <main className="page admin-page">
      <PageHeader
        eyebrow="Admin console"
        title="External requests"
        subtitle="Review request usage by user first, then open complete request history only when needed."
        action={<span className="hero-pill light"><ActivityIcon />Request monitor</span>}
      />

      <AppCard className="admin-section-card admin-table-card">
        <div className="card-header compact">
          <div>
            <h2>Users with external requests</h2>
            <p>Only user-level request summaries are loaded here.</p>
          </div>
        </div>

        <div className="admin-filter-grid">
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
        </div>

        {usersQuery.isLoading && <LoadingState text="Loading request users..." />}
        {usersQuery.error && <ErrorMessage message={getApiErrorMessage(usersQuery.error)} />}

        {users.length > 0 && (
          <div className="table-shell">
            <table className="premium-table admin-table admin-table-relaxed">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th>Completed</th>
                  <th>Failed</th>
                  <th>Latest request</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.email} className={selectedUser?.userId === user.userId ? 'admin-selected-row' : ''}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="avatar-initial" aria-hidden="true">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                        <strong>{user.name || 'Not available'}</strong>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.totalRequests.toLocaleString()}</td>
                    <td>{user.pendingRequests.toLocaleString()}</td>
                    <td>{user.completedRequests.toLocaleString()}</td>
                    <td>{user.failedRequests.toLocaleString()}</td>
                    <td>
                      <div className="admin-mini-counts">
                        <span>{formatAdminDate(user.latestRequestAt)}</span>
                        <span>{user.latestVideoName ?? 'No video name'}</span>
                      </div>
                    </td>
                    <td>
                      <button type="button" className={buttonClassName('primary')} onClick={() => selectUser(user)}>
                        Review complete requests
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!usersQuery.isLoading && users.length === 0 && <p className="muted-copy">No external request activity found.</p>}
        <Pagination page={usersQuery.data?.page ?? page} totalPages={usersQuery.data?.totalPages ?? 1} onPageChange={setPage} />
      </AppCard>

      {selectedUser && (
        <AppCard className="admin-section-card admin-table-card">
          <div className="card-header compact admin-detail-header">
            <div>
              <h2>{selectedUser.name}</h2>
              <p>{selectedUser.email} request history.</p>
            </div>
            <button type="button" className={buttonClassName('outline')} onClick={() => setSelectedUser(null)}>Close details</button>
          </div>

          <div className="admin-filter-grid two admin-request-detail-controls">
            <label>
              <span>Status</span>
              <select
                value={requestStatus}
                onChange={(event) => {
                  setRequestStatus(event.target.value)
                  setDetailsPage(1)
                }}
              >
                <option value="">All requests</option>
                <option value="pending">Pending</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <div className="admin-request-summary-strip">
              <span><strong>{selectedUser.totalRequests}</strong>Total</span>
              <span><strong>{selectedUser.pendingRequests}</strong>Pending</span>
              <span><strong>{selectedUser.completedRequests}</strong>Completed</span>
              <span><strong>{selectedUser.failedRequests}</strong>Failed</span>
            </div>
          </div>

          {requestsQuery.isLoading && <LoadingState text="Loading complete request history..." />}
          {requestsQuery.error && <ErrorMessage message={getApiErrorMessage(requestsQuery.error)} />}

          {requests.length > 0 && (
            <div className="table-shell">
              <table className="premium-table admin-table admin-table-relaxed">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Video</th>
                    <th>Status</th>
                    <th>HTTP</th>
                    <th>Duration</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={`${request.videoName}-${request.requestStartedAt}-${request.status}`}>
                      <td>
                        <div className="admin-mini-counts">
                          <strong>{request.providerName}</strong>
                          <span>{request.providerMode}</span>
                        </div>
                      </td>
                      <td>{request.videoName}</td>
                      <td><StatusBadge status={request.status} /></td>
                      <td>{request.httpStatusCode ?? 'Not available'}</td>
                      <td>{request.durationMs ? `${request.durationMs} ms` : 'Not available'}</td>
                      <td>{formatAdminDate(request.requestStartedAt)}</td>
                      <td>{formatAdminDate(request.requestCompletedAt)}</td>
                      <td>
                        <Link className={buttonClassName('outline')} to={`/admin/videos/${toVideoRouteId(request.videoId)}`}>
                          Review video
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!requestsQuery.isLoading && requests.length === 0 && <p className="muted-copy">No request records matched this filter.</p>}
          <Pagination page={requestsQuery.data?.page ?? detailsPage} totalPages={requestsQuery.data?.totalPages ?? 1} onPageChange={setDetailsPage} />
        </AppCard>
      )}
    </main>
  )
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  return (
    <div className="admin-pagination">
      <button type="button" className={buttonClassName('outline')} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>Page {page} of {Math.max(1, totalPages)}</span>
      <button type="button" className={buttonClassName('outline')} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  )
}
