import type { TaskStreamEvent } from '@/api/taskTypes'

export type ProgressPillContext = {
  preparingReplyShown: boolean
}

export type ProgressPillLabel = {
  labelKey: string | null
  params?: Record<string, string | number>
  nextCtx: ProgressPillContext
}

export function mapEventToProgressPillLabel(
  evt: TaskStreamEvent,
  ctx: ProgressPillContext,
): ProgressPillLabel {
  const kind = evt.event
  const data = (evt.data || {}) as Record<string, unknown>

  const same = (
    patch: Partial<ProgressPillContext>,
    labelKey: string | null,
    params?: Record<string, string | number>,
  ): ProgressPillLabel => ({
    labelKey,
    params,
    nextCtx: { ...ctx, ...patch },
  })

  const currentStage = () => String(data.stage || '').trim() || '__currentStage__'

  if (kind === 'pipeline_start') {
    return same({ preparingReplyShown: false }, 'workbench.runtime.pipelineStart')
  }

  if (kind === 'run_context') {
    return same({}, 'workbench.runtime.loadingAgentConfig')
  }

  if (kind === 'kb_retrieval') {
    const name = String(data.kb_name || '').trim() || '__knowledgeBase__'
    return same({}, 'workbench.runtime.kbRetrieving', { name })
  }

  if (kind === 'kb_retrieval_start') {
    const name = String(data.kb_name || '').trim() || '__knowledgeBase__'
    return same({}, 'workbench.runtime.kbRetrievalStart', { name })
  }

  if (kind === 'kb_retrieval_end') {
    const status = String(data.status || '').trim() || 'unknown'
    const docCount = Number(data.doc_count || 0)
    return same({}, 'workbench.runtime.kbRetrievalEnd', { status, docCount })
  }

  if (kind === 'kb_retrieval_skipped') {
    const reason = String(data.reason || '').trim() || '__unknownReason__'
    return same({}, 'workbench.runtime.kbRetrievalSkipped', { reason })
  }

  if (kind === 'kb_context_attached') {
    return same({}, 'workbench.runtime.kbContextAttached')
  }

  if (kind === 'codegen_profile_start') return same({}, 'workbench.runtime.profileStart')
  if (kind === 'codegen_profile_end') return same({}, 'workbench.runtime.profileEnd')

  if (kind === 'codegen_stage_start') {
    return same({}, 'workbench.runtime.stageStart', { stage: currentStage() })
  }

  if (kind === 'codegen_stage_plan') {
    const mode = String(data.mode || '').trim()
    return same(
      {},
      mode === 'no_skill' ? 'workbench.runtime.stagePlanNoSkill' : 'workbench.runtime.stagePlan',
      { stage: currentStage() },
    )
  }

  if (kind === 'codegen_stage_skipped') {
    return same({}, 'workbench.runtime.stageSkipped', { stage: currentStage() })
  }

  if (kind === 'codegen_skill_read') {
    const skillName = String(data.skill_name || '').trim()
    return same({}, 'workbench.runtime.skillRead', {
      stage: currentStage(),
      skillName: skillName ? ` ${skillName}` : '',
    })
  }

  if (kind === 'codegen_kb_retrieved') {
    return same({}, 'workbench.runtime.stageKbRetrieved', { stage: currentStage() })
  }

  if (kind === 'codegen_stage_code_generated') {
    return same({}, 'workbench.runtime.stageCodeGenerated', { stage: currentStage() })
  }

  const fixed: Record<string, { key: string; preparing?: boolean }> = {
    codegen_pipeline_compose_start: { key: 'workbench.runtime.pipelineComposeStart' },
    codegen_pipeline_composed: { key: 'workbench.runtime.pipelineComposed' },
    codegen_quality_check_start: { key: 'workbench.runtime.qualityCheckStart' },
    codegen_quality_repair_start: { key: 'workbench.runtime.qualityRepairStart' },
    codegen_validation_sample_start: { key: 'workbench.runtime.validationSampleStart' },
    codegen_pipeline_repair_start: { key: 'workbench.runtime.pipelineRepairStart' },
    codegen_llm_review_start: { key: 'workbench.runtime.llmReviewStart' },
    codegen_llm_review_repair_start: { key: 'workbench.runtime.llmReviewRepairStart' },
    codegen_report_start: { key: 'workbench.runtime.reportStart', preparing: true },
    codegen_zip_start: { key: 'workbench.runtime.zipStart' },
  }
  const item = fixed[kind]
  if (item) {
    return same({ preparingReplyShown: item.preparing ?? ctx.preparingReplyShown }, item.key)
  }

  if (kind === 'codegen_pipeline_validation_start') {
    const attempt = Number(data.attempt || 1)
    const isRetry = attempt > 1 || data.repaired_code === true
    return same({}, isRetry ? 'workbench.runtime.pipelineValidationRetry' : 'workbench.runtime.pipelineValidationStart')
  }

  if (kind === 'skill_start') {
    const name = String(data.skill_name || '').trim() || '__unnamedSkill__'
    return same({}, 'workbench.runtime.skillStart', { name })
  }

  if (kind === 'tool_start') {
    const name = String(data.tool_name || '').trim() || '__unnamedTool__'
    return same({}, 'workbench.runtime.toolStart', { name })
  }

  if (kind === 'agent_status') {
    const phase = String(data.phase || '')
    if (phase === 'retrieval') return same({}, 'workbench.runtime.parsingUploadedDocs')
    return same({}, null)
  }

  if (kind === 'llm_start') {
    const node = String(data.node || '')
    if (node === 'codegen_report') {
      return same({ preparingReplyShown: true }, 'workbench.runtime.streamingReport')
    }
    if (node.endsWith('_planner')) {
      const action = String(data.next_action || '').trim()
      const actionKeyMap: Record<string, string> = {
        retrieve_kb: 'workbench.runtime.planActionRetrieveKb',
        run_capability: 'workbench.runtime.planActionRunCapability',
        finish: 'workbench.runtime.planActionFinish',
      }
      return same({ preparingReplyShown: true }, 'workbench.runtime.planAction', {
        actionKey: actionKeyMap[action] || 'workbench.runtime.planActionDefault',
      })
    }
    if (node.endsWith('_critic')) return same({ preparingReplyShown: true }, 'workbench.runtime.evaluatingResult')
    if (node.endsWith('_summary')) return same({ preparingReplyShown: true }, 'workbench.runtime.generatingStageSummary')
    if (node.endsWith('_stage_report')) return same({ preparingReplyShown: true }, 'workbench.runtime.generatingStageReport')
    return same({ preparingReplyShown: true }, 'workbench.runtime.modelInference')
  }

  if (kind === 'capability_invalid') {
    const name = String(data.capability_name || '').trim() || '__capability__'
    return same({}, 'workbench.runtime.capabilityInvalid', { name })
  }

  if (kind === 'node_start') {
    const node = String(data.node || '')
    if (node === 'qa_dialog') {
      return same({ preparingReplyShown: true }, 'workbench.runtime.preparingReply')
    }
    return same({}, null)
  }

  if (kind === 'llm_chunk' || kind === 'deep_chunk') {
    if (!ctx.preparingReplyShown) {
      return same({ preparingReplyShown: true }, 'workbench.runtime.preparingReply')
    }
    return same({}, null)
  }

  return same({}, null)
}
