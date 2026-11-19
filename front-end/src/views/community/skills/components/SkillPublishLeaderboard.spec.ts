// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import { Avatar } from '@/components/base'
import { skillLeaderboardEn, skillLeaderboardZh } from '@/i18n/messages/skillLeaderboard'
import SkillPublishLeaderboard from './SkillPublishLeaderboard.vue'
import { useSkillPublishLeaderboard } from '../hooks/useSkillPublishLeaderboard'

vi.mock('../hooks/useSkillPublishLeaderboard', () => ({ useSkillPublishLeaderboard: vi.fn() }))

const author = (id: number, count = 12) => ({
  authorId: id,
  authorName: `作者 ${id}`,
  avatar: `/avatar-${id}.png`,
  publishedCount: count,
  rank: id,
  isCurrentUser: id === 2,
})

function makeState() {
  const total = ref(120)
  return {
    loading: ref(false),
    error: ref(''),
    refreshFailed: ref(false),
    hasLoaded: ref(true),
    entries: ref(Array.from({ length: 100 }, (_, index) => author(index + 1, index === 0 ? 1234 : 12))),
    total,
    myEntry: ref<ReturnType<typeof author> | null>(author(2)),
    revision: ref(1),
    refresh: vi.fn(),
    retry: vi.fn(),
  }
}

let state: ReturnType<typeof makeState>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  vi.clearAllMocks()
  state = makeState()
  vi.mocked(useSkillPublishLeaderboard).mockReturnValue(
    state as unknown as ReturnType<typeof useSkillPublishLeaderboard>,
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

async function render(locale = 'zh-CN') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/community/skills', component: { template: '<div />' } },
      { path: '/skills/create', component: { template: '<div />' } },
    ],
  })
  await router.push('/community/skills')
  wrapper = mount(SkillPublishLeaderboard, {
    attachTo: document.body,
    global: {
      plugins: [
        createPinia(), router,
        createI18n({
          legacy: false,
          locale,
          messages: {
            'zh-CN': { skillLeaderboard: skillLeaderboardZh },
            'en-US': { skillLeaderboard: skillLeaderboardEn },
          },
        }),
      ],
    },
  })
  await flushPromises()
  return { view: wrapper, router }
}

describe('Skill publish leaderboard panel', () => {
  it('shows 100 consecutive creators without paging, exact counts and safe decorative avatars', async () => {
    const { view } = await render()
    expect(view.findAll('.ranking-row')).toHaveLength(100)
    expect(view.get('.ranking-row:last-child').text()).toContain('作者 100')
    expect(view.get('.board-meta').text()).toContain('前 100 名')
    expect(view.get('.board-meta').text()).toContain('100 位创作者')
    expect(view.get('.board-meta').text()).not.toContain('120')
    expect(view.find('.leaderboard-pagination').exists()).toBe(false)
    expect(view.findAll('.page-button')).toHaveLength(0)
    expect(view.get('.list-end').text()).toBe('已到榜单底部')
    expect(view.get('.published-count').text()).toBe('1,234个')
    expect(view.get('.my-ranking').text()).toContain('第 2 名')
    expect(view.get('.my-ranking').text()).toContain('公开发布 12 个')
    expect(view.find('table').exists()).toBe(false)
    expect(view.findAllComponents(Avatar).every((avatar) =>
      avatar.props('decorative') && avatar.props('enableProfileFallback') === false,
    )).toBe(true)
    expect(view.findAll('.ranking-row a')).toHaveLength(0)
    expect(view.get('.my-row').text()).toContain('作者 2')
    expect(view.get('.my-row').text()).toContain('我')
  })

  it('keeps the heading and personal rank outside the independently scrollable region', async () => {
    const { view } = await render()
    const region = view.get('.leaderboard-scroll')
    expect(region.attributes('tabindex')).toBe('0')
    expect(region.findAll('.ranking-row')).toHaveLength(100)
    expect(region.find('.leaderboard-header').exists()).toBe(false)
    expect(region.find('.leaderboard-footer').exists()).toBe(false)
    expect(view.get('.leaderboard-footer').find('.my-ranking').exists()).toBe(true)
    expect(view.get('.leaderboard-footer').find('.leaderboard-pagination').exists()).toBe(false)
  })

  it('refreshes independently and keeps all 100 old rows visible during refresh or failure', async () => {
    const { view } = await render()
    await view.get('.refresh-button').trigger('click')
    expect(state.refresh).toHaveBeenCalledOnce()
    state.loading.value = true
    await flushPromises()
    expect(view.findAll('.ranking-row')).toHaveLength(100)
    expect(view.get('.leaderboard-scroll').attributes('aria-busy')).toBe('true')
    expect(view.get('.refresh-button').attributes('disabled')).toBeDefined()
    state.loading.value = false
    state.refreshFailed.value = true
    state.error.value = skillLeaderboardZh.refreshFailed
    await flushPromises()
    expect(view.findAll('.ranking-row')).toHaveLength(100)
    expect(view.get('.error-notice').text()).toContain('已保留上次结果')
    expect(view.get('.leaderboard-header').find('.error-notice').exists()).toBe(true)
    expect(view.get('.leaderboard-scroll').find('.error-notice').exists()).toBe(false)
    await view.get('.retry-button').trigger('click')
    expect(state.retry).toHaveBeenCalledOnce()
  })

  it('resets only the ranking scroll position after a successful refresh', async () => {
    const { view } = await render()
    const region = view.get<HTMLElement>('.leaderboard-scroll').element
    const documentScroll = vi.spyOn(window, 'scrollTo')
    region.scrollTop = 180
    state.error.value = skillLeaderboardZh.refreshFailed
    await flushPromises()
    expect(region.scrollTop).toBe(180)
    state.revision.value += 1
    await flushPromises()
    expect(region.scrollTop).toBe(0)
    expect(documentScroll).not.toHaveBeenCalled()
    documentScroll.mockRestore()
  })

  it('shows initial loading and load errors without inventing an empty board or zero rank', async () => {
    state.hasLoaded.value = false
    state.loading.value = true
    state.total.value = 0
    const { view } = await render()
    expect(view.findAll('.skeleton-entry')).toHaveLength(6)
    expect(view.find('.my-ranking').exists()).toBe(false)
    state.loading.value = false
    state.error.value = skillLeaderboardZh.loadFailed
    await flushPromises()
    expect(view.get('[role="alert"]').text()).toContain('发布榜加载失败')
    expect(view.find('.empty-state').exists()).toBe(false)
    expect(view.find('.my-ranking').exists()).toBe(false)
  })

  it('shows an empty board with a zero-count personal summary and the existing publish route', async () => {
    state.total.value = 0
    state.entries.value = []
    state.myEntry.value = null
    const { view, router } = await render()
    expect(view.get('.empty-title').text()).toBe('暂无公开发布的 Skill')
    expect(view.get('.my-ranking').text()).toContain('暂未上榜')
    expect(view.get('.my-ranking').text()).toContain('公开发布 0 个')
    expect(view.find('.leaderboard-pagination').exists()).toBe(false)
    await view.get('.my-ranking .publish-link').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/skills/create')
  })

  it('keeps the personal global rank even when the user is outside the top 100', async () => {
    state.myEntry.value = { ...author(118, 3), isCurrentUser: true }
    const { view } = await render()
    expect(view.get('.my-ranking').text()).toContain('第 118 名')
    expect(view.get('.my-ranking').text()).toContain('公开发布 3 个')
    expect(view.get('.ranking-list').text()).not.toContain('作者 118')
  })

  it('shows only available creators when fewer than 100 qualify', async () => {
    state.entries.value = [author(1), author(2)]
    state.total.value = 2
    const { view } = await render()
    expect(view.findAll('.ranking-row')).toHaveLength(2)
    expect(view.get('.board-meta').text()).toContain('2 位创作者')
    expect(view.find('.leaderboard-pagination').exists()).toBe(false)
  })

  it('renders English labels, rules and the personal summary without untranslated keys', async () => {
    state.myEntry.value = null
    const { view } = await render('en-US')
    expect(view.text()).toContain('Skill leaderboard')
    expect(view.text()).toContain('Top 100')
    expect(view.text()).toContain('End of the leaderboard')
    expect(view.text()).toContain('Equal counts share a rank.')
    expect(view.get('.my-ranking').text()).toContain('0 public Skills')
    expect(view.text()).not.toContain('skillLeaderboard.')
  })
})
