// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { sendSmsCode } from './auth'
afterEach(() => { vi.unstubAllGlobals(); i18n.global.locale.value = 'zh-CN' })
it.each(['zh-CN', 'en-US'] as const)('translates stable SMS business errors in %s', async locale => {
  setActivePinia(createPinia()); i18n.global.locale.value = locale
  for (const code of [4100, 4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108]) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ code, message: 'provider response must not appear', data: null }) }))
    try { await sendSmsCode({ phone: '13800138000', scene: 'LOGIN' }); expect.fail('must reject') }
    catch (error: any) { expect(error.code).toBe(code); expect(error.message).not.toContain('provider response') }
  }
})
