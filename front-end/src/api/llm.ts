import { i18n } from '@/i18n'
import { get, post, request } from '@/utils/request'
export interface InferenceConfig { profile?: string; temperatureMode?: string; temperature?: number; maxOutputTokens?: number; documentationUrl?: string; confirmed?: boolean }
export interface InferencePolicy { state: 'native_off'|'switchable'|'thinking_only'|'unknown'; supported: boolean; userDeclared?: boolean; ruleId?: string; errorCode?: string }

export interface UserLlmModel {
  id: string
  connectionId: string
  connectionName: string
  providerCode: string
  modelCode: string
  displayName: string
  enabled: boolean
  validationStatus: 'unverified' | 'valid' | 'invalid'
  available: boolean
  lastErrorCode?: string
  inferenceConfig?: InferenceConfig
  inferencePolicy?: InferencePolicy
  modelConfigVersion?: string
  needsPolicyValidation?: boolean
  inferenceCapabilities?: { failedStep?: string; nonThinkingStatus?: string }
}
export interface LlmConnection {
  id: string
  configVersion?: string
  name: string
  providerCode: string
  baseUrl: string
  apiKeyMasked: string
  enabled: boolean
  models: UserLlmModel[]
}
export interface LlmProvider { code: string; name: string; baseUrl: string }
export const LLM_SLOTS = ['dp', 'fe', 'ms', 'hd', 'ra', 'assistant'] as const
export type LlmBindings = Partial<Record<(typeof LLM_SLOTS)[number], string>>
export const LLM_LABELS: Record<string, string> = { dp: '数据处理', fe: '特征工程', ms: '模型选择', hd: '参数调优', ra: '结果分析', assistant: '对话与辅助模型' }
// Translate only known codes; never surface arbitrary upstream text or credentials.
export const llmErrorMessage = (code?: string) => {
  const key = `llm.errors.${code || 'default'}`
  return i18n.global.te(key) ? i18n.global.t(key) : i18n.global.t('llm.errors.default')
}
export function llmRequestError(error: unknown): string {
  const code = (error as { code?: number })?.code
  if (code === 4001) return i18n.global.t('llm.errors.configuration')
  if (code === 4004) return i18n.global.t('llm.errors.notFound')
  return llmErrorMessage(error instanceof Error ? error.message : undefined)
}
export const getLlmProviders = () => get<LlmProvider[]>('/api/llm/providers')
export const getLlmConnections = () => get<LlmConnection[]>('/api/llm/connections')
export interface DiscoveredModel { modelCode: string; displayName: string; alreadyAdded: boolean; inferencePolicy?: InferencePolicy }
export interface ModelDiscovery {
  status: 'success' | 'partial' | 'unsupported' | 'failed'
  connectionId: string
  configVersion: string
  fetchedAt: string
  models: DiscoveredModel[]
  errorCode?: string
}
export const discoverLlmModels = (id: string) => request<ModelDiscovery>(`/api/llm/connections/${id}/discover-models`, { method: 'GET', cache: 'no-store' })
export const getAvailableModels = () => get<UserLlmModel[]>('/api/llm/models/available')
export const createLlmConnection = (body: unknown) => post<{ id: string }>('/api/llm/connections', body)
export const updateLlmConnection = (id: string, body: unknown) => request(`/api/llm/connections/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteLlmConnection = (id: string) => request(`/api/llm/connections/${id}`, { method: 'DELETE' })
export const addLlmModel = (id: string, body: unknown) => post(`/api/llm/connections/${id}/models`, body)
export const updateLlmModel = (id: string, body: unknown) => request(`/api/llm/models/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteLlmModel = (id: string) => request(`/api/llm/models/${id}`, { method: 'DELETE' })
export const validateLlmModel = (id: string) => post<{ valid: boolean; errorCode?: string }>(`/api/llm/models/${id}/validate`, {})
export interface LlmPreflight {
  mode: 'owner' | 'public'
  ready: boolean
  locked: boolean
  resumable?: boolean
  resumeThreadId?: string
  llmBindings: LlmBindings
  requirements: Record<string, { model: string; provider: string }>
  issues: Record<string, { code: string }>
}
export const preflightLlm = (agentId: number | string, sessionId: string | null, llmBindings: LlmBindings, resumeThreadId?: string | null, persistBindings = false) =>
  post<LlmPreflight>(`/api/agents/${agentId}/llm-preflight`, { sessionId: sessionId && /^\d+$/.test(sessionId) ? sessionId : undefined, llmBindings, resumeThreadId: resumeThreadId || undefined, persistBindings })

export function matchPersonalModel(models: UserLlmModel[], modelCode: string, providerCode?: string): string {
  const matches = models.filter(m => m.modelCode === modelCode && (!providerCode || m.providerCode === providerCode))
  return matches.length === 1 ? matches[0]!.id : ''
}
