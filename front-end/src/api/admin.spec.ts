// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { adminRequest, AdminApiError } from './admin'
import { useUserStore } from '@/stores/user'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())
const userInfo = {
  id: 3,
  account: '13800138000',
  username: 'User',
  phone: '13800138000',
  avatar: '',
}
describe('administrator request boundary', () => {
  it('a late response from an old session does not clear a new login', async () => {
    const store = useUserStore()
    store.setLoginInfo('old-token', userInfo)
    let complete!: (response: Response) => void
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        complete = resolve
      }),
    )
    const pending = adminRequest('/account')
    store.setLoginInfo('new-token', userInfo)
    complete(new Response('{}', { status: 401 }))
    await expect(pending).rejects.toBeInstanceOf(AdminApiError)
    expect(store.token).toBe('new-token')
  })
  it('403 preserves a normal user session and disables the forged admin navigation flag', async () => {
    const store = useUserStore()
    store.setLoginInfo('normal-token', { ...userInfo, account: 'admin' })
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 403 }))
    const listener = vi.fn()
    window.addEventListener('admin-access-denied', listener)
    await expect(adminRequest('/account')).rejects.toMatchObject({ status: 403 })
    expect(store.token).toBe('normal-token')
    expect(store.isAdmin).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener('admin-access-denied', listener)
  })
  it('401 removes expired credentials', async () => {
    const store = useUserStore()
    store.setLoginInfo('expired', userInfo)
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }))
    await expect(adminRequest('/account')).rejects.toBeInstanceOf(AdminApiError)
    expect(store.token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
  it('network and business failures do not remove a valid session', async () => {
    const store = useUserStore()
    store.setLoginInfo('valid', userInfo)
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ code: 4006, message: '当前密码不正确' })),
    )
    await expect(
      adminRequest('/account/password', 'PUT', { currentPassword: 'test' }),
    ).rejects.toThrow('当前密码不正确')
    expect(store.token).toBe('valid')
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).toMatchObject({ satoken: 'valid' })
  })
})
