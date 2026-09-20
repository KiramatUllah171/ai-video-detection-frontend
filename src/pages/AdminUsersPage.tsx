import { ScrollRegion } from '../components/ui/ScrollRegion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { assignAdminUserRequests, getAdminUserRequestGrant, getAdminUsers, getApiErrorMessage, updateAdminUserStatus } from '../api/client'
import type { AdminManualSubscriptionGrant, AdminUserListItem } from '../api/types'
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
  const [manualGrant, setManualGrant] = useState<AdminManualSubscriptionGrant | null>(null)
  const [manualGrantMode, setManualGrantMode] = useState<'loaded' | 'saved'>('loaded')
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
  const requestGrantMutation = useMutation({
    mutationFn: (request: ManualRequestGrantFormValues) => assignAdminUserRequests({
      email: request.email,
      scanLimit: request.scanLimit,
      validityDays: request.validityDays,
      allowsDetailedScan: request.allowsDetailedScan,
      notes: request.notes.trim() || undefined,
    }),
    onSuccess: async (grant) => {
      setManualGrant(grant)
      setManualGrantMode('saved')
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['subscription-status'] })
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

      <ManualRequestGrantCard
        busy={requestGrantMutation.isPending}
        error={requestGrantMutation.error}
        grant={manualGrant}
        mode={manualGrantMode}
        onLoaded={(grant) => {
          setManualGrant(grant)
          setManualGrantMode('loaded')
        }}
        onSubmit={(values) => requestGrantMutation.mutate(values)}
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

type ManualRequestGrantFormValues = {
  email: string
  scanLimit: number
  validityDays: number
  allowsDetailedScan: boolean
  notes: string
}

function ManualRequestGrantCard({
  busy,
  error,
  grant,
  mode,
  onLoaded,
  onSubmit,
}: {
  busy: boolean
  error: unknown
  grant: AdminManualSubscriptionGrant | null
  mode: 'loaded' | 'saved'
  onLoaded: (grant: AdminManualSubscriptionGrant | null) => void
  onSubmit: (values: ManualRequestGrantFormValues) => void
}) {
  const { language, t } = useLanguage()
  const [form, setForm] = useState({
    email: '',
    scanLimit: '10',
    validityDays: '30',
    allowsDetailedScan: false,
    notes: '',
  })
  const parsedScanLimit = Number(form.scanLimit)
  const parsedValidityDays = Number(form.validityDays)
  const normalizedEmail = form.email.trim()
  const canLoad = normalizedEmail.includes('@') && normalizedEmail.includes('.')
  const canSubmit =
    canLoad &&
    Number.isInteger(parsedScanLimit) &&
    parsedScanLimit >= 1 &&
    parsedScanLimit <= 1000 &&
    Number.isInteger(parsedValidityDays) &&
    parsedValidityDays >= 1 &&
    parsedValidityDays <= 365 &&
    form.notes.length <= 500
  const loadMutation = useMutation({
    mutationFn: () => getAdminUserRequestGrant(normalizedEmail),
    onSuccess: (loadedGrant) => {
      onLoaded(loadedGrant)
      setForm((current) => ({
        ...current,
        email: loadedGrant.userEmail,
        scanLimit: loadedGrant.scanLimit > 0 ? String(loadedGrant.scanLimit) : current.scanLimit,
        validityDays: loadedGrant.expiresAt
          ? String(Math.max(1, Math.ceil((new Date(loadedGrant.expiresAt).getTime() - Date.now()) / 86_400_000)))
          : current.validityDays,
        allowsDetailedScan: loadedGrant.allowsDetailedScan,
      }))
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || busy) {
      return
    }

    onSubmit({
      email: normalizedEmail,
      scanLimit: parsedScanLimit,
      validityDays: parsedValidityDays,
      allowsDetailedScan: form.allowsDetailedScan,
      notes: form.notes,
    })
  }

  return (
    <AppCard className="admin-section-card admin-manual-grant-card">
      <div className="card-header compact">
        <div>
          <h2>{t('admin.manualRequests.title')}</h2>
          <p>{t('admin.manualRequests.subtitle')}</p>
        </div>
      </div>

      <form className="admin-manual-grant-form" onSubmit={submit}>
        <div className="admin-manual-grant-fields">
          <label>
            <span>{t('admin.manualRequests.email')}</span>
            <input
              inputMode="email"
              type="email"
              value={form.email}
              onChange={(event) => {
                setForm((current) => ({ ...current, email: event.target.value }))
                onLoaded(null)
              }}
              placeholder="user@example.com"
            />
          </label>
          <label>
            <span>{t('admin.manualRequests.scanLimit')}</span>
            <input
              inputMode="numeric"
              min="1"
              max="1000"
              type="number"
              value={form.scanLimit}
              onChange={(event) => setForm((current) => ({ ...current, scanLimit: event.target.value }))}
            />
          </label>
          <label>
            <span>{t('admin.manualRequests.validityDays')}</span>
            <input
              inputMode="numeric"
              min="1"
              max="365"
              type="number"
              value={form.validityDays}
              onChange={(event) => setForm((current) => ({ ...current, validityDays: event.target.value }))}
            />
          </label>
          <label className="admin-manual-grant-toggle">
            <input
              type="checkbox"
              checked={form.allowsDetailedScan}
              onChange={(event) => setForm((current) => ({ ...current, allowsDetailedScan: event.target.checked }))}
            />
            <span>{t('admin.manualRequests.allowDetailed')}</span>
          </label>
          <label className="admin-manual-grant-notes">
            <span>{t('admin.manualRequests.notes')}</span>
            <textarea
              maxLength={500}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder={t('admin.manualRequests.notesPlaceholder')}
            />
          </label>
        </div>
        <div className="admin-manual-grant-actions">
          <p>{t('admin.manualRequests.upsertNote')}</p>
          <div className="admin-manual-grant-button-row">
            <button type="button" className={buttonClassName('outline')} disabled={!canLoad || loadMutation.isPending || busy} onClick={() => loadMutation.mutate()}>
              {loadMutation.isPending ? t('admin.manualRequests.loading') : t('admin.manualRequests.load')}
            </button>
            <button type="submit" className={buttonClassName('primary')} disabled={!canSubmit || busy || loadMutation.isPending}>
              {busy ? t('admin.manualRequests.saving') : t('admin.manualRequests.save')}
            </button>
          </div>
        </div>
      </form>

      {loadMutation.error && <ErrorMessage message={getApiErrorMessage(loadMutation.error, t)} />}
      {Boolean(error) && <ErrorMessage message={getApiErrorMessage(error, t)} />}
      {grant && (
        <div className="admin-manual-grant-result" role="status">
          <strong>{t(resolveGrantTitleKey(grant, mode), { email: grant.userEmail })}</strong>
          <span>{t('admin.manualRequests.grantSummary', {
            remaining: grant.remainingScans,
            total: grant.scanLimit,
            expires: formatAdminDate(grant.expiresAt, t('common.notAvailable'), language),
          })}</span>
          <div className="admin-manual-grant-stats">
            <span><small>{t('admin.manualRequests.total')}</small><strong>{grant.scanLimit}</strong></span>
            <span><small>{t('admin.manualRequests.used')}</small><strong>{grant.usedScans}</strong></span>
            <span><small>{t('admin.manualRequests.reserved')}</small><strong>{grant.reservedScans}</strong></span>
            <span><small>{t('admin.manualRequests.available')}</small><strong>{grant.remainingScans}</strong></span>
          </div>
          <small>{grant.planCode}</small>
        </div>
      )}
    </AppCard>
  )
}

function resolveGrantTitleKey(grant: AdminManualSubscriptionGrant, mode: 'loaded' | 'saved') {
  if (mode === 'loaded') return 'admin.manualRequests.loadedFor'
  if (grant.created) return 'admin.manualRequests.createdFor'
  return 'admin.manualRequests.updatedFor'
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
