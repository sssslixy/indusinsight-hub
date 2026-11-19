// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import SkillCommunity from './index.vue'
import {
  getSkillCommunityList,
  getSkillPublishLeaderboard,
  type SkillPublishLeaderboardResponse,
} from '@/api/skill'
import zhCN from '@/i18n/messages/zh-CN'

vi.mock('@/api/skill', () => ({
  getSkillCommunityList: vi.fn(),
  getSkillPublishLeaderboard: vi.fn(),
}))
vi.mock('@/components/dashboard/DashboardHeader.vue', () => ({
  default: { template: '<header />' },
}))
vi.mock('@/components/AppFooter.vue', () => ({ default: { template: '<footer />' } }))

const response = <T>(data: T) => ({ code: 0, message: 'success', data })
const ranking: SkillPublishLeaderboardResponse = {
  rankingPage: {
    list: Array.from({ length: 100 }, (_, i) => ({
      authorId: i + 1,
      authorName: `创作者${i + 1}`,
      avatar: null,
      rank: i + 1,
      publishedCount: 200 - i,
      isCurrentUser: false,
    })),
    total: 150,
    pageNum: 1,
    pageSize: 100,
    totalPages: 2,
  },
  myEntry: null,
}
const wrappers: ReturnType<typeof mount>[] = []
async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/community/skills', component: SkillCommunity },
      { path: '/skills/create', component: { template: '<div />' } },
    ],
  })
  await router.push('/community/skills')
  await router.isReady()
  const wrapper = mount(SkillCommunity, {
    global: {
      plugins: [
        router,
        createPinia(),
        createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } }),
      ],
    },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('scrollTo', vi.fn())
  vi.mocked(getSkillCommunityList).mockResolvedValue(
    response({
      list: [
        {
          id: 101,
          name: '可用的数据清洗 Skill',
          authorName: '作者',
          categoryCode: 'data_processing',
        },
      ],
      pageNum: 1,
      pageSize: 10,
      total: 12,
      totalPages: 2,
    }),
  )
  vi.mocked(getSkillPublishLeaderboard).mockResolvedValue(response(ranking))
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.unstubAllGlobals()
})

describe('Skill community leaderboard integration', () => {
  it('keeps the catalogue usable when the leaderboard fails', async () => {
    vi.mocked(getSkillPublishLeaderboard).mockRejectedValue(new Error('Leaderboard unavailable'))
    const wrapper = await setup()
    expect(wrapper.find('.publish-leaderboard').text()).toContain('发布榜加载失败')
    expect(wrapper.find('.skill-card-list').text()).toContain('可用的数据清洗 Skill')
    expect(wrapper.find('.error-banner').exists()).toBe(false)
    await wrapper.get('.search-input').setValue('清洗')
    await wrapper.get('.search-btn').trigger('click')
    await flushPromises()
    expect(getSkillCommunityList).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: '清洗', includeMine: true }),
    )
    expect(getSkillPublishLeaderboard).toHaveBeenCalledTimes(1)
  })

  it('shows one scrollable hundred-author list and keeps refresh independent of catalogue filters and pagination', async () => {
    const wrapper = await setup()
    const leaderboard = wrapper.get('.publish-leaderboard')
    expect(leaderboard.find('.expand-button').exists()).toBe(false)
    expect(leaderboard.find('.page-button').exists()).toBe(false)
    expect(leaderboard.findAll('.ranking-row')).toHaveLength(100)
    expect(leaderboard.text()).toContain('创作者100')
    expect(getSkillPublishLeaderboard).toHaveBeenCalledOnce()
    expect(getSkillPublishLeaderboard).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 100 })
    const scroller = leaderboard.get<HTMLElement>('.leaderboard-scroll')
    scroller.element.scrollTop = 500
    await scroller.trigger('scroll')
    expect(getSkillPublishLeaderboard).toHaveBeenCalledOnce()
    expect(getSkillCommunityList).toHaveBeenCalledOnce()
    await leaderboard.get('.refresh-button').trigger('click')
    await flushPromises()
    expect(getSkillCommunityList).toHaveBeenCalledTimes(1)
    expect(scrollTo).not.toHaveBeenCalled()
    expect(scroller.element.scrollTop).toBe(0)
    expect(getSkillPublishLeaderboard).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 100 })
    await wrapper.find('.filter-bar').findAll('select')[0]!.setValue('feature_engineering')
    await flushPromises()
    expect(getSkillCommunityList).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryCode: 'feature_engineering', includeMine: true }),
    )
    await wrapper.find('.pagination').findAll('.page-btn')[1]!.trigger('click')
    await flushPromises()
    expect(getSkillCommunityList).toHaveBeenLastCalledWith(expect.objectContaining({ pageNum: 2, includeMine: true }))
    expect(getSkillPublishLeaderboard).toHaveBeenCalledTimes(2)
  })
})
