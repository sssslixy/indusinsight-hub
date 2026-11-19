// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import SecuritySection from './SecuritySection.vue'
import { i18n } from '@/i18n'
import { useUserStore } from '@/stores/user'
import * as auth from '@/api/auth'
import * as user from '@/api/user'
vi.mock('@/api/auth', () => ({ sendSmsCode: vi.fn() }))
vi.mock('@/api/user', () => ({ changePassword: vi.fn() }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() } }))
const profile = { id: 7, phone: '13800138000', account: '13800138000', username: '用户8000', avatar: '', status: 1, statusLabel: '正常', lastLoginAt: '', createdAt: '', passwordUpdatedAt: '', hasPassword: false }
let wrapper: VueWrapper
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); localStorage.clear(); i18n.global.locale.value = 'zh-CN'
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(auth.sendSmsCode).mockResolvedValue({ code: 0, message: '', data: { retryAfterSeconds: 75, expiresInSeconds: 300 } })
  vi.mocked(user.changePassword).mockResolvedValue({ code: 0, message: '', data: undefined })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers(); vi.restoreAllMocks() })
async function render(hasPassword = false) {
  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/profile')
  const store = useUserStore(pinia); store.setLoginInfo('token', profile)
  wrapper = mount(SecuritySection, { props: { userProfile: { ...profile, hasPassword } }, global: {
    plugins: [pinia, router, i18n], provide: { changePasswordDialogVisible: ref(true) },
  } })
  return { router, store }
}
async function fill(password = 'new-password') {
  await wrapper.get('input[autocomplete="one-time-code"]').setValue('123456')
  const passwords = wrapper.findAll('input[type="password"]')
  await passwords[0]!.setValue(password); await passwords[1]!.setValue(password)
}
describe('SMS password settings', () => {
  it('uses hasPassword instead of the account and sends a separate scene', async () => {
    await render()
    expect(wrapper.get('.cp-title').text()).toBe('设置密码')
    expect(wrapper.text()).toContain('未设置')
    await wrapper.get('.dialog-code-btn').trigger('click'); await flushPromises()
    expect(auth.sendSmsCode).toHaveBeenCalledWith({ phone: profile.phone, scene: 'CHANGE_PASSWORD' })
    expect(wrapper.get('.dialog-code-btn').text()).toContain('75')
    wrapper.unmount(); await vi.advanceTimersByTimeAsync(1000); expect(vi.getTimerCount()).toBe(0)
  })
  it('clears login and returns to login after a successful change', async () => {
    const { store, router } = await render(true)
    expect(wrapper.get('.cp-title').text()).toBe('修改密码')
    await fill(); await wrapper.get('.dialog-btn.primary').trigger('click'); await flushPromises()
    expect(user.changePassword).toHaveBeenCalledWith({ code: '123456', newPassword: 'new-password' })
    expect(store.isLoggedIn).toBe(false); expect(router.currentRoute.value.path).toBe('/login')
  })
  it('preserves the session on failure and displays the error', async () => {
    vi.mocked(user.changePassword).mockRejectedValue(new Error('验证码已过期'))
    const { store, router } = await render()
    await fill(); await wrapper.get('.dialog-btn.primary').trigger('click'); await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('验证码已过期')
    expect(store.isLoggedIn).toBe(true); expect(router.currentRoute.value.path).toBe('/profile')
  })
  it('rejects phone passwords, nonmatching raw passwords and short codes', async () => {
    await render(); await fill(profile.phone)
    expect(wrapper.text()).toContain('新密码不能与手机号相同')
    expect(wrapper.get('.dialog-btn.primary').attributes('disabled')).toBeDefined()
    await fill(); await wrapper.get('input[autocomplete="one-time-code"]').setValue('12345')
    expect(wrapper.get('.dialog-btn.primary').attributes('disabled')).toBeDefined()
    await fill(); await wrapper.findAll('input[type="password"]')[1]!.setValue(' new-password')
    expect(wrapper.get('.dialog-btn.primary').attributes('disabled')).toBeDefined()
    expect(user.changePassword).not.toHaveBeenCalled()
  })
  it('failed sending leaves the send button available without a success message', async () => {
    vi.mocked(auth.sendSmsCode).mockRejectedValue(new Error('发送受限'))
    await render(); await wrapper.get('.dialog-code-btn').trigger('click'); await flushPromises()
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith('发送受限')
    expect(wrapper.get('.dialog-code-btn').attributes('disabled')).toBeUndefined()
  })
})
