import { getApiErrorCode } from '../api/client'

export const subscriptionStatusQueryKey = ['subscription-status'] as const

export const subscriptionUpgradeErrorCodes = [
  'FREE_TRIAL_EXHAUSTED',
  'SCAN_QUOTA_EXHAUSTED',
  'SUBSCRIPTION_REQUIRED',
  'DETAILED_SCAN_NOT_ALLOWED',
  'VIDEO_SIZE_LIMIT_EXCEEDED',
] as const

export function getSubscriptionUpgradeErrorCode(error: unknown) {
  const errorCode = getApiErrorCode(error)
  if (!errorCode) {
    return undefined
  }

  return subscriptionUpgradeErrorCodes.includes(errorCode as typeof subscriptionUpgradeErrorCodes[number])
    ? errorCode
    : undefined
}

export function shouldShowSubscriptionUpgrade(error: unknown, isAdmin: boolean) {
  return !isAdmin && Boolean(getSubscriptionUpgradeErrorCode(error))
}

export function getSubscriptionReason(errorCode?: string) {
  return getSubscriptionReasonText(errorCode)
}

export function getSubscriptionReasonKey(errorCode?: string) {
  switch (errorCode) {
    case 'FREE_TRIAL_EXHAUSTED':
      return 'subscriptions.reason.freeTrialExhausted'
    case 'SCAN_QUOTA_EXHAUSTED':
      return 'subscriptions.reason.scanQuotaExhausted'
    case 'DETAILED_SCAN_NOT_ALLOWED':
      return 'subscriptions.reason.detailedScanNotAllowed'
    case 'VIDEO_SIZE_LIMIT_EXCEEDED':
      return 'subscriptions.reason.videoSizeLimitExceeded'
    case 'SUBSCRIPTION_REQUIRED':
      return 'subscriptions.reason.subscriptionRequired'
    default:
      return 'subscriptions.reason.default'
  }
}

function getSubscriptionReasonText(errorCode?: string) {
  switch (errorCode) {
    case 'FREE_TRIAL_EXHAUSTED':
      return 'Your free trial scans are used up. Upgrade to keep analyzing videos.'
    case 'SCAN_QUOTA_EXHAUSTED':
      return 'Your current plan has no scans remaining. Upgrade or renew to continue.'
    case 'DETAILED_SCAN_NOT_ALLOWED':
      return 'Detailed Scan is available on Pro. Upgrade to run deeper analysis.'
    case 'VIDEO_SIZE_LIMIT_EXCEEDED':
      return 'This video is larger than your current plan allows. Upgrade for larger uploads.'
    case 'SUBSCRIPTION_REQUIRED':
      return 'A paid subscription is required for this action.'
    default:
      return 'Choose a plan to continue analyzing videos.'
  }
}
