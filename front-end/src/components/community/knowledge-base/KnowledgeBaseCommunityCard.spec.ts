// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'
import { i18n } from '@/i18n'
import { addFavoriteKnowledgeBase, cancelFavoriteKnowledgeBase, checkFavoriteKnowledgeBase, type MyKnowledgeBaseItem } from '@/api/knowledgeBase'
import KnowledgeBaseCommunityCard from './KnowledgeBaseCommunityCard.vue'

vi.mock('@/api/knowledgeBase', () => ({
  addFavoriteKnowledgeBase: vi.fn(), cancelFavoriteKnowledgeBase: vi.fn(), checkFavoriteKnowledgeBase: vi.fn(),
}))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() } }))
let wrapper: VueWrapper | undefined
let pinia: ReturnType<typeof createPinia>
const item = (ownerUserId: number, id = 1): MyKnowledgeBaseItem => ({
  id, ownerUserId, kbCode: 'KB', name: 'Public knowledge', description: '', visibility: 'public', status: 'active',
  documentCount: 1, chunkCount: 1, totalFileSize: 10, createdAt: '2026-10-22', updatedAt: '2026-10-22',
})
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  pinia = createPinia(); setActivePinia(pinia)
  useUserStore().userInfo = { id: 7, username: 'Me', account: 'me', phone: '', avatar: '' }
  i18n.global.locale.value = 'zh-CN'
  vi.mocked(checkFavoriteKnowledgeBase).mockResolvedValue({ code: 0, message: '', data: false })
  vi.mocked(addFavoriteKnowledgeBase).mockResolvedValue({ code: 0, message: '', data: undefined })
  vi.mocked(cancelFavoriteKnowledgeBase).mockResolvedValue({ code: 0, message: '', data: undefined })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })
function render(owner: number) {
  wrapper = mount(KnowledgeBaseCommunityCard, { props: { item: item(owner) }, global: { plugins: [pinia, i18n] } })
  return wrapper
}

it('shows ownership and skips favorite requests for my knowledge base', async () => {
  const card = render(7)
  await flushPromises()
  expect(card.text()).toContain('我创建的')
  expect(card.find('.fav-btn').exists()).toBe(false)
  expect(checkFavoriteKnowledgeBase).not.toHaveBeenCalled()
  expect(addFavoriteKnowledgeBase).not.toHaveBeenCalled()
  i18n.global.locale.value = 'en-US'; await flushPromises()
  expect(card.text()).toContain('Created by me')
})

it('keeps favorite and unfavorite actions for other authors', async () => {
  const card = render(8)
  await flushPromises()
  expect(checkFavoriteKnowledgeBase).toHaveBeenCalledWith(1)
  await card.get('.fav-btn').trigger('click'); await flushPromises()
  expect(addFavoriteKnowledgeBase).toHaveBeenCalledWith(1)
  expect(card.get('.fav-btn').text()).toContain('已收藏')
  await card.get('.fav-btn').trigger('click'); await flushPromises()
  expect(cancelFavoriteKnowledgeBase).toHaveBeenCalledWith(1)
})

it('re-evaluates ownership on reused cards and ignores an old favorite response', async () => {
  let finish!: (value: { code: number; message: string; data: boolean }) => void
  vi.mocked(checkFavoriteKnowledgeBase).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const card = render(8)
  await card.setProps({ item: item(7, 2) })
  finish({ code: 0, message: '', data: true }); await flushPromises()
  expect(card.find('.fav-btn').exists()).toBe(false)
  expect(checkFavoriteKnowledgeBase).toHaveBeenCalledTimes(1)
  useUserStore().userInfo = { id: 9, username: 'Next', account: 'next', phone: '', avatar: '' }
  await flushPromises()
  expect(checkFavoriteKnowledgeBase).toHaveBeenLastCalledWith(2)
  expect(card.get('.fav-btn').text()).not.toContain('已收藏')
})
