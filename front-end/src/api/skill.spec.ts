import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSkillDetail, publishSkill, saveSkillDraft, validateSkillPackage, retrySkillMetadata, type SkillDraftPublishRequest } from './skill'
import { get, postFormData } from '@/utils/request'

vi.mock('@/utils/request', () => ({ postFormData: vi.fn(), buildAuthHeaders: vi.fn(), del: vi.fn(), get: vi.fn(), handleUnauthorizedResponse: vi.fn(), post: vi.fn() }))

const payload: SkillDraftPublishRequest = {
  name: 'Skill', categoryCode: 'other', manifestJson: '{}', entryPoint: 'run.py', entryFunction: 'run',
  validationUserModelId: '9007199254740999', validationToken: 'server-token', validationArtifactSha256: 'zip-sha',
}

beforeEach(() => { vi.resetAllMocks(); vi.mocked(postFormData).mockResolvedValue({ code: 0, message: '', data: {} }) })

it('requests the community detail explicitly while preserving default personal requests', async () => {
  await getSkillDetail(9, { view: 'community' })
  expect(get).toHaveBeenLastCalledWith('/api/skills/9', { view: 'community' })
  await getSkillDetail(9)
  expect(get).toHaveBeenLastCalledWith('/api/skills/9')
})

describe('Skill scoring multipart contract', () => {
  it('binds a metadata-only retry to the original report, model, token and artifact', async () => {
    const file = new File(['archive'], 'skill.zip', { type: 'application/zip' })
    await retrySkillMetadata('report-id', payload, file)
    const [url, form] = vi.mocked(postFormData).mock.calls[0]!
    expect(url).toBe('/api/skills/validation/metadata-retry')
    expect(form.get('validationId')).toBe('report-id')
    expect(JSON.parse(await (form.get('data') as Blob).text())).toEqual(payload)
    expect((form.get('skill') as File).name).toBe('skill.zip')
  })
  it.each([
    ['validation', validateSkillPackage], ['draft', saveSkillDraft], ['publish', publishSkill],
  ] as const)('sends the selected string model ID and validation evidence to %s', async (path, call) => {
    const file = new File(['skill archive'], 'skill.zip', { type: 'application/zip' })
    await call(payload, file)
    const [url, form] = vi.mocked(postFormData).mock.calls[0]!
    expect(url).toBe(`/api/skills/${path}`)
    expect(JSON.parse(await (form.get('data') as Blob).text())).toEqual(payload)
    expect((form.get('skill') as File).name).toBe('skill.zip')
    expect(Array.from(form.keys())).toEqual(['data', 'skill'])
  })

  it('omits a model for a static check and supports an already-uploaded archive', async () => {
    await validateSkillPackage({ ...payload, skillId: 4, validationUserModelId: undefined }, null)
    const form = vi.mocked(postFormData).mock.calls[0]![1]
    const data = JSON.parse(await (form.get('data') as Blob).text())
    expect(data.skillId).toBe(4)
    expect(data).not.toHaveProperty('validationUserModelId')
    expect(form.has('skill')).toBe(false)
  })
})
