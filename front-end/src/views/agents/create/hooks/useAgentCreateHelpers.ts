import type { AgentConfig } from '@/types/modules/agentCreate'
import type { RunTaskResponse } from '@/api/task'

import type { BasicInfo } from '../components'

type AgentDefinition = { id: string; name: string }
type TranslateFn = (key: string, params?: Record<string, unknown>) => string

export const SHORT_KEY_BY_AGENT_ID: Record<string, 'dp' | 'fe' | 'ms' | 'hd' | 'ra'> = {
  'data-processor': 'dp',
  'feature-engineer': 'fe',
  'model-selector': 'ms',
  'hyperparameter-optimizer': 'hd',
  'result-analyzer': 'ra',
}

export function createInitialAgentConfigs(
  definitions: AgentDefinition[],
  defaultPrompts: Record<string, string>,
): Record<string, AgentConfig> {
  return Object.fromEntries(
    definitions.map((def) => [
      def.id,
      {
        id: def.id,
        name: def.name,
        model: '',
        systemPrompt: defaultPrompts[def.id] || '',
        selectedSkills: [],
        selectedTools: [],
        selectedKbIds: [],
        selectedSkillMeta: {},
        selectedKbMeta: {},
        selectedToolMeta: {},
        lockSkillScope: false,
        allowSkillGapActions: false,
        allowAutoGenerateTool: false,
        lockToolScope: false,
      } satisfies AgentConfig,
    ]),
  )
}

export function buildConfigData(
  basicInfo: BasicInfo,
  activeAgentId: string,
  agentConfigs: Record<string, AgentConfig>,
  definitions: AgentDefinition[],
  assistantUserModelId?: string,
) {
  return {
    assistantUserModelId,
    basicInfo: {
      name: basicInfo.name,
      description: basicInfo.description,
      icon: basicInfo.icon,
      isPublic: basicInfo.isPublic,
      releaseNote: basicInfo.releaseNote,
    },
    activeAgentId,
    subAgents: definitions.map((def) => {
      const cfg = agentConfigs[def.id]
      return {
        agentKey: def.id,
        name: def.name,
        userModelId: cfg?.model || '',
        systemPrompt: cfg?.systemPrompt || '',
        selectedSkillIds: cfg?.selectedSkills || cfg?.selectedPlugins || [],
        selectedToolIds: cfg?.selectedTools || [],
        selectedKbIds: cfg?.selectedKbIds || [],
        isAutoGenerateSkill: false,
        lockSkillScope: cfg?.lockSkillScope || cfg?.useOnlySelectedPlugins || false,
        allowSkillGapActions: cfg?.allowSkillGapActions || false,
        allowAutoGenerateTool: false,
        lockToolScope: false,
      }
    }),
  }
}

export function validateStagePolicy(
  agentConfigs: Record<string, AgentConfig>,
  definitions: AgentDefinition[],
  t: TranslateFn,
): string | null {
  for (const def of definitions) {
    const cfg = agentConfigs[def.id]
    if (!cfg) continue
    const lock = !!cfg.lockSkillScope || !!cfg.useOnlySelectedPlugins
    const ids = cfg.selectedSkills || cfg.selectedPlugins || []
    if (lock && ids.length === 0) {
      return t('agentCreate.page.invalidLockedSkillScope', { name: def.name })
    }
  }
  return null
}

export function validateAgentCreateForm(
  basicInfo: BasicInfo,
  agentConfigs: Record<string, AgentConfig>,
  definitions: AgentDefinition[],
  t: TranslateFn,
): string | null {
  if (!basicInfo.name.trim()) return t('agentCreate.page.nameRequired')
  const policyErr = validateStagePolicy(agentConfigs, definitions, t)
  if (policyErr) return policyErr
  for (const def of definitions) {
    const cfg = agentConfigs[def.id]
    if (!cfg?.model) return t('agentCreate.page.modelRequired', { name: def.name })
    if (!cfg.systemPrompt.trim()) return t('agentCreate.page.systemPromptRequired', { name: def.name })
  }
  return null
}

export function isTaskActuallyCompleted(data: RunTaskResponse | undefined | null): boolean {
  if (!data?.success) return false
  if (data?.interrupt) return false
  const hasDeliverables = Array.isArray(data.deliverables) && data.deliverables.length > 0
  const hasReportPath = !!data.final_report_path && String(data.final_report_path).trim() !== ''
  const hasZipPath = !!data.deployment_zip_path && String(data.deployment_zip_path).trim() !== ''
  return hasDeliverables || hasReportPath || hasZipPath
}

export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatClockTime(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function createTaskId(prefix = 'task'): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** AutoML 终态可下载的单一制品（报告已打入包内，与 agent-service / Java 落库策略一致） */
export function isAutomlOutputBundleName(name: string | null | undefined): boolean {
  return (name || '').trim().toLowerCase() === 'deployment.zip'
}
