// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import router from './index'
import { useUserStore } from '@/stores/user'

beforeEach(async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  localStorage.clear()
  setActivePinia(createPinia())
  await router.push('/login')
})
it('redirects anonymous visitors to login', async () => {
  await router.push('/admin/announcements')
  expect(router.currentRoute.value.path).toBe('/login')
})
it('keeps normal users in their dashboard', async () => {
  useUserStore().setLoginInfo('user-token', {
    id: 2,
    account: '13800138000',
    username: 'User',
    phone: '13800138000',
    avatar: '',
  })
  await router.push('/admin/security')
  expect(router.currentRoute.value.path).toBe('/dashboard')
})
it('redirects admin dashboard and marks every admin route as excluded from visit tracking', async () => {
  useUserStore().setLoginInfo('admin-token', {
    id: 1,
    account: 'admin',
    username: 'Admin',
    phone: null,
    avatar: '',
  })
  await router.push('/dashboard')
  expect(router.currentRoute.value.path).toBe('/admin/announcements')
  for (const path of [
    '/admin/announcements',
    '/admin/security',
    '/admin/announcements/new',
    '/admin/announcements/2/edit',
  ]) {
    await router.push(path)
    expect(router.currentRoute.value.meta.trackVisit).toBe(false)
  }
})

afterEach(() => vi.restoreAllMocks())
