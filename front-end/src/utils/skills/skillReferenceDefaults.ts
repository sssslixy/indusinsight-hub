import type { SkillDraftPublishRequest } from '@/api/skill'

const DEFAULT_SKILL_MANIFEST = {
  input_schema: { type: 'object', properties: {}, required: [] },
  output_schema: { type: 'object', properties: {} },
}

export type SkillReferenceCompatibilityFields = Pick<
  SkillDraftPublishRequest,
  'manifestJson' | 'entryPoint' | 'entryFunction' | 'timeoutMs' | 'retryTimes' | 'requiresGpu'
>

export function buildSkillReferenceCompatibilityFields(): SkillReferenceCompatibilityFields {
  return {
    manifestJson: JSON.stringify(DEFAULT_SKILL_MANIFEST),
    entryPoint: '',
    entryFunction: '',
    timeoutMs: 120000,
    retryTimes: 0,
    requiresGpu: false,
  }
}
