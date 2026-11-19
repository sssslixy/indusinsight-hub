// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { getSkillPublishLeaderboard, type SkillPublishLeaderboardResponse } from '@/api/skill'
import { useSkillPublishLeaderboard } from './useSkillPublishLeaderboard'

vi.mock('@/api/skill', () => ({ getSkillPublishLeaderboard: vi.fn() }))

const response = (data: SkillPublishLeaderboardResponse) => ({ code: 0, message: 'success', data })
function board(total = 180, returnedCount = Math.min(100, total)): SkillPublishLeaderboardResponse {
  const myId = Math.min(151, total)
  return {
    rankingPage: {
      list: Array.from(
        { length: returnedCount },
        (_, i) => ({
          authorId: i + 1,
          authorName: `Author ${i + 1}`,
          avatar: null,
          publishedCount: 200 - i,
          rank: i + 1,
          isCurrentUser: i + 1 === myId,
        }),
      ),
      pageNum: 1,
      pageSize: 100,
      total,
      totalPages: Math.ceil(total / 100),
    },
    myEntry: total
      ? {
          authorId: myId,
          authorName: 'Me',
          avatar: null,
          publishedCount: 2,
          rank: myId,
          isCurrentUser: true,
        }
      : null,
  }
}
function deferred() {
  let resolve!: (value: ReturnType<typeof response>) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<ReturnType<typeof response>>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { resolve, reject, promise }
}
const wrappers: ReturnType<typeof mount>[] = []
function setup() {
  let state!: ReturnType<typeof useSkillPublishLeaderboard>
  const wrapper = mount(
    defineComponent({
      setup() {
        state = useSkillPublishLeaderboard()
        return () => null
      },
    }),
    {
      global: {
        plugins: [
          createI18n({
            legacy: false,
            locale: 'zh-CN',
            messages: {
              'zh-CN': { skillLeaderboard: { loadFailed: '加载失败', refreshFailed: '刷新失败' } },
            },
          }),
        ],
      },
    },
  )
  wrappers.push(wrapper)
  return { state, wrapper }
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getSkillPublishLeaderboard).mockResolvedValue(response(board()))
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('Skill publish leaderboard state', () => {
  it('loads the first hundred authors in one request and keeps a personal rank outside the list', async () => {
    const { state } = setup()
    await flushPromises()
    expect(getSkillPublishLeaderboard).toHaveBeenCalledOnce()
    expect(getSkillPublishLeaderboard).toHaveBeenCalledWith({ pageNum: 1, pageSize: 100 })
    expect(state.entries.value).toHaveLength(100)
    expect(state.entries.value[99]?.authorId).toBe(100)
    expect(state.total.value).toBe(180)
    expect(state.myEntry.value?.rank).toBe(151)
    expect(state.entries.value.some((entry) => entry.authorId === 151)).toBe(false)
    expect(state.revision.value).toBe(1)
  })

  it('defensively limits the visible list to one hundred without changing the total or personal rank', async () => {
    vi.mocked(getSkillPublishLeaderboard).mockResolvedValueOnce(response(board(180, 125)))
    const { state } = setup()
    await flushPromises()
    expect(state.entries.value).toHaveLength(100)
    expect(state.entries.value[99]?.rank).toBe(100)
    expect(state.total.value).toBe(180)
    expect(state.myEntry.value?.rank).toBe(151)
  })

  it('retains the current list while refreshing and updates revision only on success', async () => {
    const { state } = setup()
    await flushPromises()
    const pending = deferred()
    vi.mocked(getSkillPublishLeaderboard).mockReturnValueOnce(pending.promise)
    const request = state.refresh()
    expect(getSkillPublishLeaderboard).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 100 })
    expect(state.entries.value).toHaveLength(100)
    expect(state.myEntry.value?.rank).toBe(151)
    expect(state.revision.value).toBe(1)
    pending.resolve(response(board(7)))
    await request
    expect(state.entries.value).toHaveLength(7)
    expect(state.total.value).toBe(7)
    expect(state.revision.value).toBe(2)
  })

  it('ignores older successful responses and follows the latest refresh', async () => {
    const { state } = setup()
    await flushPromises()
    const pending = deferred()
    vi.mocked(getSkillPublishLeaderboard).mockReturnValueOnce(pending.promise)
    const firstRefresh = state.refresh()
    vi.mocked(getSkillPublishLeaderboard).mockResolvedValueOnce(response(board(2)))
    await state.refresh()
    pending.resolve(response(board()))
    await firstRefresh
    expect(state.total.value).toBe(2)
    expect(state.entries.value).toHaveLength(2)
    expect(state.revision.value).toBe(2)
    expect(state.loading.value).toBe(false)
  })

  it('does not let an older failed request overwrite a newer successful refresh', async () => {
    const { state } = setup()
    await flushPromises()
    const pending = deferred()
    vi.mocked(getSkillPublishLeaderboard).mockReturnValueOnce(pending.promise)
    const firstRefresh = state.refresh()
    vi.mocked(getSkillPublishLeaderboard).mockResolvedValueOnce(response(board(3)))
    await state.refresh()
    pending.reject(new Error('Old request failed'))
    await firstRefresh
    expect(state.total.value).toBe(3)
    expect(state.error.value).toBe('')
    expect(state.revision.value).toBe(2)
  })

  it('keeps the latest failure visible if an older successful response arrives afterward', async () => {
    const { state } = setup()
    await flushPromises()
    const pending = deferred()
    vi.mocked(getSkillPublishLeaderboard).mockReturnValueOnce(pending.promise)
    const firstRefresh = state.refresh()
    vi.mocked(getSkillPublishLeaderboard).mockRejectedValueOnce(new Error('Refresh failed'))
    await state.refresh()
    pending.resolve(response(board(2)))
    await firstRefresh
    expect(state.total.value).toBe(180)
    expect(state.error.value).toBe('刷新失败')
    expect(state.revision.value).toBe(1)
    expect(state.loading.value).toBe(false)
  })

  it('retains successful data and revision after a failed refresh and retries the same hundred-author request', async () => {
    const { state } = setup()
    await flushPromises()
    vi.mocked(getSkillPublishLeaderboard).mockRejectedValueOnce(new Error('Offline'))
    await state.refresh()
    expect(state.entries.value).toHaveLength(100)
    expect(state.myEntry.value?.rank).toBe(151)
    expect(state.refreshFailed.value).toBe(true)
    expect(state.error.value).toBe('刷新失败')
    expect(state.revision.value).toBe(1)
    vi.mocked(getSkillPublishLeaderboard).mockResolvedValueOnce(response(board(2)))
    await state.retry()
    expect(getSkillPublishLeaderboard).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 100 })
    expect(state.entries.value).toHaveLength(2)
    expect(state.error.value).toBe('')
    expect(state.revision.value).toBe(2)
  })

  it('distinguishes initial failure from an empty successful board', async () => {
    vi.mocked(getSkillPublishLeaderboard).mockRejectedValueOnce(new Error('Offline'))
    const { state } = setup()
    await flushPromises()
    expect(state.hasLoaded.value).toBe(false)
    expect(state.error.value).toBe('加载失败')
    expect(state.revision.value).toBe(0)
    vi.mocked(getSkillPublishLeaderboard).mockResolvedValueOnce(response(board(0)))
    await state.retry()
    expect(state.hasLoaded.value).toBe(true)
    expect(state.entries.value).toHaveLength(0)
    expect(state.total.value).toBe(0)
    expect(state.myEntry.value).toBeNull()
    expect(state.error.value).toBe('')
    expect(state.revision.value).toBe(1)
  })

  it('ignores responses after unmount', async () => {
    const pending = deferred()
    vi.mocked(getSkillPublishLeaderboard).mockReturnValueOnce(pending.promise)
    const { state, wrapper } = setup()
    wrapper.unmount()
    pending.resolve(response(board()))
    await flushPromises()
    expect(state.hasLoaded.value).toBe(false)
    expect(state.revision.value).toBe(0)
    expect(getSkillPublishLeaderboard).toHaveBeenCalledTimes(1)
  })
})
