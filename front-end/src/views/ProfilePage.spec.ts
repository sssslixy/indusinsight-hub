// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProfilePage from './ProfilePage.vue'
import ProfileInfoCard from '@/components/profile/ProfileInfoCard.vue'
import DashboardUserCard from '@/components/dashboard/UserProfileCard.vue'
import { useUserStore } from '@/stores/user'
import { i18n } from '@/i18n'
import * as api from '@/api/user'
import type { UserProfile } from '@/types/api'

vi.mock('@/api/user', () => ({ getUserProfile: vi.fn(), updateUserProfile: vi.fn(), uploadUserAvatar: vi.fn() }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const profile: UserProfile = { id: 7, username: '原名称', account: 'login-account', phone: '', avatar: '/old.svg', status: 1, statusLabel: '正常', lastLoginAt: '', createdAt: '', passwordUpdatedAt: '', hasPassword: true }
const response = (data: UserProfile) => ({ code: 0, message: '', data })
let wrapper: VueWrapper
let dashboard: VueWrapper | undefined
const body = () => new DOMWrapper(document.body)
const dialog = () => body().get('dialog')
const input = () => dialog().get('input')
const save = () => dialog().get('button.primary')

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  i18n.global.locale.value = 'zh-CN'
  // jsdom does not implement the browser's modal-dialog methods.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  vi.mocked(api.getUserProfile).mockResolvedValue(response({ ...profile }))
  vi.mocked(api.updateUserProfile).mockImplementation(async ({ username }) => response({ ...profile, username }))
})
afterEach(() => { wrapper?.unmount(); dashboard?.unmount(); dashboard = undefined; document.body.innerHTML = ''; vi.restoreAllMocks() })

async function render() {
  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/profile')
  const store = useUserStore(pinia)
  store.setLoginInfo('token', { ...profile })
  const global = { plugins: [pinia, router, i18n], stubs: { SecuritySection: true, ProfileStatsSection: true, RecentActivitySection: true, ProfileQuickActions: true, AppFooter: true } }
  wrapper = mount(ProfilePage, { attachTo: document.body, global })
  dashboard = mount(DashboardUserCard, { global })
  await flushPromises()
  return store
}

async function open() {
  const button = wrapper.findAll('button').find(b => b.text() === i18n.global.t('profile.changeUsername'))!
  ;(button.element as HTMLButtonElement).focus()
  await button.trigger('click')
  await flushPromises()
  return button.element
}

describe('username editing', () => {
  it('prefills, focuses, disables unchanged names, and restores the value and focus on cancel', async () => {
    await render()
    const trigger = await open()
    expect(dialog().attributes('open')).toBeDefined()
    expect((input().element as HTMLInputElement).value).toBe('原名称')
    expect(document.activeElement).toBe(input().element)
    expect(save().attributes('disabled')).toBeDefined()
    await input().setValue('discard')
    await dialog().trigger('cancel')
    expect(dialog().attributes('open')).toBeUndefined()
    expect(document.activeElement).toBe(trigger)
    await open()
    expect((input().element as HTMLInputElement).value).toBe('原名称')
    expect(api.updateUserProfile).not.toHaveBeenCalled()
  })

  it('validates names and prevents Enter submission during Chinese composition', async () => {
    await render(); await open()
    await input().setValue('   ')
    expect(dialog().text()).toContain('用户名不能为空')
    expect(save().attributes('disabled')).toBeDefined()
    await input().setValue('😀'.repeat(51))
    expect(dialog().text()).toContain('用户名不能超过 50 个字符')
    await input().setValue('新名称')
    await input().trigger('compositionstart')
    await input().trigger('keydown', { key: 'Enter' })
    expect(api.updateUserProfile).not.toHaveBeenCalled()
    await input().trigger('compositionend')
    await input().trigger('keydown', { key: 'Enter', isComposing: true })
    expect(api.updateUserProfile).not.toHaveBeenCalled()
    await input().trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(api.updateUserProfile).toHaveBeenCalledWith({ username: '新名称' })
  })

  it('synchronizes the server name across profile, header, dashboard and persisted login while preserving a concurrent avatar update', async () => {
    const store = await render(); await open()
    let finish!: (value: ReturnType<typeof response>) => void
    vi.mocked(api.updateUserProfile).mockReturnValue(new Promise(resolve => { finish = resolve }))
    await input().setValue(' 新名称😀 ')
    await save().trigger('click')
    expect(api.updateUserProfile).toHaveBeenCalledWith({ username: '新名称😀' })
    expect(store.userInfo?.username).toBe('原名称')
    expect(input().attributes('disabled')).toBeDefined()
    await input().trigger('keydown', { key: 'Enter' })
    await dialog().trigger('cancel')
    expect(dialog().attributes('open')).toBeDefined()
    expect(api.updateUserProfile).toHaveBeenCalledTimes(1)
    wrapper.getComponent(ProfileInfoCard).vm.$emit('avatar-updated', '/new.svg')
    finish(response({ ...profile, username: '服务端名称' }))
    await flushPromises()
    expect(wrapper.get('.profile-name').text()).toBe('服务端名称')
    expect(wrapper.get('.user-name').text()).toBe('服务端名称')
    expect(dashboard!.get('.profile-name').text()).toBe('服务端名称')
    expect(store.userInfo).toMatchObject({ username: '服务端名称', avatar: '/new.svg', account: 'login-account' })
    expect(wrapper.getComponent(ProfileInfoCard).props('userProfile')?.avatar).toBe('/new.svg')
    expect(JSON.parse(localStorage.getItem('userInfo')!)).toMatchObject({ username: '服务端名称', avatar: '/new.svg' })
    const restored = useUserStore(createPinia())
    expect(restored.userInfo?.username).toBe('服务端名称')
    expect(restored.isLoggedIn).toBe(true)
    expect(dialog().attributes('open')).toBeUndefined()
    expect(ElMessage.success).toHaveBeenCalledOnce()
  })

  it('keeps the draft and original profile after failure and supports retry', async () => {
    const store = await render(); await open()
    vi.mocked(api.updateUserProfile).mockRejectedValueOnce(new Error('暂时无法保存'))
    await input().setValue('重试名称')
    await save().trigger('click'); await flushPromises()
    expect(dialog().text()).toContain('暂时无法保存')
    expect((input().element as HTMLInputElement).value).toBe('重试名称')
    expect(store.userInfo?.username).toBe('原名称')
    expect(store.isLoggedIn).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    await save().trigger('click'); await flushPromises()
    expect(store.userInfo?.username).toBe('重试名称')
  })

  it('shows English labels and counts a 50-emoji name correctly', async () => {
    await render()
    i18n.global.locale.value = 'en-US'
    await flushPromises(); await open()
    await input().setValue('😀'.repeat(50))
    expect(dialog().text()).toContain('50 / 50 characters')
    expect(save().text()).toBe('Save')
    expect(save().attributes('disabled')).toBeUndefined()
  })
})
