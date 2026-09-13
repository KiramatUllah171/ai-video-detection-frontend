import { describe, expect, it } from 'vitest'
import { ApiRequestError, getApiErrorMessage } from './client'

const translations: Record<string, string> = {
  'api.correlationReference': 'Reference ID: {correlationId}',
  'api.requestFailed': 'Request failed localized.',
  'api.serverError': 'Server failed localized.',
  'api.tooManyRequests': 'Slow down localized.',
  'api.unauthorized': 'Session expired localized.',
  'api.forbidden': 'Forbidden localized.',
  'api.validationError': 'Validation localized.',
  'api.accountInactive': 'Inactive localized.',
  'api.serverStorageCapacityLow': 'Capacity localized.',
  'api.uploadBusy': 'Upload busy localized.',
  'api.analysisQueueUnavailable': 'Queue localized.',
  'subscriptions.paymentVerificationFailed': 'Payment verification localized.',
  'analysis.notAvailable': 'Not available localized.',
  'login.emailNotConfirmed': 'Email not confirmed localized.',
  'processing.defaultError': 'Processing failed localized.',
  'profile.unavailable': 'Profile unavailable localized.',
  'retention.reportExpiredError': 'Report expired localized.',
  'retention.videoExpiredError': 'Video expired localized.',
  'signup.emailAlreadyRegistered': 'Email registered localized.',
  'signup.strongPasswordRequirement': 'Password weak localized.',
}

function t(key: string, values?: Record<string, string | number>) {
  const template = translations[key] ?? key
  return Object.entries(values ?? {}).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}

describe('getApiErrorMessage', () => {
  it('localizes structured API errors and preserves correlation IDs', () => {
    const message = getApiErrorMessage(
      new ApiRequestError('Too many requests. Please wait a moment and try again.', {
        correlationId: 'corr-123',
        status: 429,
      }),
      t,
    )

    expect(message).toBe('Slow down localized. Reference ID: corr-123')
  })

  it('hides unknown server details behind a localized message', () => {
    expect(getApiErrorMessage(new ApiRequestError('Database provider stack trace', { status: 500 }), t))
      .toBe('Server failed localized.')
  })

  it('localizes report retention errors from plain thrown errors', () => {
    expect(getApiErrorMessage(new Error('REPORT_EXPIRED'), t)).toBe('Report expired localized.')
  })

  it('uses machine-readable infrastructure error codes before generic status messages', () => {
    expect(getApiErrorMessage(new ApiRequestError('Server failed', {
      errorCode: 'SERVER_STORAGE_CAPACITY_LOW',
      status: 503,
    }), t)).toBe('Capacity localized.')
    expect(getApiErrorMessage(new ApiRequestError('Queue failed', {
      errorCode: 'ANALYSIS_QUEUE_UNAVAILABLE',
      status: 503,
    }), t)).toBe('Queue localized.')
    expect(getApiErrorMessage(new ApiRequestError('Busy', {
      errorCode: 'UPLOAD_CONCURRENCY_LIMIT_REACHED',
      status: 429,
    }), t)).toBe('Upload busy localized.')
    expect(getApiErrorMessage(new ApiRequestError('Gateway detail', {
      errorCode: 'PAYMENT_VERIFICATION_FAILED',
      status: 400,
    }), t)).toBe('Payment verification localized.')
  })
})
