// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { reportPlatformVisit } from './dashboard'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

it.each([
  { ok: false, status: 403, code: 4030 },
  { ok: true, status: 200, code: 4030 },
  { ok: false, status: 500, code: 5000 },
])('does not change login state on analytics failure ($status / $code)', async ({ ok, status, code }) => {
  localStorage.setItem('token', 'new-account')
  const fetch = vi.fn().mockResolvedValue({ ok, status, json: async () => ({ code }) })
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  await expect(reportPlatformVisit('original-account', controller.signal)).rejects.toThrow()
  expect(localStorage.getItem('token')).toBe('new-account')
  expect(fetch).toHaveBeenCalledWith('/api/dashboard/visit', {
    method: 'POST',
    headers: { satoken: 'original-account', 'X-Platform-Visit-Mode': 'pageview' },
    signal: controller.signal, keepalive: true,
  })
})

it('sends no client-supplied user ID or count', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0 }) })
  vi.stubGlobal('fetch', fetch)
  await expect(reportPlatformVisit('token', new AbortController().signal)).resolves.toBeUndefined()
  expect(fetch.mock.calls[0]![1]).not.toHaveProperty('body')
})
