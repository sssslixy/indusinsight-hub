import { describe, expect, it } from 'vitest'
import { buildSkillReferenceCompatibilityFields } from './skillReferenceDefaults'

describe('buildSkillReferenceCompatibilityFields', () => {
  it('returns context-only compatibility defaults', () => {
    const fields = buildSkillReferenceCompatibilityFields()

    expect(fields).toEqual({
      manifestJson: JSON.stringify({
        input_schema: { type: 'object', properties: {}, required: [] },
        output_schema: { type: 'object', properties: {} },
      }),
      entryPoint: '',
      entryFunction: '',
      timeoutMs: 120000,
      retryTimes: 0,
      requiresGpu: false,
    })
  })
})
