import { ScrollRegion } from '../components/ui/ScrollRegion'
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
import { useLanguage } from '../i18n/LanguageContext'
import { localizeRoleName } from '../i18n/localizeDynamicText'
import { formatAdminDate } from './adminUtils'

const pageSize = 20

export function AdminUsersPage() {
  const { language, t } = useLanguage()
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
        eyebrow={t('admin.console')}
        title={t('admin.users.title')}
        subtitle={t('admin.users.subtitle')}
        action={<span className="hero-pill light"><UserIcon />{t('admin.users.count', { count: usersQuery.data?.totalCount.toLocaleString() ?? 0 })}</span>}
      />

      <AppCard className="admin-section-card admin-table-card">
        <div className="card-header compact">
          <div>
            <h2>{t('admin.users.accounts')}</h2>
            <p>{t('admin.users.accountsSubtitle')}</p>
          </div>
        </div>

        <div className="admin-filter-grid two">
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
          <label>
            <span>{t('admin.users.status')}</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('admin.users.all')}</option>
              <option value="active">{t('status.active')}</option>
              <option value="disabled">{t('status.disabled')}</option>
              <option value="unconfirmed">{t('admin.users.emailUnconfirmed')}</option>
            </select>
          </label>
        </div>

        {usersQuery.isLoading && <LoadingState text={t('admin.users.loading')} />}
        {usersQuery.error && <ErrorMessage message={getApiErrorMessage(usersQuery.error, t)} />}
        {statusMutation.error && <ErrorMessage message={getApiErrorMessage(statusMutation.error, t)} />}

        {users.length > 0 && (
          <>
          <div className="mobile-record-list mobile-admin-list" aria-label={t('admin.users.accounts')}>
            {users.map((user) => (
              <article className="mobile-record-card" key={`mobile-${user.email}`}>
                <div className="mobile-record-head">
                  <div className="mobile-record-title">
                    <span className="avatar-initial" aria-hidden="true">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <StatusBadge status={user.isActive ? 'Active' : 'Disabled'} />
                </div>
                <div className="mobile-record-grid">
                  <div>
                    <span>{t('admin.users.role')}</span>
                    <strong>{localizeRoleName(user.role, t)}</strong>
                  </div>
                  <div>
                    <span>{t('admin.users.email')}</span>
                    <strong>{user.emailConfirmed ? t('status.confirmed') : t('admin.users.emailUnconfirmed')}</strong>
                  </div>
                  <div>
                    <span>{t('admin.users.videos')}</span>
                    <strong>{t('admin.users.totalVideos', { count: user.totalVideos })}</strong>
                  </div>
                  <div>
                    <span>{t('admin.users.created')}</span>
                    <strong>{formatAdminDate(user.createdAt, t('common.notAvailable'), language)}</strong>
                  </div>
                </div>
                <UserStatusButton
                  user={user}
                  busy={statusMutation.isPending}
                  onToggle={() => statusMutation.mutate({ userId: user.userId, isActive: !user.isActive })}
                />
              </article>
            ))}
          </div>
          <ScrollRegion className="table-shell desktop-data-table" label={t('admin.users.accounts')}>
            <table className="premium-table admin-table admin-table-relaxed">
              <thead>
                <tr>
                  <th>{t('admin.users.user')}</th>
                  <th>{t('admin.users.role')}</th>
                  <th>{t('admin.users.account')}</th>
                  <th>{t('admin.users.email')}</th>
                  <th>{t('admin.users.videos')}</th>
                  <th>{t('admin.users.created')}</th>
                  <th>{t('admin.users.action')}</th>
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
                    <td>{localizeRoleName(user.role, t)}</td>
                    <td><StatusBadge status={user.isActive ? 'Active' : 'Disabled'} /></td>
                    <td><StatusBadge status={user.emailConfirmed ? 'Confirmed' : 'Unconfirmed'} /></td>
                    <td>
                      <div className="admin-mini-counts">
                        <span>{t('admin.users.totalVideos', { count: user.totalVideos })}</span>
                        <span>{t('admin.users.completedVideos', { count: user.completedVideos })}</span>
                        <span>{t('admin.users.failedVideos', { count: user.failedVideos })}</span>
                      </div>
                    </td>
                    <td>{formatAdminDate(user.createdAt, t('common.notAvailable'), language)}</td>
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
          </ScrollRegion>
          </>
        )}

        {!usersQuery.isLoading && users.length === 0 && <p className="muted-copy">{t('admin.users.empty')}</p>}
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
  const { t } = useLanguage()
  const label = user.isActive ? t('admin.users.disable') : t('admin.users.enable')
  return (
    <button type="button" className={buttonClassName(user.isActive ? 'outline' : 'primary')} onClick={onToggle} disabled={busy}>
      {busy ? t('admin.users.updating') : label}
    </button>
  )
}

function AdminPagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  const { t } = useLanguage()

  return (
    <div className="admin-pagination">
      <button type="button" className={buttonClassName('outline')} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>{t('common.previous')}</button>
      <span>{t('common.pageOf', { page, totalPages: Math.max(1, totalPages) })}</span>
      <button type="button" className={buttonClassName('outline')} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>{t('common.next')}</button>
    </div>
  )
}
