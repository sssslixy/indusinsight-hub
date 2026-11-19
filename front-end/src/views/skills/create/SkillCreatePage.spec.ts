// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import SkillCreatePage from './SkillCreatePage.vue'
import SkillBasicForm from '@/components/skills/create/SkillBasicForm.vue'
import SkillArtifactForm from '@/components/skills/create/SkillArtifactForm.vue'
import CreatePluginHeader from '@/components/plugins/create/CreatePluginHeader.vue'
import { useUserStore } from '@/stores/user'
import { i18n } from '@/i18n'
import * as skillApi from '@/api/skill'
import * as llmApi from '@/api/llm'
import type { SkillValidationResponse } from '@/api/skill'

vi.mock('@/api/skill', () => ({
  saveSkillDraft: vi.fn(), publishSkill: vi.fn(), validateSkillPackage: vi.fn(), retrySkillMetadata: vi.fn(), getSkillDetail: vi.fn(),
  addSkillView: vi.fn(), addFavoriteSkill: vi.fn(), cancelFavoriteSkill: vi.fn(), checkFavoriteSkill: vi.fn(),
  downloadSkillArtifact: vi.fn(), uploadSkillIcon: vi.fn(),
}))
vi.mock('@/api/llm', async original => ({ ...await original<typeof import('@/api/llm')>(), getAvailableModels: vi.fn() }))
vi.mock('element-plus', () => ({ ElMessage: vi.fn() }))

const response = <T,>(data: T) => ({ code: 0, message: '', data })
const model = (id: string, connectionName: string): llmApi.UserLlmModel => ({
  id, connectionId: id, connectionName, providerCode: 'deepseek', modelCode: 'same-model', displayName: 'Analysis',
  enabled: true, available: true, validationStatus: 'valid',
})
const models = [model('101', 'First'), model('102', 'Second')]
const staticResult = (): SkillValidationResponse => ({
  passed: true, fatalCount: 0, warningCount: 0, infoCount: 0, issues: [],
  validationToken: 'static-token', artifactSha256: 'zip-hash', llmStatus: 'skipped', llmSkipReason: 'no_model',
})
const scored = (score = 80, id = '101'): SkillValidationResponse => ({
  ...staticResult(), validationId: 'review-id', reviewRulesVersion: 'skill-review-v2', metadataPromptVersion: 'skill-metadata-v3',
  reviewCoverage: { complete: true, characters: 500, files: [] }, minimumPublishScore: 80,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), validationToken: 'scored-token', llmStatus: 'succeeded', llmSkipReason: null,
  metadataStatus: 'succeeded', generatedName: 'AI name', generatedDescription: 'AI description',
  llmAnalysis: { score, dimensions: (() => {
    let remaining = score
    return ([['purpose', 15], ['usefulness', 35], ['accuracy', 25], ['conditions', 15], ['usability', 10]] as const).map(([id, maxScore]) => {
      const value = Math.min(remaining, maxScore); remaining -= value
      return { id, score: value, maxScore, explanation: 'Source evidence', deductions: [], evidence: [] }
    })
  })() }, llmModel: { userModelId: id, modelCode: 'same-model', displayName: 'Analysis', connectionName: 'First' },
})
let wrapper: VueWrapper
async function render(path = '/skills/create', userId = 7) {
  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push(path)
  const user = useUserStore(pinia)
  user.setLoginInfo('test-token', { id: userId, username: 'Tester', account: 'tester', phone: '', avatar: '' })
  wrapper = mount(SkillCreatePage, {
    global: { plugins: [pinia, router, i18n], stubs: { DashboardHeader: true, SkillBasicForm: true } },
  })
  await flushPromises()
  return { router, user }
}
async function chooseFile(name = 'skill.zip') {
  const file = new File(['zip'], name, { type: 'application/zip' })
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  return file
}
async function fill() {
  const basic = wrapper.getComponent(SkillBasicForm)
  basic.vm.$emit('update:modelValue', { ...basic.props('modelValue'), name: 'A skill', categoryCode: 'other' })
  await chooseFile()
}
async function validate() { await wrapper.get('.validation-btn').trigger('click'); await flushPromises() }
async function publish() { await wrapper.get('.action-btn--primary').trigger('click'); await flushPromises() }
async function save() { await wrapper.get('.action-btn--outline').trigger('click'); await flushPromises() }

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  i18n.global.locale.value = 'zh-CN'
  vi.mocked(llmApi.getAvailableModels).mockResolvedValue(response(models))
  vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response(staticResult()))
  vi.mocked(skillApi.saveSkillDraft).mockResolvedValue(response({ skillId: 9 }))
  vi.mocked(skillApi.publishSkill).mockResolvedValue(response({ skillId: 9 }))
  vi.mocked(skillApi.getSkillDetail).mockResolvedValue(response({ skill: { id: 9, name: 'A skill', categoryCode: 'other', minioObjectKey: 'skill/9.zip', fileName: 'saved.zip' } }))
  vi.mocked(skillApi.checkFavoriteSkill).mockResolvedValue(response(false))
  vi.mocked(skillApi.addSkillView).mockResolvedValue(response(undefined))
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks() })

async function returnFromAnotherTab() {
  const visibility = vi.spyOn(document, 'visibilityState', 'get')
  visibility.mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  visibility.mockReturnValue('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  await flushPromises()
}

describe('personal Skill scoring', () => {
  it('allows spec-only validation and a draft without a personal model, but blocks publishing', async () => {
    vi.mocked(llmApi.getAvailableModels).mockResolvedValue(response([]))
    await render(); await fill()
    expect(wrapper.text()).toContain('暂无可用模型')
    expect(wrapper.get('a[href="/profile/llm"]').attributes('target')).toBe('_blank')
    await validate()
    expect(skillApi.validateSkillPackage).toHaveBeenCalledWith(expect.objectContaining({ validationUserModelId: undefined }), expect.any(File))
    expect(wrapper.text()).toContain('尚未完成模型评分')
    await publish(); expect(skillApi.publishSkill).not.toHaveBeenCalled()
    await save(); expect(skillApi.saveSkillDraft).toHaveBeenCalledTimes(1)
  })

  it('restores only a still-available choice for the current user without calling the model', async () => {
    localStorage.setItem('skill-validation-model:7', '102')
    localStorage.setItem('skill-validation-model:8', '101')
    const { user } = await render()
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('102')
    expect(wrapper.text()).toContain('Analysis · First'); expect(wrapper.text()).toContain('Analysis · Second')
    expect(skillApi.validateSkillPackage).not.toHaveBeenCalled()
    user.setLoginInfo('another-token', { id: 8, account: 'another', username: 'Other', phone: '', avatar: '' })
    await flushPromises()
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('101')
    await wrapper.get('select').setValue('')
    expect(localStorage.getItem('skill-validation-model:8')).toBeNull()
    expect(localStorage.getItem('skill-validation-model:7')).toBe('102')
  })

  it('does not substitute another model for an unavailable stored choice', async () => {
    localStorage.setItem('skill-validation-model:7', 'deleted')
    await render()
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('')
    expect(localStorage.getItem('skill-validation-model:7')).toBeNull()
    expect(skillApi.validateSkillPackage).not.toHaveBeenCalled()
  })

  it('submits the chosen personal model for validation and publishing at exactly 80', async () => {
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response(scored(80, '102')))
    await render(); await fill(); await wrapper.get('select').setValue('102'); await validate(); await publish()
    expect(skillApi.validateSkillPackage).toHaveBeenCalledWith(expect.objectContaining({ validationUserModelId: '102' }), expect.any(File))
    expect(skillApi.publishSkill).toHaveBeenCalledWith(expect.objectContaining({ validationUserModelId: '102', validationToken: 'scored-token' }), expect.any(File))
    expect(localStorage.getItem('skill-validation-model:7')).toBe('102')
  })

  it.each([79, undefined, Number.NaN])('blocks publishing when the score is %s', async score => {
    const result = scored(); result.llmAnalysis = { score }
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response(result))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate(); await publish()
    expect(skillApi.publishSkill).not.toHaveBeenCalled()
    await save(); expect(skillApi.saveSkillDraft).toHaveBeenCalledTimes(1)
  })

  it('rejects a score for another model and clears validation after an explicit model or file change', async () => {
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response(scored(80, '102')))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate(); await publish()
    expect(skillApi.publishSkill).not.toHaveBeenCalled()
    await wrapper.get('select').setValue('102')
    expect(wrapper.find('.llm-score').exists()).toBe(false)
    expect(wrapper.get('.action-btn--primary').attributes('disabled')).toBeDefined()
    await validate(); expect(wrapper.find('.llm-score').exists()).toBe(true)
    await chooseFile('replacement.zip')
    expect(wrapper.find('.llm-score').exists()).toBe(false)
  })

  it('retains a passing spec on scoring failure and safely translates errors in both languages', async () => {
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response({ ...staticResult(), llmStatus: 'failed', llmSkipReason: null, llmErrorCode: 'llm_insufficient_balance' }))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate()
    expect(wrapper.text()).toContain('规范测试通过，但模型评分失败')
    expect(wrapper.text()).toContain('模型账户余额不足')
    i18n.global.locale.value = 'en-US'; await flushPromises()
    expect(wrapper.text()).toContain('Insufficient model account balance')
    await publish(); expect(skillApi.publishSkill).not.toHaveBeenCalled()
    await save(); expect(skillApi.saveSkillDraft).toHaveBeenCalledWith(expect.objectContaining({ validationUserModelId: '101', validationToken: 'static-token' }), expect.any(File))
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }))
  })

  it('locks file/model edits and all submissions during a paid request, then ignores a stale file response', async () => {
    let resolve!: (value: ReturnType<typeof response<SkillValidationResponse>>) => void
    vi.mocked(skillApi.validateSkillPackage).mockReturnValue(new Promise(done => { resolve = done }))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate()
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.btn-clear').attributes('disabled')).toBeDefined()
    const artifact = wrapper.getComponent(SkillArtifactForm)
    artifact.vm.$emit('validate'); artifact.vm.$emit('update:validationUserModelId', '102')
    wrapper.getComponent(CreatePluginHeader).vm.$emit('saveDraft')
    wrapper.getComponent(CreatePluginHeader).vm.$emit('publish')
    await flushPromises()
    expect(skillApi.validateSkillPackage).toHaveBeenCalledTimes(1)
    expect(skillApi.saveSkillDraft).not.toHaveBeenCalled(); expect(skillApi.publishSkill).not.toHaveBeenCalled()
    expect(artifact.props('validationUserModelId')).toBe('101')
    // A programmatic route/form update can still occur despite disabled controls.
    artifact.vm.$emit('update:modelValue', { skillFile: new File(['new'], 'new.zip') })
    await flushPromises(); resolve(response(scored(100))); await flushPromises()
    expect(wrapper.find('.llm-score').exists()).toBe(false)
    expect(wrapper.get('.action-btn--primary').attributes('disabled')).toBeDefined()
  })

  it('clears an unavailable unscored choice on refresh without reuploading or automatically scoring', async () => {
    await render(); const file = await chooseFile(); await wrapper.get('select').setValue('101')
    vi.mocked(llmApi.getAvailableModels).mockResolvedValue(response([models[1]!]))
    await returnFromAnotherTab()
    expect(wrapper.getComponent(SkillArtifactForm).props('modelValue').skillFile).toBe(file)
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('')
    expect(localStorage.getItem('skill-validation-model:7')).toBeNull()
    expect(skillApi.validateSkillPackage).not.toHaveBeenCalled()
  })

  it.each([79, 80])('preserves a completed score of %s when its model becomes unavailable', async score => {
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response(scored(score)))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate()
    vi.mocked(llmApi.getAvailableModels).mockResolvedValue(response([models[1]!]))
    await returnFromAnotherTab()
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('101')
    expect(wrapper.get('option[value="101"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('option[value="101"]').text()).toContain('Analysis')
    expect(wrapper.get('.llm-score').text()).toContain(String(score))
    expect(wrapper.text()).toContain('已完成评分在验证有效期内仍可使用')
    await validate()
    expect(skillApi.validateSkillPackage).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.llm-score').text()).toContain(String(score))
    await publish()
    if (score >= 80) {
      expect(skillApi.publishSkill).toHaveBeenCalledWith(expect.objectContaining({ validationUserModelId: '101', validationToken: 'scored-token' }), expect.any(File))
    } else {
      expect(skillApi.publishSkill).not.toHaveBeenCalled()
    }
  })

  it('keeps a paid result when a pending icon upload completes during scoring', async () => {
    let finishUpload!: (value: ReturnType<typeof response<string>>) => void
    let finishScoring!: (value: ReturnType<typeof response<SkillValidationResponse>>) => void
    vi.mocked(skillApi.uploadSkillIcon).mockReturnValue(new Promise(done => { finishUpload = done }))
    vi.mocked(skillApi.validateSkillPackage).mockReturnValue(new Promise(done => { finishScoring = done }))
    await render(); await fill(); await wrapper.get('select').setValue('101')
    wrapper.getComponent(SkillBasicForm).vm.$emit('upload-icon', new File(['image'], 'icon.png'))
    await flushPromises(); await validate()
    expect(skillApi.validateSkillPackage).toHaveBeenCalledWith(expect.objectContaining({ iconUrl: 'system-1' }), expect.any(File))
    finishUpload(response('https://example.com/uploaded-icon.png')); await flushPromises()
    finishScoring(response(scored(80))); await flushPromises()
    expect(wrapper.get('.llm-score').text()).toContain('80')
    await publish()
    expect(skillApi.publishSkill).toHaveBeenCalledWith(expect.objectContaining({ validationToken: 'scored-token', iconUrl: 'https://example.com/uploaded-icon.png' }), expect.any(File))
  })

  it('does not fetch personal models or show scoring controls in the community view', async () => {
    await render('/skills/create?id=9&from=community')
    window.dispatchEvent(new Event('focus')); await flushPromises()
    await returnFromAnotherTab()
    expect(llmApi.getAvailableModels).not.toHaveBeenCalled()
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('.validation-box').exists()).toBe(false)
  })

  it('does not reload or flash controls when a file dialog or click returns window focus', async () => {
    await render(); await chooseFile(); await wrapper.get('select').setValue('101')
    window.dispatchEvent(new Event('focus'))
    await wrapper.get('.validation-box').trigger('click')
    await flushPromises()
    expect(llmApi.getAvailableModels).toHaveBeenCalledTimes(1)
    expect(wrapper.get('select').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.model-selector [role="status"]').exists()).toBe(false)
  })

  it('silently refreshes on tab return without disabling controls or inserting a loading row', async () => {
    await render(); const file = await chooseFile(); await wrapper.get('select').setValue('101')
    let finish!: (value: ReturnType<typeof response<llmApi.UserLlmModel[]>>) => void
    vi.mocked(llmApi.getAvailableModels).mockImplementation(() => new Promise(done => { finish = done }))
    const before = wrapper.get('.validation-box').html()
    await returnFromAnotherTab()
    expect(llmApi.getAvailableModels).toHaveBeenCalledTimes(2)
    expect(wrapper.get('.validation-box').html()).toBe(before)
    await returnFromAnotherTab()
    expect(llmApi.getAvailableModels).toHaveBeenCalledTimes(2)
    finish(response(models)); await flushPromises()
    expect(wrapper.get('.validation-box').html()).toBe(before)
    expect(wrapper.getComponent(SkillArtifactForm).props('modelValue').skillFile).toBe(file)
    expect(skillApi.validateSkillPackage).not.toHaveBeenCalled()
    // Explicit refresh still displays loading feedback.
    await wrapper.get('.model-actions button').trigger('click')
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.model-selector [role="status"]').exists()).toBe(true)
    finish(response(models)); await flushPromises()
  })

  it('defers a background model update while scoring and preserves the completed result', async () => {
    await render(); await fill(); await wrapper.get('select').setValue('101')
    let finishModels!: (value: ReturnType<typeof response<llmApi.UserLlmModel[]>>) => void
    let finishScoring!: (value: ReturnType<typeof response<SkillValidationResponse>>) => void
    vi.mocked(llmApi.getAvailableModels).mockReturnValueOnce(new Promise(done => { finishModels = done }))
    vi.mocked(skillApi.validateSkillPackage).mockReturnValueOnce(new Promise(done => { finishScoring = done }))
    await returnFromAnotherTab(); await validate()
    finishModels(response([])); await flushPromises()
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('101')
    vi.mocked(llmApi.getAvailableModels).mockResolvedValue(response([]))
    finishScoring(response(scored(80))); await flushPromises()
    expect(llmApi.getAvailableModels).toHaveBeenCalledTimes(3)
    expect(wrapper.get('.llm-score').text()).toContain('80')
    await publish()
    expect(skillApi.publishSkill).toHaveBeenCalledWith(expect.objectContaining({ validationUserModelId: '101', validationToken: 'scored-token' }), expect.any(File))
  })
})


describe('persisted AI publication reports', () => {
  it('shows five dimension scores and translated coverage, and blocks a legacy report', async () => {
    const current = scored(90)
    current.reviewCoverage = { complete: true, characters: 500, files: [
      { path: 'scripts/formula.py', lineCount: 25, readRanges: [{ path: 'scripts/formula.py', startLine: 1, endLine: 8 }], status: 'partial', reason: 'budget_or_not_selected' },
    ] }
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response(current))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate()
    expect(wrapper.findAll('.dimension-row')).toHaveLength(5)
    expect(wrapper.text()).toContain('方法是否具体有用')
    expect(wrapper.text()).toContain('本次阅读范围')
    expect(wrapper.text()).toContain('部分读取')
    expect(wrapper.get('.coverage-table').text()).toContain('第 1–8 行')
    i18n.global.locale.value = 'en-US'; await flushPromises()
    expect(wrapper.text()).toContain('Useful, concrete methods')
    expect(wrapper.text()).toContain('Partially read')
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response({ ...current, reviewRulesVersion: 'skill-review-v1' }))
    await validate(); await publish()
    expect(wrapper.text()).toContain('Legacy score')
    expect(skillApi.publishSkill).not.toHaveBeenCalled()
  })

  it('retries only metadata, locks paid actions and publishes with the new report token', async () => {
    const previous = { ...scored(90), metadataStatus: 'failed' as const, generatedName: null, generatedDescription: null }
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response(previous))
    let finish!: (value: ReturnType<typeof response<SkillValidationResponse>>) => void
    vi.mocked(skillApi.retrySkillMetadata).mockReturnValue(new Promise(done => { finish = done }))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate()
    await wrapper.get('[data-testid="retry-skill-metadata"]').trigger('click'); await flushPromises()
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.llm-score').text()).toContain('90')
    await validate(); await publish(); await save()
    expect(skillApi.validateSkillPackage).toHaveBeenCalledTimes(1)
    expect(skillApi.publishSkill).not.toHaveBeenCalled()
    expect(skillApi.saveSkillDraft).not.toHaveBeenCalled()
    expect(skillApi.retrySkillMetadata).toHaveBeenCalledWith('review-id', expect.objectContaining({ validationToken: 'scored-token', validationArtifactSha256: 'zip-hash', validationUserModelId: '101' }), expect.any(File))
    finish(response({ ...scored(90), validationId: 'retry-id', validationToken: 'retry-token', expiresAt: previous.expiresAt })); await flushPromises()
    await publish()
    expect(skillApi.publishSkill).toHaveBeenCalledWith(expect.objectContaining({ validationToken: 'retry-token' }), expect.any(File))
    expect(skillApi.validateSkillPackage).toHaveBeenCalledTimes(1)
  })

  it('retains the original score after a failed metadata retry and ignores a stale retry response', async () => {
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response({ ...scored(88), metadataStatus: 'failed' }))
    vi.mocked(skillApi.retrySkillMetadata).mockRejectedValueOnce(new Error('llm_timeout'))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate()
    await wrapper.get('[data-testid="retry-skill-metadata"]').trigger('click'); await flushPromises()
    expect(wrapper.get('.llm-score').text()).toContain('88')
    let finish!: (value: ReturnType<typeof response<SkillValidationResponse>>) => void
    vi.mocked(skillApi.retrySkillMetadata).mockReturnValue(new Promise(done => { finish = done }))
    await wrapper.get('[data-testid="retry-skill-metadata"]').trigger('click'); await flushPromises()
    wrapper.getComponent(SkillArtifactForm).vm.$emit('update:modelValue', { skillFile: new File(['replacement'], 'new.zip') })
    await flushPromises(); finish(response(scored(88))); await flushPromises()
    expect(wrapper.find('.llm-score').exists()).toBe(false)
  })

  it('asks for validation again when the metadata retry has expired', async () => {
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response({ ...scored(90), metadataStatus: 'failed', expiresAt: '2000-01-01T00:00:00Z' }))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate()
    await wrapper.get('[data-testid="retry-skill-metadata"]').trigger('click'); await flushPromises()
    expect(skillApi.retrySkillMetadata).not.toHaveBeenCalled()
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({ message: '检测报告已过期，请重新检测。' }))
  })

  const published = {
    validationId: 'published', validatedAt: '2026-10-22T08:00:00Z', matchesCurrentArtifact: true,
    passed: true, llmStatus: 'succeeded' as const, metadataStatus: 'succeeded' as const,
    generatedName: 'Published AI name', generatedDescription: 'Published AI description',
    llmAnalysis: { score: 85, summary: 'Published review summary', suggestions: ['Published suggestion'] },
    modelName: 'Public model name',
  }
  function detail() {
    vi.mocked(skillApi.getSkillDetail).mockImplementation(async (_id, options) => response({
      skill: { id: 9, authorId: 7,
        name: options?.view === 'community' ? published.generatedName : 'Manual name',
        description: options?.view === 'community' ? published.generatedDescription : 'Manual description',
        categoryCode: 'other', minioObjectKey: '9.zip', fileName: '9.zip' },
      publishedValidation: published,
      currentValidation: options?.view === 'community' ? null : { ...published, validationId: 'draft', generatedName: 'Private draft AI name' },
    }))
  }

  it('shows the same publication report to the author and community without restoring publishing permission', async () => {
    detail(); await render('/skills/create?id=9')
    expect(wrapper.text()).toContain('Published AI name')
    expect(wrapper.text()).toContain('Private draft AI name')
    expect(wrapper.text()).toContain('Published suggestion')
    await publish(); expect(skillApi.publishSkill).not.toHaveBeenCalled()
    wrapper.unmount()
    detail(); await render('/skills/create?id=9&from=community')
    expect(skillApi.getSkillDetail).toHaveBeenLastCalledWith(9, { view: 'community' })
    expect(wrapper.getComponent(SkillBasicForm).props('modelValue')).toMatchObject({
      name: 'Published AI name', description: 'Published AI description',
    })
    expect(wrapper.text()).toContain('Published AI name')
    expect(wrapper.text()).not.toContain('Private draft AI name')
    expect(wrapper.find('.validation-btn').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('reloads the same skill when switching to personal editing and saves only the original fields', async () => {
    detail()
    const { router } = await render('/skills/create?id=9&from=community')
    await router.push('/skills/create?id=9'); await flushPromises()
    expect(skillApi.getSkillDetail).toHaveBeenLastCalledWith(9)
    expect(wrapper.getComponent(SkillBasicForm).props('modelValue')).toMatchObject({ name: 'Manual name', description: 'Manual description' })
    await save()
    expect(skillApi.saveSkillDraft).toHaveBeenCalledWith(expect.objectContaining({ name: 'Manual name', description: 'Manual description' }), null)
  })

  it('blocks submissions while a personal view is loading after leaving the community', async () => {
    detail()
    const { router } = await render('/skills/create?id=9&from=community')
    let finish!: (value: Awaited<ReturnType<typeof skillApi.getSkillDetail>>) => void
    vi.mocked(skillApi.getSkillDetail).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await router.push('/skills/create?id=9'); await flushPromises()
    expect(wrapper.findComponent(SkillBasicForm).exists()).toBe(false)
    const header = wrapper.getComponent(CreatePluginHeader)
    expect(header.props('submitDisabled')).toBe(true)
    header.vm.$emit('saveDraft'); header.vm.$emit('publish'); await flushPromises()
    expect(skillApi.saveSkillDraft).not.toHaveBeenCalled(); expect(skillApi.publishSkill).not.toHaveBeenCalled()
    finish(response({ skill: { id: 9, authorId: 7, name: 'Restored original', categoryCode: 'other', minioObjectKey: '9.zip' } }))
    await flushPromises()
    expect(wrapper.getComponent(SkillBasicForm).props('modelValue').name).toBe('Restored original')
    expect(header.props('submitDisabled')).toBe(false)
  })

  it('ignores a late community response after switching to personal editing', async () => {
    detail()
    let finish!: (value: Awaited<ReturnType<typeof skillApi.getSkillDetail>>) => void
    vi.mocked(skillApi.getSkillDetail).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { router } = await render('/skills/create?id=9&from=community')
    await router.push('/skills/create?id=9'); await flushPromises()
    finish(response({ skill: { id: 9, name: 'Late AI value' }, publishedValidation: published })); await flushPromises()
    expect(wrapper.getComponent(SkillBasicForm).props('modelValue').name).toBe('Manual name')
    await save()
    expect(skillApi.saveSkillDraft).toHaveBeenCalledWith(expect.objectContaining({ name: 'Manual name' }), null)
  })

  it('reloads for a new account and discards the previous account response', async () => {
    detail()
    let finish!: (value: Awaited<ReturnType<typeof skillApi.getSkillDetail>>) => void
    vi.mocked(skillApi.getSkillDetail).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { user } = await render('/skills/create?id=9')
    vi.mocked(skillApi.getSkillDetail).mockResolvedValue(response({ skill: { id: 9, name: 'Public display for new viewer' } }))
    user.setLoginInfo('new-token', { id: 8, account: 'other', username: 'Other', phone: '', avatar: '' })
    await flushPromises()
    finish(response({ skill: { id: 9, name: 'Previous account original' } })); await flushPromises()
    expect(wrapper.getComponent(SkillBasicForm).props('modelValue').name).toBe('Public display for new viewer')
  })

  it('keeps submissions blocked after a failed reload and clears old data on a new skill page', async () => {
    detail()
    const { router } = await render('/skills/create?id=9&from=community')
    vi.mocked(skillApi.getSkillDetail).mockRejectedValueOnce(new Error('Load failed'))
    await router.push('/skills/create?id=9'); await flushPromises()
    expect(wrapper.getComponent(CreatePluginHeader).props('submitDisabled')).toBe(true)
    expect(wrapper.findComponent(SkillBasicForm).exists()).toBe(false)
    await router.push('/skills/create'); await flushPromises()
    expect(wrapper.getComponent(SkillBasicForm).props('modelValue')).toMatchObject({ name: '', description: '' })
  })

  it('keeps the score when metadata fails, blocks publication and permits a draft', async () => {
    vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response({
      ...scored(90), metadataStatus: 'failed', generatedName: null, generatedDescription: null,
      metadataErrorCode: 'llm_metadata_invalid_json',
    }))
    await render(); await fill(); await wrapper.get('select').setValue('101'); await validate()
    expect(wrapper.text()).toContain('90')
    expect(wrapper.text()).toContain('AI 信息格式无效')
    await publish(); expect(skillApi.publishSkill).not.toHaveBeenCalled()
    await save(); expect(skillApi.saveSkillDraft).toHaveBeenCalledTimes(1)
  })

  it('sends a newly generated report when saving an existing unchanged file', async () => {
    detail(); vi.mocked(skillApi.validateSkillPackage).mockResolvedValue(response(scored()))
    await render('/skills/create?id=9')
    await wrapper.get('select').setValue('101'); await validate(); await save()
    expect(skillApi.saveSkillDraft).toHaveBeenCalledWith(
      expect.objectContaining({ validationToken: 'scored-token', validationArtifactSha256: 'zip-hash' }), null,
    )
  })

  it('warns when replacing the file and handles absent historical reports', async () => {
    detail(); await render('/skills/create?id=9'); await chooseFile('new.zip')
    expect(wrapper.text()).toContain('此报告对应此前保存的文件')
    wrapper.unmount()
    vi.mocked(skillApi.getSkillDetail).mockResolvedValue(response({ skill: { id: 9, authorId: 7, name: 'Legacy', minioObjectKey: '9.zip' } }))
    await render('/skills/create?id=9&from=community')
    expect(wrapper.text()).toContain('暂无发布评审记录')
    i18n.global.locale.value = 'en-US'; await flushPromises()
    expect(wrapper.text()).toContain('No publication review available')
  })
})
