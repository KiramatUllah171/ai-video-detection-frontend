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
})
