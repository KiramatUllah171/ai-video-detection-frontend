import { useQuery } from '@tanstack/react-query'
import { getSubscriptionStatus } from '../../api/client'
import { useLanguage } from '../../i18n/LanguageContext'
import { getSubscriptionReasonKey, subscriptionStatusQueryKey } from '../../subscriptions/subscriptionErrors'
import { AppButton } from '../ui/AppButton'
import { AppModal } from '../ui/AppModal'
import { buttonClassName } from '../ui/buttonStyles'
import { ActivityIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, ShieldIcon } from '../ui/icons'
import { SubscriptionStatusContent } from './SubscriptionStatusPanel'

type SubscriptionUpgradeModalProps = {
  open: boolean
  reasonCode?: string
  onClose: () => void
}

type PlanOption = {
  code: 'PLUS' | 'PRO'
  nameKey: string
  price: string
  scansKey: string
  maxVideoKey: string
  featureKey: string
  badgeKey?: string
}

const plans: PlanOption[] = [
  {
    code: 'PLUS',
    nameKey: 'subscriptions.plus',
    price: 'PKR 499',
    scansKey: 'subscriptions.plan.plusScans',
    maxVideoKey: 'subscriptions.plan.plusMaxVideo',
    featureKey: 'subscriptions.plan.smartScan',
    badgeKey: 'subscriptions.plan.mostPopular',
  },
  {
    code: 'PRO',
    nameKey: 'subscriptions.pro',
    price: 'PKR 999',
    scansKey: 'subscriptions.plan.proScans',
    maxVideoKey: 'subscriptions.plan.proMaxVideo',
    featureKey: 'subscriptions.plan.smartDetailedScan',
  },
]

export function SubscriptionUpgradeModal(props: SubscriptionUpgradeModalProps) {
  if (!props.open) {
    return null
  }

  return <SubscriptionUpgradeModalContent {...props} />
}

function SubscriptionUpgradeModalContent({ open, reasonCode, onClose }: SubscriptionUpgradeModalProps) {
  const { t } = useLanguage()

  const statusQuery = useQuery({
    queryKey: subscriptionStatusQueryKey,
    queryFn: getSubscriptionStatus,
    enabled: open,
    staleTime: 30_000,
  })

  const whatsappMessage = encodeURIComponent('Assalam o Alaikum, I have sent EasyPaisa payment for SachAI subscription. I am sharing the payment screenshot for verification.')
  const whatsappUrl = `https://wa.me/923145156620?text=${whatsappMessage}`

  return (
    <AppModal
      open={open}
      title={t('subscriptions.upgradeTitle')}
      className="subscription-modal"
      icon={<AlertCircleIcon />}
      onClose={onClose}
      footer={(
        <AppButton type="button" variant="outline" onClick={onClose}>
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

      <div className="manual-payment-panel" role="note" aria-label="Manual EasyPaisa subscription instructions">
        <div className="manual-payment-header">
          <span><ClockIcon /></span>
          <div>
            <strong>Subscription checkout is under development</strong>
            <p>For now, you can activate a subscription manually through EasyPaisa. Automated checkout will be enabled after EasyPaisa KYC approval.</p>
          </div>
        </div>

        <div className="manual-payment-account">
          <div>
            <span>EasyPaisa number</span>
            <strong>03145156620</strong>
          </div>
          <div>
            <span>Account name</span>
            <strong>Karamat Ullah</strong>
          </div>
        </div>

        <ol className="manual-payment-steps">
          <li>Send the selected plan amount to the EasyPaisa number above.</li>
          <li>Take a clear payment screenshot.</li>
          <li>Send the screenshot on WhatsApp to the same number.</li>
          <li>Please wait around 5 to 10 minutes while the payment is checked manually.</li>
          <li>After verification, your subscription tokens will be assigned to your account.</li>
        </ol>

        <a className={buttonClassName('primary', true)} href={whatsappUrl} target="_blank" rel="noreferrer">
          Send screenshot on WhatsApp
        </a>
      </div>

      <div className="subscription-plan-grid" aria-label={t('subscriptions.plansLabel')}>
        {plans.map((plan) => (
          <div className="subscription-plan-card" key={plan.code}>
            <div className="subscription-plan-heading">
              <div>
                <strong>{t(plan.nameKey)}</strong>
                <span>{plan.price}</span>
              </div>
              {plan.badgeKey && <em>{t(plan.badgeKey)}</em>}
            </div>
            <ul>
              <li><ActivityIcon /> {t(plan.scansKey)}</li>
              <li><ShieldIcon /> {t(plan.maxVideoKey)}</li>
              <li><CheckCircleIcon /> {t(plan.featureKey)}</li>
            </ul>
            <small className="subscription-plan-manual-note">Manual EasyPaisa verification only</small>
          </div>
        ))}
      </div>

    </AppModal>
  )
}
