import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getStoredLocale, i18n, LOCALE_STORAGE_KEY, setLocale, toggleLocale } from './index'

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
}

describe('i18n locale helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    vi.stubGlobal('document', {
      documentElement: {
        lang: '',
      },
    })
    localStorage.clear()
    setLocale('zh-CN')
  })

  it('falls back to a supported locale when storage is empty', () => {
    localStorage.removeItem(LOCALE_STORAGE_KEY)

    expect(['zh-CN', 'en-US']).toContain(getStoredLocale())
  })

  it('reads supported values from localStorage', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en-US')

    expect(getStoredLocale()).toBe('en-US')
  })

  it('ignores unsupported stored values', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'fr-FR')

    expect(['zh-CN', 'en-US']).toContain(getStoredLocale())
    expect(getStoredLocale()).not.toBe('fr-FR')
  })

  it('sets locale, localStorage, and html lang together', () => {
    setLocale('en-US')

    expect(i18n.global.locale.value).toBe('en-US')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en-US')
    expect(document.documentElement.lang).toBe('en-US')
  })

  it('toggles between Chinese and English', () => {
    setLocale('zh-CN')

    expect(toggleLocale()).toBe('en-US')
    expect(toggleLocale()).toBe('zh-CN')
  })
})
