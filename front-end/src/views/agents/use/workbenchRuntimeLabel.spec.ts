import { describe, expect, it } from 'vitest'
import type { TaskStreamEvent, TaskStreamEventType } from '@/api/taskTypes'
import { mapEventToProgressPillLabel } from '@/views/agents/use/workbenchRuntimeLabel'

const context = { preparingReplyShown: false }

function mapped(event: TaskStreamEventType, data: Record<string, unknown> = {}) {
  return mapEventToProgressPillLabel({ event, data } as TaskStreamEvent, context)
}

describe('codegen post-processing progress pill labels', () => {
  it.each([
    ['codegen_quality_check_start', 'workbench.runtime.qualityCheckStart'],
    ['codegen_quality_repair_start', 'workbench.runtime.qualityRepairStart'],
    ['codegen_validation_sample_start', 'workbench.runtime.validationSampleStart'],
    ['codegen_pipeline_validation_start', 'workbench.runtime.pipelineValidationStart'],
    ['codegen_pipeline_repair_start', 'workbench.runtime.pipelineRepairStart'],
    ['codegen_llm_review_start', 'workbench.runtime.llmReviewStart'],
    ['codegen_llm_review_repair_start', 'workbench.runtime.llmReviewRepairStart'],
    ['codegen_report_start', 'workbench.runtime.reportStart'],
    ['codegen_zip_start', 'workbench.runtime.zipStart'],
  ] as const)('maps %s to its active action key', (event, expected) => {
    expect(mapped(event).labelKey).toBe(expected)
  })

  it('distinguishes repaired validation attempts', () => {
    expect(mapped('codegen_pipeline_validation_start', { attempt: 2 }).labelKey).toBe(
      'workbench.runtime.pipelineValidationRetry',
    )
    expect(mapped('codegen_pipeline_validation_start', { repaired_code: true }).labelKey).toBe(
      'workbench.runtime.pipelineValidationRetry',
    )
  })

  it('returns params for dynamic labels', () => {
    const result = mapped('skill_start', { skill_name: 'Feature Builder' })
    expect(result.labelKey).toBe('workbench.runtime.skillStart')
    expect(result.params).toEqual({ name: 'Feature Builder' })
  })

  it.each([
    'codegen_quality_check_completed',
    'codegen_quality_repair_end',
    'codegen_validation_sample_created',
    'codegen_pipeline_validation_end',
    'codegen_pipeline_validation_final_failed',
    'codegen_pipeline_repair_end',
    'codegen_llm_review_completed',
    'codegen_llm_review_repair_end',
    'codegen_report_generated',
    'codegen_zip_generated',
  ] as const)('does not update the pill for %s', (event) => {
    expect(mapped(event).labelKey).toBeNull()
  })
})
