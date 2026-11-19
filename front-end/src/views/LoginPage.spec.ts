// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginPage from './LoginPage.vue'
import { i18n } from '@/i18n'
import * as auth from '@/api/modules/auth'
vi.mock('@/api/modules/auth', () => ({ accountLogin: vi.fn(), phoneLogin: vi.fn(), sendSmsCode: vi.fn() }))
let wrapper: VueWrapper
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); localStorage.clear(); i18n.global.locale.value = 'zh-CN'
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(auth.sendSmsCode).mockResolvedValue({ code: 0, message: '', data: { retryAfterSeconds: 90, expiresInSeconds: 300 } })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers(); vi.restoreAllMocks() })
async function render() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/login')
  wrapper = mount(LoginPage, { global: { plugins: [createPinia(), router, i18n] } })
  await wrapper.findAll('.tab-item')[1]!.trigger('click')
  await wrapper.get('input[type="tel"]').setValue('13800138000')
  return router
}
describe('SMS login', () => {
  it('sends LOGIN and uses server countdown, then cleans timers on unmount', async () => {
    await render(); await wrapper.get('.code-btn').trigger('click'); await flushPromises()
    expect(auth.sendSmsCode).toHaveBeenCalledWith({ phone: '13800138000', scene: 'LOGIN' })
    expect(wrapper.get('.code-btn').text()).toContain('90')
    expect(wrapper.get('.success-message').text()).toContain('手机短信')
    expect(wrapper.text()).not.toContain('初始密码')
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.get('.code-btn').text()).toContain('89')
    wrapper.unmount(); expect(vi.getTimerCount()).toBe(0)
  })
  it('does not start cooldown or announce success after failure', async () => {
    vi.mocked(auth.sendSmsCode).mockRejectedValue(new Error('今日额度已用完'))
    await render(); await wrapper.get('.code-btn').trigger('click'); await flushPromises()
    expect(wrapper.get('.error-message').text()).toContain('今日额度已用完')
    expect(wrapper.find('.success-message').exists()).toBe(false)
    expect(wrapper.get('.code-btn').attributes('disabled')).toBeUndefined()
  })
  it('requires six digits and clears code when phone changes', async () => {
    await render()
    const code = wrapper.get('input[autocomplete="one-time-code"]')
    await code.setValue('12x34567'); expect((code.element as HTMLInputElement).value).toBe('123456')
    expect(wrapper.get('.login-btn').attributes('disabled')).toBeUndefined()
    await wrapper.get('input[type="tel"]').setValue('13900139000')
    expect((code.element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('.login-btn').attributes('disabled')).toBeDefined()
  })
  it('English copy explains automatic registration without a default password', async () => {
    i18n.global.locale.value = 'en-US'; await render()
    expect(wrapper.get('.registration-notice').text()).toContain('account')
    await wrapper.get('.code-btn').trigger('click'); await flushPromises()
    expect(wrapper.get('.success-message').text()).toContain('text messages')
    expect(wrapper.text()).not.toContain('initial password')
  })
})

describe('account login destinations', () => {
  it.each([['admin', '/admin/announcements'], ['13800138000', '/dashboard']])('routes authenticated %s to %s', async (account, destination) => {
    const router = await render()
    await wrapper.findAll('.tab-item')[0]!.trigger('click')
    vi.mocked(auth.accountLogin).mockResolvedValue({ code: 0, message: '', data: { token: 'verified-token', isNewUser: false, userInfo: { id: 1, account, username: 'Test', phone: account === 'admin' ? null : account, avatar: '' } } })
    await wrapper.get('input[type=text]').setValue(account)
    await wrapper.get('input[type=password]').setValue('test-password')
    await wrapper.get('form').trigger('submit'); await flushPromises(); await vi.advanceTimersByTimeAsync(500)
    expect(router.currentRoute.value.path).toBe(destination)
  })
})
