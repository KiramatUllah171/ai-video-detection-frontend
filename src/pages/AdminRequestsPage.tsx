import { ScrollRegion } from '../components/ui/ScrollRegion'
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
import { useLanguage } from '../i18n/LanguageContext'
import { localizeProviderValue } from '../i18n/localizeDynamicText'
import { toVideoRouteId } from '../routes/videoRouteId'
import { formatAdminDate } from './adminUtils'

const pageSize = 15

export function AdminRequestsPage() {
  const { language, t } = useLanguage()
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
        eyebrow={t('admin.console')}
        title={t('admin.requests.title')}
        subtitle={t('admin.requests.subtitle')}
        action={<span className="hero-pill light"><ActivityIcon />{t('admin.requests.monitor')}</span>}
      />

      <AppCard className="admin-section-card admin-table-card">
        <div className="card-header compact">
          <div>
            <h2>{t('admin.requests.usersTitle')}</h2>
            <p>{t('admin.requests.usersSubtitle')}</p>
          </div>
        </div>

        <div className="admin-filter-grid">
          <label>
            <span>{t('admin.users.search')}</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={t('admin.users.searchPlaceholder')}
            />
          </label>
        </div>

        {usersQuery.isLoading && <LoadingState text={t('admin.requests.loadingUsers')} />}
        {usersQuery.error && <ErrorMessage message={getApiErrorMessage(usersQuery.error, t)} />}

        {users.length > 0 && (
          <>
          <div className="mobile-record-list mobile-admin-list" aria-label={t('admin.requests.title')}>
            {users.map((user) => (
              <article className={`mobile-record-card ${selectedUser?.userId === user.userId ? 'mobile-record-selected' : ''}`} key={`mobile-${user.email}`}>
                <div className="mobile-record-head">
                  <div className="mobile-record-title">
                    <span className="avatar-initial" aria-hidden="true">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                    <div>
                      <strong>{user.name || t('common.notAvailable')}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <StatusBadge status={user.pendingRequests > 0 ? 'Pending' : 'Completed'} />
                </div>
                <div className="mobile-record-grid">
                  <div>
                    <span>{t('common.total')}</span>
                    <strong>{user.totalRequests.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>{t('common.pending')}</span>
                    <strong>{user.pendingRequests.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>{t('common.completed')}</span>
                    <strong>{user.completedRequests.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>{t('admin.requests.latest')}</span>
                    <strong>{formatAdminDate(user.latestRequestAt, t('common.notAvailable'), language)}</strong>
                  </div>
                </div>
                <div className="mobile-record-meta">
                  <span>{t('admin.videos.video')}</span>
                  <strong>{user.latestVideoName ?? t('admin.requests.noVideoName')}</strong>
                </div>
                <button type="button" className={buttonClassName('primary')} onClick={() => selectUser(user)}>
                  {t('admin.requests.reviewComplete')}
                </button>
              </article>
            ))}
          </div>
          <ScrollRegion className="table-shell desktop-data-table" label={t('admin.requests.title')}>
            <table className="premium-table admin-table admin-table-relaxed">
              <thead>
                <tr>
                  <th>{t('admin.users.user')}</th>
                  <th>{t('admin.users.email')}</th>
                  <th>{t('common.total')}</th>
                  <th>{t('common.pending')}</th>
                  <th>{t('common.completed')}</th>
                  <th>{t('common.failed')}</th>
                  <th>{t('admin.requests.latest')}</th>
                  <th>{t('admin.users.action')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.email} className={selectedUser?.userId === user.userId ? 'admin-selected-row' : ''}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="avatar-initial" aria-hidden="true">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                        <strong>{user.name || t('common.notAvailable')}</strong>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.totalRequests.toLocaleString()}</td>
                    <td>{user.pendingRequests.toLocaleString()}</td>
                    <td>{user.completedRequests.toLocaleString()}</td>
                    <td>{user.failedRequests.toLocaleString()}</td>
                    <td>
                      <div className="admin-mini-counts">
                        <span>{formatAdminDate(user.latestRequestAt, t('common.notAvailable'), language)}</span>
                        <span>{user.latestVideoName ?? t('admin.requests.noVideoName')}</span>
                      </div>
                    </td>
                    <td>
                      <button type="button" className={buttonClassName('primary')} onClick={() => selectUser(user)}>
                        {t('admin.requests.reviewComplete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
          </>
        )}

        {!usersQuery.isLoading && users.length === 0 && <p className="muted-copy">{t('admin.requests.emptyUsers')}</p>}
        <Pagination page={usersQuery.data?.page ?? page} totalPages={usersQuery.data?.totalPages ?? 1} onPageChange={setPage} />
      </AppCard>

      {selectedUser && (
        <AppCard className="admin-section-card admin-table-card">
          <div className="card-header compact admin-detail-header">
            <div>
              <h2>{selectedUser.name}</h2>
              <p>{t('admin.requests.history', { email: selectedUser.email })}</p>
            </div>
            <button type="button" className={buttonClassName('outline')} onClick={() => setSelectedUser(null)}>{t('admin.requests.closeDetails')}</button>
          </div>

          <div className="admin-filter-grid two admin-request-detail-controls">
            <label>
              <span>{t('admin.users.status')}</span>
              <select
                value={requestStatus}
                onChange={(event) => {
                  setRequestStatus(event.target.value)
                  setDetailsPage(1)
                }}
              >
                <option value="">{t('admin.requests.all')}</option>
                <option value="pending">{t('common.pending')}</option>
                <option value="success">{t('status.success')}</option>
                <option value="failed">{t('common.failed')}</option>
              </select>
            </label>
            <div className="admin-request-summary-strip">
              <span><strong>{selectedUser.totalRequests}</strong>{t('common.total')}</span>
              <span><strong>{selectedUser.pendingRequests}</strong>{t('common.pending')}</span>
              <span><strong>{selectedUser.completedRequests}</strong>{t('common.completed')}</span>
              <span><strong>{selectedUser.failedRequests}</strong>{t('common.failed')}</span>
            </div>
          </div>

          {requestsQuery.isLoading && <LoadingState text={t('admin.requests.loadingHistory')} />}
          {requestsQuery.error && <ErrorMessage message={getApiErrorMessage(requestsQuery.error, t)} />}

          {requests.length > 0 && (
            <>
            <div className="mobile-record-list mobile-admin-list" aria-label={t('admin.requests.history', { email: selectedUser.email })}>
              {requests.map((request) => (
                <article className="mobile-record-card" key={`mobile-${request.videoName}-${request.requestStartedAt}-${request.status}`}>
                  <div className="mobile-record-head">
                    <div className="mobile-record-title">
                      <span className="file-icon"><ActivityIcon /></span>
                      <div>
                        <strong>{request.providerName}</strong>
                        <span>{localizeProviderValue(request.providerMode, t)}</span>
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="mobile-record-meta">
                    <span>{t('admin.videos.video')}</span>
                    <strong>{request.videoName}</strong>
                  </div>
                  <div className="mobile-record-grid">
                    <div>
                      <span>{t('admin.requests.http')}</span>
                      <strong>{request.httpStatusCode ?? t('common.notAvailable')}</strong>
                    </div>
                    <div>
                      <span>{t('admin.requests.duration')}</span>
                      <strong>{request.durationMs ? t('common.ms', { value: request.durationMs }) : t('common.notAvailable')}</strong>
                    </div>
                    <div>
                      <span>{t('admin.requests.started')}</span>
                      <strong>{formatAdminDate(request.requestStartedAt, t('common.notAvailable'), language)}</strong>
                    </div>
                    <div>
                      <span>{t('admin.requests.completedAt')}</span>
                      <strong>{formatAdminDate(request.requestCompletedAt, t('common.notAvailable'), language)}</strong>
                    </div>
                  </div>
                  <Link className={buttonClassName('outline')} to={`/admin/videos/${toVideoRouteId(request.videoId)}`}>
                    {t('admin.requests.reviewVideo')}
                  </Link>
                </article>
              ))}
            </div>
            <ScrollRegion className="table-shell desktop-data-table" label={t('admin.requests.history', { email: selectedUser.email })}>
              <table className="premium-table admin-table admin-table-relaxed">
                <thead>
                  <tr>
                    <th>{t('admin.requests.provider')}</th>
                    <th>{t('admin.videos.video')}</th>
                    <th>{t('admin.users.status')}</th>
                    <th>{t('admin.requests.http')}</th>
                    <th>{t('admin.requests.duration')}</th>
                    <th>{t('admin.requests.started')}</th>
                    <th>{t('admin.requests.completedAt')}</th>
                    <th>{t('admin.users.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={`${request.videoName}-${request.requestStartedAt}-${request.status}`}>
                      <td>
                        <div className="admin-mini-counts">
                          <strong>{request.providerName}</strong>
                          <span>{localizeProviderValue(request.providerMode, t)}</span>
                        </div>
                      </td>
                      <td>{request.videoName}</td>
                      <td><StatusBadge status={request.status} /></td>
                      <td>{request.httpStatusCode ?? t('common.notAvailable')}</td>
                      <td>{request.durationMs ? t('common.ms', { value: request.durationMs }) : t('common.notAvailable')}</td>
                      <td>{formatAdminDate(request.requestStartedAt, t('common.notAvailable'), language)}</td>
                      <td>{formatAdminDate(request.requestCompletedAt, t('common.notAvailable'), language)}</td>
                      <td>
                        <Link className={buttonClassName('outline')} to={`/admin/videos/${toVideoRouteId(request.videoId)}`}>
                          {t('admin.requests.reviewVideo')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
            </>
          )}

          {!requestsQuery.isLoading && requests.length === 0 && <p className="muted-copy">{t('admin.requests.emptyRecords')}</p>}
          <Pagination page={requestsQuery.data?.page ?? detailsPage} totalPages={requestsQuery.data?.totalPages ?? 1} onPageChange={setDetailsPage} />
        </AppCard>
      )}
    </main>
  )
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  const { t } = useLanguage()

  return (
    <div className="admin-pagination">
      <button type="button" className={buttonClassName('outline')} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>{t('common.previous')}</button>
      <span>{t('common.pageOf', { page, totalPages: Math.max(1, totalPages) })}</span>
      <button type="button" className={buttonClassName('outline')} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>{t('common.next')}</button>
    </div>
  )
}
