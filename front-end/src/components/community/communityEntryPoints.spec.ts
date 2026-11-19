// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { i18n } from '@/i18n'
import AgentCommunity from '@/views/community/agents/index.vue'
import KnowledgeCommunity from '@/views/community/knowledge/index.vue'
import HotAgents from '@/components/dashboard/HotAgentSection.vue'
import HotSkills from '@/components/dashboard/HotPluginSection.vue'
import HotKnowledge from '@/components/dashboard/HotKnowledgeSection.vue'
import SkillPicker from '@/components/agents/create/PluginSelectDialog.vue'
import KnowledgePicker from '@/components/agents/create/KbSelectDialog.vue'
import { getAgentCommunityList, getHotAgents } from '@/api/agent'
import { getSkillCommunityList, getMySkillList } from '@/api/skill'
import { getKnowledgeBaseCommunityList, getMyKnowledgeBaseList } from '@/api/knowledgeBase'

vi.mock('@/api/agent', () => ({ getAgentCommunityList: vi.fn(), getHotAgents: vi.fn() }))
vi.mock('@/api/skill', () => ({ getSkillCommunityList: vi.fn(), getMySkillList: vi.fn(), getSkillDetail: vi.fn() }))
vi.mock('@/api/knowledgeBase', () => ({ getKnowledgeBaseCommunityList: vi.fn(), getMyKnowledgeBaseList: vi.fn() }))
vi.mock('@/api/myContent', () => ({ getFavoritePlugins: vi.fn(), getFavoriteKnowledgeBases: vi.fn() }))

let wrapper: VueWrapper | undefined
function globalOptions() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
  return { plugins: [createPinia(), i18n, router], stubs: { teleport: true } }
}
beforeEach(() => {
  vi.resetAllMocks()
  i18n.global.locale.value = 'zh-CN'
  const empty = { code: 0, message: '', data: { list: [], total: 0, totalPages: 0, pageNum: 1, pageSize: 10 } }
  vi.mocked(getAgentCommunityList).mockResolvedValue(empty)
  vi.mocked(getSkillCommunityList).mockResolvedValue(empty)
  vi.mocked(getKnowledgeBaseCommunityList).mockResolvedValue(empty)
  vi.mocked(getHotAgents).mockResolvedValue({ code: 0, message: '', data: [] })
  vi.mocked(getMySkillList).mockResolvedValue({ ...empty, data: {
    ...empty.data, list: [{ id: 11, name: 'My skill', categoryCode: 'other', authorId: 7 }], total: 1, totalPages: 1,
  } })
  vi.mocked(getMyKnowledgeBaseList).mockResolvedValue({ ...empty, data: {
    ...empty.data, list: [{
      id: 11, name: 'My knowledge', kbCode: 'KB', description: '', ownerUserId: 7, status: 'active', visibility: 'public',
      documentCount: 0, chunkCount: 0, totalFileSize: 0, createdAt: '', updatedAt: '',
    }], total: 1, totalPages: 1,
  } })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

it.each([
  ['Agent community', AgentCommunity, getAgentCommunityList],
  ['Knowledge community', KnowledgeCommunity, getKnowledgeBaseCommunityList],
  ['Hot Skills', HotSkills, getSkillCommunityList],
  ['Hot knowledge', HotKnowledge, getKnowledgeBaseCommunityList],
] as const)('%s explicitly includes the current author', async (_name, component, request) => {
  wrapper = shallowMount(component, { global: globalOptions() })
  await flushPromises()
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ includeMine: true }))
})

it('hot Agents explicitly include the current author', async () => {
  wrapper = shallowMount(HotAgents, { global: globalOptions() })
  await flushPromises()
  expect(getHotAgents).toHaveBeenCalledWith(6, true)
})

it('Skill binding keeps mine separate from others and preserves selections across categories', async () => {
  wrapper = shallowMount(SkillPicker, {
    props: { visible: false, agentName: 'Agent', categoryLabel: 'Other', categoryId: '6', selectedIds: ['11'] },
    global: globalOptions(),
  })
  await wrapper.setProps({ visible: true }); await flushPromises()
  expect(getMySkillList).toHaveBeenCalledWith(expect.objectContaining({ status: 2 }))
  await wrapper.get('select').setValue('community'); await flushPromises()
  expect(getSkillCommunityList).toHaveBeenCalledWith(expect.objectContaining({ includeMine: false, pageNum: 1 }))
  await wrapper.get('select').setValue('mine'); await flushPromises()
  expect(getMySkillList).toHaveBeenCalledTimes(2)
  expect(wrapper.findComponent({ name: 'SkillPickerCard' }).props('selected')).toBe(true)
  const confirm = wrapper.findAll('button').find(button => button.text().includes('确认添加'))!
  await confirm.trigger('click')
  expect(wrapper.emitted('confirm')?.[0]).toEqual([['11'], { '11': { name: 'My skill', icon: undefined } }])
})

it('knowledge binding keeps mine separate from others and preserves selections across categories', async () => {
  wrapper = shallowMount(KnowledgePicker, {
    props: { visible: false, agentName: 'Agent', selectedIds: ['11'] }, global: globalOptions(),
  })
  await wrapper.setProps({ visible: true }); await flushPromises()
  expect(getMyKnowledgeBaseList).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }))
  await wrapper.get('select').setValue('community'); await flushPromises()
  expect(getKnowledgeBaseCommunityList).toHaveBeenCalledWith(expect.objectContaining({ includeMine: false, pageNum: 1 }))
  await wrapper.get('select').setValue('mine'); await flushPromises()
  expect(getMyKnowledgeBaseList).toHaveBeenCalledTimes(2)
  expect(wrapper.findComponent({ name: 'KnowledgeBasePickerCard' }).props('selected')).toBe(true)
  const confirm = wrapper.findAll('button').find(button => button.text().includes('确认添加'))!
  await confirm.trigger('click')
  expect(wrapper.emitted('confirm')?.[0]).toEqual([['11'], { '11': { name: 'My knowledge', icon: undefined } }])
})
