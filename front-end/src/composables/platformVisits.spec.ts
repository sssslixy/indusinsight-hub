// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import { defineComponent, h, nextTick, onUnmounted } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { installPlatformVisits, waitForPlatformVisit } from './platformVisits'
import { getDashboardStats, reportPlatformVisit } from '@/api/dashboard'
import { useUserStore } from '@/stores/user'
import PlatformStats from '@/components/dashboard/PlatformStats.vue'
import { i18n } from '@/i18n'

vi.mock('@/api/dashboard', () => ({ reportPlatformVisit: vi.fn(), getDashboardStats: vi.fn() }))
let dispose: (() => void) | undefined
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  setActivePinia(createPinia())
  vi.mocked(reportPlatformVisit).mockReset().mockResolvedValue()
  vi.mocked(getDashboardStats).mockReset().mockResolvedValue({
    code: 0, message: '',
    data: { communityResources: 1, totalVisits: 2, totalUsers: 3, activeUsers: 0, todayVisits: 0,
      totalAgents: 4, totalSkills: 5, totalDocuments: 6 },
  })
})
afterEach(() => {
  wrapper?.unmount(); wrapper = undefined
  dispose?.(); dispose = undefined
  vi.restoreAllMocks(); vi.useRealTimers()
})

function makeRouter(withStats = false) {
  const component = { template: '<div />' }
  return createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', component },
    { path: '/login', component },
    { path: '/dashboard', component: withStats ? PlatformStats : component, meta: { requiresAuth: true } },
    { path: '/manual', component, meta: { requiresAuth: true } },
    { path: '/blocked', component, meta: { requiresAuth: true }, beforeEnter: () => false },
    { path: '/broken', component, meta: { requiresAuth: true }, beforeEnter: () => { throw new Error('navigation failed') } },
    { path: '/legacy', redirect: '/manual' },
    { path: '/old', redirect: '/legacy' },
  ] })
}

async function setup(path = '/') {
  const router = makeRouter()
  await router.push(path)
  dispose = installPlatformVisits(router)
  return router
}

async function traverse(router: Router, direction: 'back' | 'forward') {
  const finished = new Promise<void>(resolve => {
    const stop = router.afterEach(() => { stop(); resolve() })
  })
  router[direction]()
  await finished
  await waitForPlatformVisit()
}

it('counts the initial business page once when installed before or after initial navigation', async () => {
  localStorage.setItem('token', 'a')
  const router = makeRouter()
  dispose = installPlatformVisits(router)
  expect(installPlatformVisits(router)).toBe(dispose)
  await router.push('/dashboard'); await waitForPlatformVisit()
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }))
  expect(reportPlatformVisit).toHaveBeenCalledTimes(1)
  dispose()
  const refreshedRouter = makeRouter()
  await refreshedRouter.push('/dashboard')
  dispose = installPlatformVisits(refreshedRouter)
  await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(2)
})

it('counts each full URL change and back/forward but skips duplicate or failed navigations', async () => {
  localStorage.setItem('token', 'a')
  const router = await setup('/dashboard')
  await router.push('/manual')
  await router.replace('/manual?case=2')
  await router.push('/manual?case=2#details')
  await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(4)
  await router.push('/manual?case=2#details')
  await router.push('/blocked')
  router.onError(() => {})
  await expect(router.push('/broken')).rejects.toThrow('navigation failed')
  await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(4)
  await traverse(router, 'back')
  await traverse(router, 'forward')
  expect(reportPlatformVisit).toHaveBeenCalledTimes(6)
})

it('counts only the final redirect destination and ignores cancelled navigation', async () => {
  localStorage.setItem('token', 'a')
  const router = await setup('/dashboard')
  await router.push('/old'); await waitForPlatformVisit()
  expect(router.currentRoute.value.fullPath).toBe('/manual')
  expect(reportPlatformVisit).toHaveBeenCalledTimes(2)
  let release!: () => void
  let entered!: () => void
  const started = new Promise<void>(resolve => { entered = resolve })
  const stop = router.beforeEach(to => {
    if (to.fullPath === '/dashboard?slow=1') {
      entered()
      return new Promise<void>(resolve => { release = resolve })
    }
  })
  const cancelled = router.push('/dashboard?slow=1')
  await started
  await router.push('/dashboard')
  release(); await cancelled; await waitForPlatformVisit()
  stop()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(3)
})

it('does not merge rapid navigation or cancel reports when leaving a business page', async () => {
  vi.mocked(reportPlatformVisit).mockImplementation(() => new Promise(() => {}))
  localStorage.setItem('token', 'a')
  const router = await setup('/dashboard')
  await router.push('/manual'); await router.push('/dashboard'); await router.push('/')
  expect(reportPlatformVisit).toHaveBeenCalledTimes(3)
  expect(vi.mocked(reportPlatformVisit).mock.calls.every(call => !call[1].aborted)).toBe(true)
  const pending = waitForPlatformVisit()
  await vi.advanceTimersByTimeAsync(5_000)
  await pending
})

it('excludes public and anonymous pages, then counts the login destination once', async () => {
  const router = await setup('/dashboard')
  await router.push('/login')
  const user = useUserStore()
  localStorage.setItem('token', 'a'); user.token = 'a'
  await nextTick(); await waitForPlatformVisit()
  expect(reportPlatformVisit).not.toHaveBeenCalled()
  await router.push('/dashboard'); await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(1)
  await router.push('/'); await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(1)
})

it('ignores activity and account events, and uses the latest account only on the next navigation', async () => {
  localStorage.setItem('token', 'a')
  const router = await setup('/dashboard')
  await waitForPlatformVisit()
  for (const event of ['pointerdown', 'keydown', 'scroll', 'visibilitychange']) document.dispatchEvent(new Event(event))
  window.dispatchEvent(new Event('focus'))
  const user = useUserStore()
  localStorage.setItem('token', 'b'); user.token = 'b'
  window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: 'b' }))
  await nextTick(); await vi.advanceTimersByTimeAsync(120_000)
  expect(reportPlatformVisit).toHaveBeenCalledTimes(1)
  await router.push('/manual'); await waitForPlatformVisit()
  expect(vi.mocked(reportPlatformVisit).mock.calls.map(call => call[0])).toEqual(['a', 'b'])
  user.clearLoginInfo(); await nextTick(); await router.push('/dashboard')
  await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(2)
})

it('counts background loads and bfcache restores, and removes listeners on disposal', async () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  localStorage.setItem('token', 'a')
  const router = await setup('/dashboard')
  await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(1)
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(2)
  await router.push('/')
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  dispose?.()
  await router.push('/dashboard')
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  await waitForPlatformVisit()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(2)
})

it('starts the actual route report before the mounted statistics component queries totals', async () => {
  let finish!: () => void
  vi.mocked(reportPlatformVisit).mockImplementation(() => new Promise(resolve => { finish = resolve }))
  localStorage.setItem('token', 'a')
  const router = makeRouter(true)
  await router.push('/')
  wrapper = mount(defineComponent({
    setup() {
      onUnmounted(installPlatformVisits(router))
      return () => h(RouterView)
    },
  }), { global: { plugins: [router, i18n] } })
  await router.push('/dashboard'); await flushPromises()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(1)
  expect(getDashboardStats).not.toHaveBeenCalled()
  finish(); await flushPromises()
  expect(getDashboardStats).toHaveBeenCalledTimes(1)
  await router.push('/manual')
  await router.push('/dashboard'); await flushPromises()
  expect(reportPlatformVisit).toHaveBeenCalledTimes(3)
  expect(getDashboardStats).toHaveBeenCalledTimes(1)
  // Both the intervening page and the current page must finish (or time out).
  finish(); await vi.advanceTimersByTimeAsync(5_000); await flushPromises()
  expect(getDashboardStats).toHaveBeenCalledTimes(2)
})
