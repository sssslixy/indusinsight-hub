// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import PlatformStats from './PlatformStats.vue'
import { i18n } from '@/i18n'
import { getDashboardStats, type DashboardStats } from '@/api/dashboard'
import { waitForPlatformVisit } from '@/composables/platformVisits'

vi.mock('@/api/dashboard', () => ({ getDashboardStats: vi.fn() }))
vi.mock('@/composables/platformVisits', () => ({ waitForPlatformVisit: vi.fn() }))
let wrapper: VueWrapper
const stats: DashboardStats = {
  communityResources: 21, activeUsers: 0, todayVisits: 0, totalVisits: 123456789, totalUsers: 0,
  totalAgents: 42, totalSkills: 1250, totalDocuments: 20000, totalTokens: '0',
}
const render = () => { wrapper = mount(PlatformStats, { global: { plugins: [i18n] } }); return wrapper }
beforeEach(() => {
  vi.resetAllMocks()
  i18n.global.locale.value = 'zh-CN'
  vi.mocked(waitForPlatformVisit).mockResolvedValue()
  vi.mocked(getDashboardStats).mockResolvedValue({ code: 0, message: '', data: { ...stats } })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })

describe('platform statistics', () => {
  it('waits for the initial visit before querying and renders five ordered metrics', async () => {
    let finish!: () => void
    vi.mocked(waitForPlatformVisit).mockReturnValue(new Promise(resolve => { finish = resolve }))
    render()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.findAll('.info-value').map(v => v.text())).toEqual(['--', '--', '--', '--', '--'])
    expect(getDashboardStats).not.toHaveBeenCalled()
    finish(); await flushPromises()
    expect(wrapper.findAll('dt').map(v => v.text())).toEqual(['智能体数量', 'Skill 数量', '文档数量', '累计访问', 'Token 用量'])
    expect(wrapper.findAll('.info-value').map(v => v.text())).toEqual(['42', '1.3k', '20k', '123.5M', '0'])
    expect(wrapper.findAll('.info-value')[3]!.attributes('title')).toBe('123,456,789')
    expect(wrapper.findAll('.info-value')[3]!.attributes('aria-label')).toBe('123,456,789')
    expect(wrapper.findAll('[title]').map(node => node.element)).toEqual(
      wrapper.findAll('.info-value').map(node => node.element),
    )
    expect(wrapper.findAll('.stats-sr-only')).toHaveLength(5)
    expect(wrapper.findAll('.stats-sr-only')[4]!.text()).toContain('已确认')
    i18n.global.locale.value = 'en-US'; await nextTick()
    expect(wrapper.findAll('dt').map(v => v.text())).toEqual(['Agents', 'Skills', 'Documents', 'Total Visits', 'Total LLM Tokens'])
    expect(wrapper.findAll('.info-value')[3]!.text()).toBe('123.5M')
  })

  it.each([
    [0, '0'], [999, '999'], [1_000, '1k'], [1_250, '1.3k'], [5_364, '5.4k'],
    [999_949, '999.9k'], [999_950, '1M'], [1_000_000, '1M'], [1_250_000, '1.3M'],
    [999_949_999, '999.9M'], [999_950_000, '1B'], [1_000_000_000, '1B'], [2_400_000_000, '2.4B'],
    [999_949_999_999, '999.9B'], [999_950_000_000, '1T'], [1_000_000_000_000, '1T'],
    [1_000_000_000_000_000, '1000T'],
  ] as const)('formats %s as %s on every card in both languages', async (value, expected) => {
    vi.mocked(getDashboardStats).mockResolvedValue({ code: 0, message: '', data: {
      ...stats, totalAgents: value, totalSkills: value, totalTokens: String(value),
      totalDocuments: value, totalVisits: value,
    } })
    render(); await flushPromises()
    for (const locale of ['zh-CN', 'en-US'] as const) {
      i18n.global.locale.value = locale
      await nextTick()
      for (const item of wrapper.findAll('.info-value')) {
        expect(item.text()).toBe(expected)
        expect(item.attributes('title')).toBe(value.toLocaleString(locale))
        expect(item.attributes('aria-label')).toBe(value.toLocaleString(locale))
      }
    }
  })

  it('distinguishes individual unavailable values from real zero without hiding resources', async () => {
    vi.mocked(getDashboardStats).mockResolvedValue({ code: 0, message: '', data: { ...stats, totalVisits: null } })
    render(); await flushPromises()
    expect(wrapper.findAll('.info-value').map(v => v.text())).toEqual(['42', '1.3k', '20k', '--', '0'])
    expect(wrapper.findAll('.info-value')[3]!.attributes('aria-label')).toBe('暂时无法获取统计数据')
  })

  it.each(['totalAgents', 'totalSkills', 'totalDocuments'] as const)('isolates an unavailable %s', async key => {
    vi.mocked(getDashboardStats).mockResolvedValue({ code: 0, message: '', data: { ...stats, [key]: null } })
    render(); await flushPromises()
    const values = wrapper.findAll('.info-value').map(v => v.text())
    expect(values.filter(value => value === '--')).toHaveLength(1)
    expect(values[3]).toBe('123.5M')
    expect(values[4]).toBe('0')
  })

  it('accepts an older backend that serves registered users instead of tokens', async () => {
    const { totalTokens: _tokens, ...legacy } = stats
    vi.mocked(getDashboardStats).mockResolvedValue({ code: 0, message: '', data: legacy as DashboardStats })
    render(); await flushPromises()
    expect(wrapper.findAll('.info-value').map(v => v.text())).toEqual(['42', '1.3k', '20k', '123.5M', '--'])
  })

  it.each([
    [null, '--'], ['1049', '1k'], ['1050', '1.1k'], ['9007199254740991950', '9007199.3T'],
    ['123456789012349999999999', '123456789012.3T'], ['123456789012350000000000', '123456789012.4T'],
  ])('formats token totals exactly: %s', async (totalTokens, expected) => {
    vi.mocked(getDashboardStats).mockResolvedValue({ code: 0, message: '', data: { ...stats, totalTokens } })
    render(); await flushPromises()
    const item = wrapper.findAll('.info-value')[4]!
    expect(item.text()).toBe(expected)
    if (totalTokens) expect(item.attributes('title')).toBe(BigInt(totalTokens).toLocaleString('zh-CN'))
  })

  it('shows a real zero for empty resources and handles large values without losing the full value', async () => {
    vi.mocked(getDashboardStats).mockResolvedValue({ code: 0, message: '', data: {
      ...stats, totalAgents: 0, totalSkills: 0, totalDocuments: 9007199254740991,
    } })
    render(); await flushPromises()
    expect(wrapper.findAll('.info-value').map(v => v.text())).toEqual(['0', '0', '9007.2T', '123.5M', '0'])
    expect(wrapper.findAll('.info-value')[2]!.attributes('title')).toBe('9,007,199,254,740,991')
  })

  it('shows unavailable values after a query error', async () => {
    vi.mocked(getDashboardStats).mockRejectedValue(new Error('offline'))
    render(); await flushPromises()
    expect(wrapper.attributes('aria-busy')).toBe('false')
    expect(wrapper.findAll('.info-value').map(v => v.text())).toEqual(['--', '--', '--', '--', '--'])
  })

  it('aborts queries after five seconds and on unmount', async () => {
    vi.useFakeTimers()
    vi.mocked(getDashboardStats).mockImplementation(signal => new Promise((_, reject) => {
      signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }))
    render(); await flushPromises()
    const signal = vi.mocked(getDashboardStats).mock.calls[0]![0]!
    await vi.advanceTimersByTimeAsync(5_000)
    expect(signal.aborted).toBe(true)
    expect(wrapper.attributes('aria-busy')).toBe('false')
    wrapper.unmount()
    render(); await flushPromises()
    const nextSignal = vi.mocked(getDashboardStats).mock.calls[1]![0]!
    wrapper.unmount()
    expect(nextSignal.aborted).toBe(true)
  })

  it('does not query when unmounted while waiting for the visit', async () => {
    let finish!: () => void
    vi.mocked(waitForPlatformVisit).mockReturnValue(new Promise(resolve => { finish = resolve }))
    render(); wrapper.unmount(); finish(); await flushPromises()
    expect(getDashboardStats).not.toHaveBeenCalled()
  })
})
