import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  completeMockPayment,
  getApiErrorMessage,
  getPaymentStatus,
  getSubscriptionStatus,
  initiatePayment,
} from '../../api/client'
import type { PaymentInitiationResponse, PaymentStatusResponse } from '../../api/types'
import { useLanguage } from '../../i18n/LanguageContext'
import { getSubscriptionReasonKey, subscriptionStatusQueryKey } from '../../subscriptions/subscriptionErrors'
import { AppButton } from '../ui/AppButton'
import { AppModal } from '../ui/AppModal'
import { buttonClassName } from '../ui/buttonStyles'
import { ErrorMessage } from '../ui/ErrorMessage'
import { ActivityIcon, AlertCircleIcon, CheckCircleIcon, ShieldIcon } from '../ui/icons'
import { SubscriptionStatusContent } from './SubscriptionStatusPanel'

type SubscriptionUpgradeModalProps = {
  open: boolean
  reasonCode?: string
  onClose: () => void
}

type PlanOption = {
  code: 'PLUS' | 'PRO'
  name: string
  price: string
  scansKey: string
  maxVideoKey: string
  featureKey: string
  badgeKey?: string
}

const plans: PlanOption[] = [
  {
    code: 'PLUS',
    name: 'Plus',
    price: 'PKR 499',
    scansKey: 'subscriptions.plan.plusScans',
    maxVideoKey: 'subscriptions.plan.plusMaxVideo',
    featureKey: 'subscriptions.plan.smartScan',
    badgeKey: 'subscriptions.plan.mostPopular',
  },
  {
    code: 'PRO',
    name: 'Pro',
    price: 'PKR 999',
    scansKey: 'subscriptions.plan.proScans',
    maxVideoKey: 'subscriptions.plan.proMaxVideo',
    featureKey: 'subscriptions.plan.smartDetailedScan',
  },
]

export function SubscriptionUpgradeModal({ open, reasonCode, onClose }: SubscriptionUpgradeModalProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [checkout, setCheckout] = useState<PaymentInitiationResponse | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null)
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null)

  const statusQuery = useQuery({
    queryKey: subscriptionStatusQueryKey,
    queryFn: getSubscriptionStatus,
    enabled: open,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!open) {
      setCheckout(null)
      setPaymentStatus(null)
      setSelectedPlanCode(null)
    }
  }, [open])

  const checkoutMutation = useMutation({
    mutationFn: initiatePayment,
    onSuccess: (response) => {
      setCheckout(response)
      setPaymentStatus(null)
    },
  })

  const paymentStatusMutation = useMutation({
    mutationFn: (orderId: string) => getPaymentStatus(orderId),
    onSuccess: async (response) => {
      setPaymentStatus(response)
      if (isPaymentVerified(response.status)) {
        await queryClient.invalidateQueries({ queryKey: subscriptionStatusQueryKey })
      }
    },
  })

  const completeMockMutation = useMutation({
    mutationFn: (succeed: boolean) => completeMockPayment(checkout!.orderId, {
      succeed,
      providerTransactionId: succeed ? `MOCK-${Date.now()}` : undefined,
      failureReason: succeed ? undefined : 'Mock payment marked as failed.',
    }),
    onSuccess: async (response) => {
      setPaymentStatus(response)
      if (isPaymentVerified(response.status)) {
        await queryClient.invalidateQueries({ queryKey: subscriptionStatusQueryKey })
      }
    },
  })

  const busy = checkoutMutation.isPending || paymentStatusMutation.isPending || completeMockMutation.isPending

  function choosePlan(planCode: string) {
    if (busy) {
      return
    }

    setSelectedPlanCode(planCode)
    checkoutMutation.mutate(planCode)
  }

  return (
    <AppModal
      open={open}
      title={t('subscriptions.upgradeTitle')}
      className="subscription-modal"
      icon={<AlertCircleIcon />}
      busy={busy}
      onClose={onClose}
      footer={(
        <AppButton type="button" variant="outline" disabled={busy} onClick={onClose}>
          {t('common.close')}
        </AppButton>
      )}
    >
      <p className="app-modal-copy">{t(getSubscriptionReasonKey(reasonCode))}</p>

      {statusQuery.data && (
        <div className="subscription-modal-current">
          <SubscriptionStatusContent status={statusQuery.data} />
        </div>
      )}

      <div className="subscription-plan-grid" aria-label={t('subscriptions.plansLabel')}>
        {plans.map((plan) => (
          <div className="subscription-plan-card" key={plan.code}>
            <div className="subscription-plan-heading">
              <div>
                <strong>{plan.name}</strong>
                <span>{plan.price}</span>
              </div>
              {plan.badgeKey && <em>{t(plan.badgeKey)}</em>}
            </div>
            <ul>
              <li><ActivityIcon /> {t(plan.scansKey)}</li>
              <li><ShieldIcon /> {t(plan.maxVideoKey)}</li>
              <li><CheckCircleIcon /> {t(plan.featureKey)}</li>
            </ul>
            <AppButton
              type="button"
              fullWidth
              loading={checkoutMutation.isPending && selectedPlanCode === plan.code}
              disabled={busy}
              onClick={() => choosePlan(plan.code)}
            >
              {t('subscriptions.choosePlan', { plan: plan.name })}
            </AppButton>
          </div>
        ))}
      </div>

      {checkoutMutation.error && <ErrorMessage message={getPaymentError(checkoutMutation.error)} />}
      {paymentStatusMutation.error && <ErrorMessage message={getPaymentError(paymentStatusMutation.error)} />}
      {completeMockMutation.error && <ErrorMessage message={getPaymentError(completeMockMutation.error)} />}

      {checkout && (
        <div className="payment-status-panel">
          <div>
            <strong>{t('subscriptions.checkoutTitle', { plan: checkout.planName })}</strong>
            <span>{t('subscriptions.checkoutSubtitle', { currency: checkout.currency, amount: checkout.amount.toLocaleString(), provider: checkout.provider })}</span>
            <small>{t('subscriptions.order', { orderId: checkout.orderId })}</small>
          </div>
          <PaymentStatusBadge status={paymentStatus?.status ?? checkout.status} />
          {checkout.paymentUrl && (
            <a
              className={buttonClassName('outline')}
              href={checkout.paymentUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('subscriptions.openPayment')}
            </a>
          )}
          <div className="payment-status-actions">
            <AppButton
              type="button"
              variant="outline"
              loading={paymentStatusMutation.isPending}
              disabled={busy}
              onClick={() => paymentStatusMutation.mutate(checkout.orderId)}
            >
              {t('subscriptions.checkStatus')}
            </AppButton>
            {checkout.isMock && (
              <>
                <AppButton
                  type="button"
                  loading={completeMockMutation.isPending}
                  disabled={busy}
                  onClick={() => completeMockMutation.mutate(true)}
                >
                  {t('subscriptions.markPaid')}
                </AppButton>
                <AppButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => completeMockMutation.mutate(false)}
                >
                  {t('subscriptions.markFailed')}
                </AppButton>
              </>
            )}
          </div>
          {paymentStatus?.failureReason && <small className="payment-failure">{paymentStatus.failureReason}</small>}
        </div>
      )}

    </AppModal>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  const normalized = status.trim().toLowerCase()
  const label = normalized === 'verified'
    ? t('subscriptions.paymentVerified')
    : t('subscriptions.paymentStatus', { status: status || t('common.pending') })
  return <span className={`payment-status-badge payment-status-${normalized || 'pending'}`}>{label}</span>
}

function isPaymentVerified(status: string) {
  return status.trim().toLowerCase() === 'verified'
}

function getPaymentError(error: unknown) {
  return getApiErrorMessage(error)
}
