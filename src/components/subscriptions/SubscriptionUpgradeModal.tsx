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
import { getSubscriptionReason, subscriptionStatusQueryKey } from '../../subscriptions/subscriptionErrors'
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
  scans: string
  maxVideo: string
  detailed: string
  badge?: string
}

const plans: PlanOption[] = [
  {
    code: 'PLUS',
    name: 'Plus',
    price: 'PKR 499',
    scans: '10 scans / 30 days',
    maxVideo: '250 MB videos',
    detailed: 'Smart Scan',
    badge: 'Most Popular',
  },
  {
    code: 'PRO',
    name: 'Pro',
    price: 'PKR 999',
    scans: '25 scans / 30 days',
    maxVideo: '300 MB videos',
    detailed: 'Smart + Detailed Scan',
  },
]

export function SubscriptionUpgradeModal({ open, reasonCode, onClose }: SubscriptionUpgradeModalProps) {
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
      title="Upgrade Subscription"
      className="subscription-modal"
      icon={<AlertCircleIcon />}
      busy={busy}
      onClose={onClose}
    >
      <p className="app-modal-copy">{getSubscriptionReason(reasonCode)}</p>

      {statusQuery.data && (
        <div className="subscription-modal-current">
          <SubscriptionStatusContent status={statusQuery.data} />
        </div>
      )}

      <div className="subscription-plan-grid" aria-label="Subscription plans">
        {plans.map((plan) => (
          <div className="subscription-plan-card" key={plan.code}>
            <div className="subscription-plan-heading">
              <div>
                <strong>{plan.name}</strong>
                <span>{plan.price}</span>
              </div>
              {plan.badge && <em>{plan.badge}</em>}
            </div>
            <ul>
              <li><ActivityIcon /> {plan.scans}</li>
              <li><ShieldIcon /> {plan.maxVideo}</li>
              <li><CheckCircleIcon /> {plan.detailed}</li>
            </ul>
            <AppButton
              type="button"
              fullWidth
              loading={checkoutMutation.isPending && selectedPlanCode === plan.code}
              disabled={busy}
              onClick={() => choosePlan(plan.code)}
            >
              Choose {plan.name}
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
            <strong>{checkout.planName} checkout</strong>
            <span>{checkout.currency} {checkout.amount.toLocaleString()} via {checkout.provider}</span>
            <small>Order {checkout.orderId}</small>
          </div>
          <PaymentStatusBadge status={paymentStatus?.status ?? checkout.status} />
          {checkout.paymentUrl && (
            <a
              className={buttonClassName('outline')}
              href={checkout.paymentUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Payment
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
              Check Status
            </AppButton>
            {checkout.isMock && (
              <>
                <AppButton
                  type="button"
                  loading={completeMockMutation.isPending}
                  disabled={busy}
                  onClick={() => completeMockMutation.mutate(true)}
                >
                  Mark Paid
                </AppButton>
                <AppButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => completeMockMutation.mutate(false)}
                >
                  Mark Failed
                </AppButton>
              </>
            )}
          </div>
          {paymentStatus?.failureReason && <small className="payment-failure">{paymentStatus.failureReason}</small>}
        </div>
      )}

      <div className="app-modal-actions">
        <AppButton type="button" variant="outline" disabled={busy} onClick={onClose}>
          Close
        </AppButton>
      </div>
    </AppModal>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase()
  const label = normalized === 'verified' ? 'Payment verified' : `Payment ${status || 'pending'}`
  return <span className={`payment-status-badge payment-status-${normalized || 'pending'}`}>{label}</span>
}

function isPaymentVerified(status: string) {
  return status.trim().toLowerCase() === 'verified'
}

function getPaymentError(error: unknown) {
  return getApiErrorMessage(error)
}
