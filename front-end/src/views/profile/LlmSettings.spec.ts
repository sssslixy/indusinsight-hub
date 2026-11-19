// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import LlmSettings from './LlmSettings.vue'
import LlmBindingPicker from '@/components/agents/LlmBindingPicker.vue'
import CreateAgent from '@/views/agents/create/index.vue'
import ProfileInfoCard from '@/components/profile/ProfileInfoCard.vue'
import { i18n } from '@/i18n'
import * as api from '@/api/llm'

vi.mock('@/api/llm', async importOriginal => ({ ...await importOriginal<typeof import('@/api/llm')>(),
  getLlmProviders: vi.fn(), getLlmConnections: vi.fn(), createLlmConnection: vi.fn(), updateLlmConnection: vi.fn(),
  deleteLlmConnection: vi.fn(), addLlmModel: vi.fn(), updateLlmModel: vi.fn(), deleteLlmModel: vi.fn(), validateLlmModel: vi.fn(),
  getAvailableModels: vi.fn(), preflightLlm: vi.fn(), discoverLlmModels: vi.fn(),
}))
const response = <T,>(data: T) => ({ code: 0, message: '', data })
const model = { id: '101', connectionId: '1', connectionName: 'Work', providerCode: 'deepseek', modelCode: 'org/Model-A', displayName: 'Analysis', enabled: true, validationStatus: 'unverified' as const, available: false }
const connection = { id: '1', configVersion: '1', name: 'Work', providerCode: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKeyMasked: '****1234', enabled: true, models: [model] }
let wrapper: VueWrapper
let warn: ReturnType<typeof vi.spyOn>
const body = () => new DOMWrapper(document.body)
const button = (label: string, scope: DOMWrapper<Element> = body()) => scope.findAll('button').find(b => b.text() === label)!
async function settle() { await flushPromises(); await nextTick() }
async function render(component: typeof LlmSettings | typeof LlmBindingPicker = LlmSettings) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/profile/llm')
  wrapper = mount(component, { attachTo: document.body, props: component === LlmBindingPicker ? { agentId: '2', models: [model], result: { mode: 'public', ready: false, locked: false, llmBindings: {}, requirements: {}, issues: {} }, open: true } : {}, global: { plugins: [createPinia(), router, i18n] } })
  await settle()
  return router
}
async function openConnection(edit = false) { await button(edit ? '编辑' : '＋ 新增 API 连接').trigger('click'); await settle() }
function fields() { return body().find('.el-dialog').findAll('input') }
function field(label: string) {
  const item = body().findAll('.el-form-item').find(item => item.find('label').text().includes(label))!
  return item.find('input')
}

beforeEach(() => {
  vi.resetAllMocks()
  i18n.global.locale.value = 'zh-CN'
  vi.mocked(api.getLlmProviders).mockResolvedValue(response([{ code: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' }]))
  vi.mocked(api.getLlmConnections).mockResolvedValue(response([]))
  vi.mocked(api.createLlmConnection).mockResolvedValue(response({ id: '2' }))
  vi.mocked(api.updateLlmConnection).mockResolvedValue(response(null))
  vi.mocked(api.addLlmModel).mockResolvedValue(response(null))
  vi.mocked(api.discoverLlmModels).mockResolvedValue(response({ status: 'success', connectionId: '1', configVersion: '1', fetchedAt: '', models: [] }))
  vi.mocked(api.validateLlmModel).mockResolvedValue(response({ valid: true }))
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('real Element Plus settings components', () => {
  it('uses success, neutral and error tones for policy feedback independently', async () => {
    const policy = { state: 'switchable' as const, supported: true }
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([{ ...connection, models: [
      { ...model, id: '101', available: true, validationStatus: 'valid', inferencePolicy: policy },
      { ...model, id: '102', inferencePolicy: policy },
      { ...model, id: '103', validationStatus: 'invalid', lastErrorCode: 'llm_thinking_not_disabled', inferencePolicy: { ...policy, supported: false, errorCode: 'llm_thinking_unsupported' } },
    ] }]))
    await render()
    const statuses = wrapper.findAll('.model-status')
    expect(statuses[0]!.find('p').classes()).toContain('status-detail--success')
    expect(statuses[0]!.text()).toContain('非思考模式验证通过')
    expect(statuses[1]!.find('p').classes()).not.toContain('status-detail--error')
    expect(statuses[1]!.find('p').classes()).not.toContain('status-detail--success')
    expect(statuses[2]!.findAll('p').every(p => p.classes().includes('status-detail--error'))).toBe(true)
  })
  it('edits a custom profile without changing the model ID and preserves version checks', async () => {
    vi.mocked(api.updateLlmModel).mockResolvedValue(response(null))
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([{ ...connection, models: [{ ...model, modelConfigVersion: '7',
      inferenceConfig: { profile: 'enable_thinking_false', temperatureMode: 'default', maxOutputTokens: 4096, documentationUrl: 'https://example.com/docs', confirmed: true },
    }] }]))
    await render(); await button('调用设置').trigger('click'); await settle()
    expect((field('模型标识').element as HTMLInputElement).disabled).toBe(true)
    expect(body().text()).toContain('我已确认此接口和型号支持')
    await button('保存模型').trigger('click'); await settle()
    expect(api.updateLlmModel).toHaveBeenCalledWith('101', expect.objectContaining({ expectedModelConfigVersion: '7', inferenceConfig: expect.objectContaining({ profile: 'enable_thinking_false', confirmed: true }) }))
    expect(api.addLlmModel).not.toHaveBeenCalled(); expect(api.validateLlmModel).not.toHaveBeenCalled()
    expect(document.querySelector('el-input-number,el-checkbox')).toBeNull()
  })
  it('shows failed validation step and non-thinking reason in both languages', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([{ ...connection, models: [{ ...model, available: false, validationStatus: 'invalid', lastErrorCode: 'llm_thinking_not_disabled', inferenceCapabilities: { failedStep: 'tools' } }] }]))
    await render()
    expect(body().text()).toContain('工具调用验证'); expect(body().text()).toContain('接口未遵守关闭思考约定')
    i18n.global.locale.value = 'en-US'; await settle()
    expect(body().text()).toContain('Tool call validation'); expect(body().text()).toContain('did not honor disabled thinking')
  })
  it('uses the shared SVG back button and keeps profile return navigation', async () => {
    const router = await render()
    const back = button('返回个人中心')
    expect(back.classes()).toContain('back-button')
    expect(back.find('svg path').exists()).toBe(true)
    expect(back.text()).not.toContain('←')
    await back.trigger('click'); await settle()
    expect(router.currentRoute.value.path).toBe('/profile')
  })
  it('keeps deletion failures in the real confirmation dialog and prevents double submit', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([connection]))
    let reject!: (reason: Error) => void
    vi.mocked(api.deleteLlmConnection).mockReturnValueOnce(new Promise((_r, fail) => { reject = fail }))
    await render(); await button('删除').trigger('click'); await settle()
    const dialog = body().find('.llm-delete-dialog')
    expect(dialog.attributes('style')).toContain('400px')
    await button('删除', dialog).trigger('click'); await settle()
    await button('删除', dialog).trigger('click')
    expect(api.deleteLlmConnection).toHaveBeenCalledTimes(1)
    expect(button('取消', dialog).attributes('disabled')).toBeDefined()
    reject(new Error('llm_internal_unreachable')); await settle()
    expect(body().find('.llm-delete-dialog').text()).toContain('无法连接 Python')
    vi.mocked(api.deleteLlmConnection).mockResolvedValueOnce(response(null))
    await button('删除', body().find('.llm-delete-dialog')).trigger('click'); await settle()
    expect(api.deleteLlmConnection).toHaveBeenCalledTimes(2)
    expect(api.deleteLlmModel).not.toHaveBeenCalled()
  })
  it('discovers searchable options, disables duplicates and preserves an edited display name', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([connection]))
    vi.mocked(api.discoverLlmModels).mockResolvedValue(response({ status: 'success', connectionId: '1', configVersion: '1', fetchedAt: '', models: [
      { modelCode: model.modelCode, displayName: model.displayName, alreadyAdded: true },
      { modelCode: 'Org/First', displayName: 'First', alreadyAdded: false },
      { modelCode: 'Org/Second', displayName: 'Second', alreadyAdded: false },
    ] }))
    await render(); await button('＋ 添加模型').trigger('click'); await settle()
    expect(api.discoverLlmModels).toHaveBeenCalledWith('1')
    await button('保存模型').trigger('click'); await settle()
    expect(api.addLlmModel).not.toHaveBeenCalled()
    await body().find('.llm-model-dialog .el-select').trigger('click'); await settle()
    const options = body().findAll('.llm-discovery-popper .el-select-dropdown__item')
    expect(options[0]!.classes()).toContain('is-disabled')
    await options[1]!.trigger('click'); await settle()
    expect((field('显示名称').element as HTMLInputElement).value).toBe('First')
    await field('显示名称').setValue('My label')
    await body().find('.llm-model-dialog .el-select').trigger('click'); await settle()
    await options[2]!.trigger('click'); await settle()
    expect((field('显示名称').element as HTMLInputElement).value).toBe('My label')
    await button('保存模型').trigger('click'); await settle()
    expect(api.addLlmModel).toHaveBeenCalledWith('1', { modelCode: 'Org/Second', displayName: 'My label', expectedConfigVersion: '1', inferenceConfig: { profile: 'auto' } })
    expect(api.validateLlmModel).not.toHaveBeenCalled()
    expect(document.querySelector('el-select,el-option')).toBeNull()
    // Saving must also release the original connection's busy state after closing.
    expect(button('＋ 添加模型').attributes('disabled')).toBeUndefined()
  })
  it('allows manual entry while fetching and ignores replies from a closed dialog', async () => {
    let resolve!: (value: ReturnType<typeof response<api.ModelDiscovery>>) => void
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([connection]))
    vi.mocked(api.discoverLlmModels).mockReturnValueOnce(new Promise(done => { resolve = done }))
    await render(); await button('＋ 添加模型').trigger('click'); await settle()
    expect(body().text()).toContain('正在查询模型列表')
    await button('手动输入模型标识').trigger('click'); await settle()
    await field('模型标识').setValue('Manual/ID')
    await button('取消').trigger('click'); await settle()
    await button('＋ 添加模型').trigger('click'); await settle()
    resolve(response({ status: 'success', connectionId: '1', configVersion: '1', fetchedAt: '', models: [{ modelCode: 'Old', displayName: 'OLD RESPONSE', alreadyAdded: false }] }))
    await settle()
    expect(body().text()).not.toContain('OLD RESPONSE')
    expect(body().text()).toContain('模型列表为空')
  })
  it('keeps options and input on refresh failure and blocks stale configuration saves', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([connection]))
    vi.mocked(api.discoverLlmModels).mockResolvedValueOnce(response({ status: 'partial', connectionId: '1', configVersion: '1', fetchedAt: '', models: [{ modelCode: 'Partial', displayName: 'Partial', alreadyAdded: false }], errorCode: 'llm_timeout' }))
    await render(); await button('＋ 添加模型').trigger('click'); await settle()
    expect(body().text()).toContain('仅获取到部分模型')
    await button('手动输入模型标识').trigger('click'); await settle()
    await field('模型标识').setValue('Manual/ID')
    vi.mocked(api.discoverLlmModels).mockRejectedValueOnce(new Error('llm_invalid_key'))
    await button('刷新列表').trigger('click'); await settle()
    expect(body().text()).toContain('刷新失败，保留上次查询结果')
    expect(body().text()).toContain('API Key 无效')
    expect((field('模型标识').element as HTMLInputElement).value).toBe('Manual/ID')
    vi.mocked(api.discoverLlmModels).mockResolvedValueOnce(response({ status: 'success', connectionId: '1', configVersion: '2', fetchedAt: '', models: [] }))
    await button('刷新列表').trigger('click'); await settle()
    expect(body().text()).toContain('连接配置已变更')
    await button('保存模型').trigger('click'); await settle()
    expect(api.addLlmModel).not.toHaveBeenCalled()
  })
  it('shows unsupported discovery separately and saves manually without automatic validation', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([connection]))
    vi.mocked(api.discoverLlmModels).mockResolvedValueOnce(response({ status: 'unsupported', connectionId: '1', configVersion: '1', fetchedAt: '', models: [], errorCode: 'llm_discovery_unsupported' }))
    await render(); await button('＋ 添加模型').trigger('click'); await settle()
    expect(body().text()).toContain('不支持自动查询')
    await button('手动输入模型标识').trigger('click'); await settle()
    await field('模型标识').setValue('Custom/ID')
    vi.mocked(api.addLlmModel).mockRejectedValueOnce(new Error('llm_model_already_added'))
    await button('保存模型').trigger('click'); await settle()
    expect(body().text()).toContain('该模型已添加')
    expect((field('模型标识').element as HTMLInputElement).value).toBe('Custom/ID')
    expect(api.validateLlmModel).not.toHaveBeenCalled()
    i18n.global.locale.value = 'en-US'; await settle()
    expect(body().text()).toContain('Choose from model list')
    expect(body().text()).toContain('does not support model discovery')
  })
  it('opens a real dialog, associates labels, closes and clears the key without leaking unregistered tags', async () => {
    await render()
    expect(body().find('.el-dialog').exists()).toBe(false)
    await openConnection()
    const inputs = fields()
    expect(inputs.length).toBe(4)
    await inputs[3]!.setValue('test-only-secret')
    expect(body().find('label[for="' + inputs[3]!.attributes('id') + '"]').exists()).toBe(true)
    await button('取消').trigger('click')
    await settle()
    expect(body().find('input[type="password"]').exists()).toBe(false)
    await openConnection()
    expect((fields()[3]!.element as HTMLInputElement).value).toBe('')
    expect(document.querySelector('el-dialog, el-button, el-input, el-select, el-form')).toBeNull()
    expect(warn.mock.calls.flat().join(' ')).not.toContain('Failed to resolve component')
    expect(localStorage.getItem('apiKey')).toBeNull()
  })
  it('submits once, preserves nonsecret fields on failure and supports retry', async () => {
    let reject!: (reason: Error) => void
    vi.mocked(api.createLlmConnection).mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail }))
    await render(); await openConnection()
    await fields()[0]!.setValue('My model')
    await field('API Key').setValue('test-only-secret')
    await button('保存连接').trigger('click'); await settle()
    await button('保存连接').trigger('click')
    expect(api.createLlmConnection).toHaveBeenCalledTimes(1)
    expect(api.createLlmConnection).toHaveBeenCalledWith({ name: 'My model', providerCode: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKey: 'test-only-secret' })
    reject(new Error('unsafe upstream test-only-secret'))
    await settle()
    expect((fields()[0]!.element as HTMLInputElement).value).toBe('My model')
    expect((fields()[3]!.element as HTMLInputElement).value).toBe('')
    expect(body().text()).not.toContain('test-only-secret')
    expect(body().find('.form-feedback').exists()).toBe(true)
    await field('API Key').setValue('new-test-key')
    await button('保存连接').trigger('click'); await settle()
    expect(api.createLlmConnection).toHaveBeenCalledTimes(2)
    expect(body().find('input[type="password"]').exists()).toBe(false)
  })
  it('keeps a saved key by omission; URL changes require a new key and HTTPS', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([connection]))
    await render(); await openConnection(true)
    await button('保存连接').trigger('click'); await settle()
    expect(api.updateLlmConnection).toHaveBeenCalledWith('1', { name: 'Work', providerCode: 'deepseek', baseUrl: 'https://api.deepseek.com/v1' })
    await openConnection(true)
    await field('API 根地址').setValue('http://private.test/v1')
    await button('保存连接').trigger('click'); await settle()
    expect(api.updateLlmConnection).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(body().text()).toContain('请输入 HTTPS'))
    await field('API 根地址').setValue('https://new.example.test/v1')
    await button('保存连接').trigger('click'); await settle()
    expect(api.updateLlmConnection).toHaveBeenCalledTimes(1)
    await field('API Key').setValue('replacement-key')
    await button('保存连接').trigger('click'); await settle()
    expect(api.updateLlmConnection).toHaveBeenLastCalledWith('1', expect.objectContaining({ apiKey: 'replacement-key', baseUrl: 'https://new.example.test/v1' }))
  })
  it('loads connections independently of providers and preserves data on refresh failure', async () => {
    vi.mocked(api.getLlmProviders).mockRejectedValue(new Error('offline'))
    vi.mocked(api.getLlmConnections).mockResolvedValueOnce(response([connection])).mockRejectedValue(new Error('offline'))
    await render()
    expect(body().text()).toContain('Work')
    expect(body().text()).toContain('服务商目录加载失败')
    await button('刷新').trigger('click'); await settle()
    expect(body().text()).toContain('刷新失败')
    expect(body().text()).toContain('Work')
    await openConnection(true)
    expect(body().find('.el-dialog').exists()).toBe(true)
  })
  it('distinguishes initial loading, failure and empty states', async () => {
    let reject!: (reason: Error) => void
    vi.mocked(api.getLlmConnections).mockReturnValueOnce(new Promise((_r, fail) => { reject = fail }))
    await render()
    expect(body().text()).toContain('正在加载连接')
    expect(body().text()).not.toContain('连接你的第一个模型')
    reject(new Error('offline')); await settle()
    expect(body().text()).toContain('无法加载连接')
    expect(body().text()).not.toContain('连接你的第一个模型')
    await button('重试').trigger('click'); await settle()
    expect(body().text()).toContain('连接你的第一个模型')
  })
  it('adds the exact case-sensitive model ID, prevents duplicate validation, and displays failure and disabled states', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([connection]))
    await render()
    await button('＋ 添加模型').trigger('click'); await settle()
    await button('手动输入模型标识').trigger('click'); await settle()
    await fields()[0]!.setValue('Org/Exact-Model')
    await button('保存模型').trigger('click'); await settle()
    expect(api.addLlmModel).toHaveBeenCalledWith('1', { modelCode: 'Org/Exact-Model', displayName: 'Org/Exact-Model', expectedConfigVersion: '1', inferenceConfig: { profile: 'auto' } })
    let resolve!: (value: ReturnType<typeof response<{ valid: boolean; errorCode?: string }>>) => void
    vi.mocked(api.validateLlmModel).mockReturnValueOnce(new Promise(done => { resolve = done }))
    await button('验证').trigger('click'); await settle()
    await button('验证').trigger('click')
    expect(api.validateLlmModel).toHaveBeenCalledTimes(1)
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([{ ...connection, models: [{ ...model, validationStatus: 'invalid', lastErrorCode: 'llm_invalid_key' }] }]))
    resolve(response({ valid: false, errorCode: 'llm_invalid_key' })); await settle()
    expect(body().text()).toContain('验证失败')
    expect(body().text()).toContain('API Key 无效')
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([{ ...connection, enabled: false }]))
    await button('刷新').trigger('click'); await settle()
    expect(button('验证').attributes('disabled')).toBeDefined()
    expect(body().text()).toContain('已禁用')
  })
  it('translates the full settings dialog to English', async () => {
    await render(); await openConnection()
    i18n.global.locale.value = 'en-US'; await nextTick()
    expect(body().text()).toContain('Models & API')
    expect(body().text()).toContain('Connection name')
    expect(body().text()).toContain('Save connection')
    expect(body().text()).not.toContain('新增 API 连接')
  })
  it('requires confirmation before deleting a connection', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([connection]))
    await render(); await button('删除').trigger('click'); await settle()
    expect(body().find('.llm-delete-dialog').exists()).toBe(true)
    expect(body().find('.llm-delete-dialog').text()).toContain('后续运行和恢复将不可用')
    await button('取消', body().find('.llm-delete-dialog')).trigger('click'); await settle()
    expect(api.deleteLlmConnection).not.toHaveBeenCalled()
  })
  it('registers the real run binding controls', async () => {
    vi.mocked(api.getAvailableModels).mockResolvedValue(response([model]))
    vi.mocked(api.preflightLlm).mockResolvedValue(response({ mode: 'public', ready: false, llmBindings: {}, locked: false, requirements: {}, issues: {} }))
    await render(LlmBindingPicker)
    expect(body().findAll('.el-select')).toHaveLength(7)
    expect(document.querySelector('el-button, el-select, el-option')).toBeNull()
    expect(warn.mock.calls.flat().join(' ')).not.toContain('Failed to resolve component')
  })
  it('shows available, expired and disabled model statuses separately', async () => {
    vi.mocked(api.getLlmConnections).mockResolvedValue(response([{ ...connection, models: [
      { ...model, id: '101', available: true, validationStatus: 'valid' },
      { ...model, id: '102', validationStatus: 'valid' },
      { ...model, id: '103', enabled: false, validationStatus: 'valid' },
    ] }]))
    await render()
    expect(wrapper.findAll('.model-status .status').map(s => s.text())).toEqual(['可使用', '需要重新验证', '已禁用'])
  })
  it('registers the create page assistant picker without replacing Element components with stubs', async () => {
    vi.mocked(api.getAvailableModels).mockResolvedValue(response([model]))
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/agents/create', component: { template: '<div />' } }] })
    await router.push('/agents/create')
    wrapper = mount(CreateAgent, { global: { plugins: [createPinia(), router, i18n], stubs: {
      DashboardHeader: true, CreateAgentHeader: true, AgentBasicInfoCard: true,
      AgentWorkflowNav: true, AgentConfigPanel: true, AgentPromptEditor: true,
    } } })
    await settle()
    await wrapper.find('.follow-dp input').setValue(false)
    expect(wrapper.find('.assistant-card select').exists()).toBe(true)
    expect(document.querySelector('el-select, el-option, el-button')).toBeNull()
    expect(warn.mock.calls.flat().join(' ')).not.toContain('Failed to resolve component')
    expect(wrapper.find('a[target="_blank"]').attributes('href')).toBe('/profile/llm')
  })
  it('keeps model settings after password actions with language switching moved to the header', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
    await router.push('/profile')
    wrapper = mount(ProfileInfoCard, { props: { loading: false, userProfile: { id: 1, hasPassword: true, username: 'Tester', account: 'test', phone: '', avatar: '', status: 1, statusLabel: '', lastLoginAt: '', createdAt: '', passwordUpdatedAt: '' } }, global: { plugins: [router, i18n] } })
    const labels = wrapper.findAll('.profile-actions .action-btn').map(b => b.text())
    expect(labels).toEqual(['更换头像', '修改密码', '模型与 API'])
    await wrapper.findAll('.profile-actions .action-btn').find(button => button.text() === '模型与 API')!.trigger('click'); await settle()
    expect(router.currentRoute.value.path).toBe('/profile/llm')
  })
})
