import { createI18n } from 'vue-i18n'
import zhCN from './messages/zh-CN'
import enUS from './messages/en-US'
import { adminZh, adminEn } from './messages/admin'

export type AppLocale = 'zh-CN' | 'en-US'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const satisfies readonly AppLocale[]
export const LOCALE_STORAGE_KEY = 'appLocale'

const isSupportedLocale = (value: unknown): value is AppLocale => {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as AppLocale)
}

const getBrowserLocale = (): AppLocale => {
  if (typeof navigator === 'undefined') return 'zh-CN'
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export function getStoredLocale(): AppLocale {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isSupportedLocale(saved)) return saved
  }
  return getBrowserLocale()
}

export const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: 'zh-CN',
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    'zh-CN': { ...zhCN, admin: adminZh },
    'en-US': { ...enUS, admin: adminEn },
  },
})

const applyDocumentLocale = (locale: AppLocale) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }
  applyDocumentLocale(locale)
}

export function toggleLocale(): AppLocale {
  const nextLocale: AppLocale = i18n.global.locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  setLocale(nextLocale)
  return nextLocale
}

applyDocumentLocale(i18n.global.locale.value)
