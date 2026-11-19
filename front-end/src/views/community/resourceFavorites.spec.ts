// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { i18n } from '@/i18n'
import AgentUsePage from '@/views/agents/use/index.vue'
import SkillCreatePage from '@/views/skills/create/SkillCreatePage.vue'
import AgentInfoCard from '@/components/agents/workbench/AgentWorkbenchAgentInfoCard.vue'
import CreatePluginHeader from '@/components/plugins/create/CreatePluginHeader.vue'
import * as agentApi from '@/api/agent'
import * as myContentApi from '@/api/myContent'
import * as skillApi from '@/api/skill'

vi.mock('@/api/agent', async original => ({
  ...await original<typeof import('@/api/agent')>(), getAgentDetail: vi.fn(),
}))
vi.mock('@/api/myContent', async original => ({
  ...await original<typeof import('@/api/myContent')>(),
  checkFavoriteAgent: vi.fn(), addFavoriteAgent: vi.fn(), cancelFavoriteAgent: vi.fn(),
}))
vi.mock('@/api/skill', async original => ({
  ...await original<typeof import('@/api/skill')>(), getSkillDetail: vi.fn(), addSkillView: vi.fn(),
  checkFavoriteSkill: vi.fn(), addFavoriteSkill: vi.fn(), cancelFavoriteSkill: vi.fn(),
}))
vi.mock('@/api/task', async original => ({
  ...await original<typeof import('@/api/task')>(), getTaskHistory: vi.fn().mockResolvedValue({ data: [] }),
}))
vi.mock('@/api/llm', async original => ({
  ...await original<typeof import('@/api/llm')>(),
  getAvailableModels: vi.fn().mockResolvedValue({ data: [] }),
  preflightLlm: vi.fn().mockResolvedValue({ data: { mode: 'owner', ready: true, llmBindings: {} } }),
}))
vi.mock('element-plus', () => ({ ElMessage: Object.assign(vi.fn(), { error: vi.fn() }) }))

const response = <T,>(data: T) => ({ code: 0, message: '', data })
const agentDetail = (id = 9, authorId = 7): agentApi.AgentDetailResponse => ({
  id, authorId, authorName: 'Author', agentName: 'Public Agent', status: 2, isPublic: 1,
  favoriteCount: 0, likeCount: 0, viewCount: 0, useCount: 0, sessionCount: 0, isLatest: false, isHot: false,
})
const skillDetail = (id = 9, authorId = 7) => ({ skill: { id, authorId, name: 'Public Skill', status: 2, visibility: 1 } })
const resources = [
  {
    name: 'Agent', component: AgentUsePage, header: AgentInfoCard,
    button: '.toolbar-btn--favorite', path: (id = 9) => `/agents/${id}/use?from=community`,
    check: myContentApi.checkFavoriteAgent, add: myContentApi.addFavoriteAgent, cancel: myContentApi.cancelFavoriteAgent,
    setDetail: (id: number, owner: number) => vi.mocked(agentApi.getAgentDetail).mockResolvedValue(response(agentDetail(id, owner))),
    deferDetail: () => {
      let finish!: (id: number, owner: number) => void
      vi.mocked(agentApi.getAgentDetail).mockReturnValueOnce(new Promise(resolve => {
        finish = (id, owner) => resolve(response(agentDetail(id, owner)))
      }))
      return (id: number, owner: number) => finish(id, owner)
    },
    failDetail: () => vi.mocked(agentApi.getAgentDetail).mockRejectedValueOnce(new Error('unavailable')),
  },
  {
    name: 'Skill', component: SkillCreatePage, header: CreatePluginHeader,
    button: '.action-btn--favorite', path: (id = 9) => `/skills/create?id=${id}&from=community`,
    check: skillApi.checkFavoriteSkill, add: skillApi.addFavoriteSkill, cancel: skillApi.cancelFavoriteSkill,
    setDetail: (id: number, owner: number) => vi.mocked(skillApi.getSkillDetail).mockResolvedValue(response(skillDetail(id, owner))),
    deferDetail: () => {
      let finish!: (id: number, owner: number) => void
      vi.mocked(skillApi.getSkillDetail).mockReturnValueOnce(new Promise(resolve => {
        finish = (id, owner) => resolve(response(skillDetail(id, owner)))
      }))
      return (id: number, owner: number) => finish(id, owner)
    },
    failDetail: () => vi.mocked(skillApi.getSkillDetail).mockRejectedValueOnce(new Error('unavailable')),
  },
] as const

let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  i18n.global.locale.value = 'zh-CN'
  for (const resource of resources) {
    resource.setDetail(9, 7)
    vi.mocked(resource.check).mockResolvedValue(response(false))
    vi.mocked(resource.add).mockResolvedValue(response(undefined))
    vi.mocked(resource.cancel).mockResolvedValue(response(undefined))
  }
  vi.mocked(skillApi.addSkillView).mockResolvedValue(response(undefined))
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

describe.each(resources)('$name community favorites', resource => {
  async function render() {
    const pinia = createPinia()
    const user = useUserStore(pinia)
    user.setLoginInfo('token', { id: 7, username: 'Me', account: 'me', phone: '', avatar: '' })
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/agents/:id/use', component: { template: '<div />' } },
      { path: '/skills/create', component: { template: '<div />' } },
    ] })
    await router.push(resource.path())
    const page = shallowMount(resource.component, { global: {
      plugins: [pinia, router, i18n],
      stubs: { AgentWorkbenchAgentInfoCard: false, CreatePluginHeader: false },
    } })
    wrapper = page
    await flushPromises()
    return { page, user, router }
  }

  it('waits for the author and hides my favorite action without an ownership label', async () => {
    const finish = resource.deferDetail()
    const { page } = await render()
    expect(page.find(resource.button).exists()).toBe(false)
    expect(resource.check).not.toHaveBeenCalled()
    finish(9, 7); await flushPromises()
    expect(page.find(resource.button).exists()).toBe(false)
    expect(page.text()).not.toContain('我创建的')
    page.getComponent(resource.header).vm.$emit('favorite'); await flushPromises()
    expect(resource.check).not.toHaveBeenCalled()
    expect(resource.add).not.toHaveBeenCalled()
    expect(resource.cancel).not.toHaveBeenCalled()
    i18n.global.locale.value = 'en-US'; await flushPromises()
    expect(page.text()).not.toContain('Created by me')
    if (resource.name === 'Skill') expect(page.getComponent(CreatePluginHeader).props('readOnly')).toBe(true)
  })

  it('keeps favorite and unfavorite available for another author', async () => {
    resource.setDetail(9, 8)
    const { page } = await render()
    expect(resource.check).toHaveBeenCalledExactlyOnceWith(9)
    expect(page.text()).not.toContain('我创建的')
    await page.get(resource.button).trigger('click'); await flushPromises()
    expect(resource.add).toHaveBeenCalledExactlyOnceWith(9)
    expect(page.get(resource.button).text()).toContain('取消收藏')
    await page.get(resource.button).trigger('click'); await flushPromises()
    expect(resource.cancel).toHaveBeenCalledExactlyOnceWith(9)
  })

  it('does not offer favorites when the author cannot be loaded', async () => {
    resource.failDetail()
    const { page } = await render()
    expect(page.find(resource.button).exists()).toBe(false)
    expect(resource.check).not.toHaveBeenCalled()
  })

  it('re-evaluates ownership on account changes and ignores the previous favorite response', async () => {
    resource.setDetail(9, 8)
    let finish!: (value: ReturnType<typeof response<boolean>>) => void
    vi.mocked(resource.check).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const { page, user } = await render()
    expect(page.get(resource.button).attributes('disabled')).toBeDefined()
    user.setLoginInfo('next-token', { id: 8, username: 'Author', account: 'author', phone: '', avatar: '' })
    await flushPromises()
    finish(response(true)); await flushPromises()
    expect(page.find(resource.button).exists()).toBe(false)
    expect(page.text()).not.toContain('我创建的')
    expect(resource.check).toHaveBeenCalledTimes(1)
    user.setLoginInfo('third-token', { id: 10, username: 'Other', account: 'other', phone: '', avatar: '' })
    await flushPromises()
    expect(resource.check).toHaveBeenCalledTimes(2)
    expect(page.get(resource.button).text()).not.toContain('取消收藏')
  })

  it('keeps my resource hidden from favorites after rapid navigation and out-of-order details', async () => {
    const finishOld = resource.deferDetail()
    const { page, router } = await render()
    resource.setDetail(10, 7)
    await router.push(resource.path(10)); await flushPromises()
    expect(page.find(resource.button).exists()).toBe(false)
    finishOld(9, 8); await flushPromises()
    expect(page.find(resource.button).exists()).toBe(false)
    expect(resource.check).not.toHaveBeenCalled()
  })

  it('restores ownership when returning before the next resource finishes loading', async () => {
    const { page, router } = await render()
    const finishNext = resource.deferDetail()
    await router.push(resource.path(10)); await flushPromises()
    await router.push(resource.path(9)); await flushPromises()
    expect(page.find(resource.button).exists()).toBe(false)
    finishNext(10, 8); await flushPromises()
    expect(page.find(resource.button).exists()).toBe(false)
    expect(resource.check).not.toHaveBeenCalled()
  })

  it('ignores an in-flight favorite action after navigating to my own resource', async () => {
    resource.setDetail(9, 8)
    let finish!: (value: ReturnType<typeof response<undefined>>) => void
    vi.mocked(resource.add).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const { page, router } = await render()
    await page.get(resource.button).trigger('click')
    resource.setDetail(10, 7)
    await router.push(resource.path(10)); await flushPromises()
    finish(response(undefined)); await flushPromises()
    expect(page.find(resource.button).exists()).toBe(false)
    expect(page.text()).not.toContain('我创建的')
    expect(resource.check).toHaveBeenCalledExactlyOnceWith(9)
    expect(resource.add).toHaveBeenCalledExactlyOnceWith(9)
  })
})
