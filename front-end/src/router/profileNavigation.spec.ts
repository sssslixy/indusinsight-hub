// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import { installProfileNavigation, profileReturnTarget, returnToProfile, backToTarget, validProfileSource } from './profileNavigation'

let router: Router
beforeEach(() => {
  window.history.replaceState({}, '', '/')
  router = createRouter({ history: createWebHistory(), routes: ['/', '/dashboard', '/community/agents', '/profile', '/profile/llm', '/login'].map(path => ({ path, component: { template: '<div />' } })) })
  installProfileNavigation(router)
})
afterEach(() => { router.options.history.destroy(); vi.restoreAllMocks() })
async function pop(action: () => void) {
  const done = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve() }) })
  action()
  await done
}

describe('profile history navigation', () => {
  it.each(['/dashboard', '/community/agents?search=steel&page=2'])('preserves %s through profile / settings / refresh', async source => {
    await router.push(source)
    await router.push('/profile')
    expect(profileReturnTarget(router)).toBe(source)
    await router.push('/profile/llm')
    expect(profileReturnTarget(router)).toBe(source)
    // Reinstalling the router at the current URL simulates a reload with the same history entry.
    router.options.history.destroy()
    router = createRouter({ history: createWebHistory(), routes: ['/', '/dashboard', '/community/agents', '/profile', '/profile/llm', '/login'].map(path => ({ path, component: { template: '<div />' } })) })
    installProfileNavigation(router)
    await router.push('/profile/llm')
    const length = window.history.length
    await pop(() => returnToProfile(router))
    expect(router.currentRoute.value.path).toBe('/profile')
    expect(window.history.length).toBe(length)
    await pop(() => backToTarget(router, profileReturnTarget(router)))
    expect(router.currentRoute.value.fullPath).toBe(source)
  })
  it('direct / new tab entry replaces settings with profile and defaults to dashboard', async () => {
    await router.push('/profile/llm')
    const length = window.history.length
    returnToProfile(router)
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/profile'))
    expect(window.history.length).toBe(length)
    expect(profileReturnTarget(router)).toBe('/dashboard')
    backToTarget(router, profileReturnTarget(router))
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/dashboard'))
  })
  it('breaks a legacy profile/settings loop by replacing with the saved origin', async () => {
    await router.push('/community/agents?q=one')
    await router.push('/profile')
    await router.push('/profile/llm')
    await router.push('/profile')
    backToTarget(router, profileReturnTarget(router))
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/community/agents?q=one'))
  })
  it('rejects external, login, unknown and profile targets', () => {
    for (const target of ['https://evil.test', '//evil.test', '/\\evil.test', '/login?redirect=/dashboard', '/profile', '/profile/llm', '/unknown']) {
      expect(validProfileSource(router, target)).toBe(false)
    }
  })
})
