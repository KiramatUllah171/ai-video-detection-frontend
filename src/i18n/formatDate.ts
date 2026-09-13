import type { LanguageCode } from './LanguageContext'

export function formatLocalizedDateTime(value: string | undefined | null, language: LanguageCode, fallback: string) {
  return formatLocalizedDate(value, language, fallback, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: language === 'en' ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: language === 'en',
  })
}

export function formatLocalizedDateShort(value: string | undefined | null, language: LanguageCode, fallback: string) {
  return formatLocalizedDate(value, language, fallback, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatLocalizedDay(value: string | undefined | null, language: LanguageCode, fallback: string) {
  return formatLocalizedDate(value, language, fallback, {
    day: 'numeric',
  })
}

function formatLocalizedDate(
  value: string | undefined | null,
  language: LanguageCode,
  fallback: string,
  options: Intl.DateTimeFormatOptions,
) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), options).format(date)
}

function getIntlLocale(language: LanguageCode) {
  if (language === 'ur') return 'ur-PK-u-ca-gregory-nu-latn'
  if (language === 'ps') return 'ps-AF-u-ca-gregory-nu-latn'
  return 'en'
}
