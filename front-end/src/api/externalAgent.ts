import { get, post, put } from '@/utils/request'
import type { ApiResponse } from '@/types/api'

/** 与后端 ExternalAgentSaveResultVO 对齐 */
export interface ExternalAgentSaveResultVO {
  agentId: number
  status: number
  publishTime?: string
  sourceType?: string
  name?: string
}

/** 与后端 ExternalAgentDetailVO 对齐 */
export interface ExternalAgentDetailVO {
  agentId: number
  name?: string
  description?: string
  iconUrl?: string
  publishRemark?: string
  visibility?: number
  status?: number
  sourceType?: string
  protocolType?: string
  baseUrl?: string
  invokePath?: string
  healthPath?: string
  streamPath?: string
  requestMethod?: string
  timeoutMs?: number
  retryTimes?: number
  authType?: string
  secretRef?: string
  authConfig?: string
  requestSchema?: string
  responseSchema?: string
  sampleRequest?: string
  sampleResponse?: string
  transformConfig?: string
  validationStatus?: number
  validationMessage?: string
  healthStatus?: string
  lastHealthCheckedAt?: string
  lastHealthMessage?: string
  publishTime?: string
}

/** 与后端 ExternalAgentHealthTestResultVO 对齐 */
export interface ExternalAgentHealthTestResultVO {
  success?: boolean
  healthStatus?: string
  message?: string
  checkedAt?: string
  httpStatus?: number
  latencyMs?: number
  rawBody?: string
}

/** 与后端 ExternalAgentInvokeTestResultVO 对齐 */
export interface ExternalAgentInvokeTestResultVO {
  success?: boolean
  message?: string
  httpStatus?: number
  latencyMs?: number
  responseBody?: string
  errorMessage?: string
}

/** 嵌套结构：与后端 ExternalAgentPayloadParser 一致（basic/service/protocol） */
export interface ExternalAgentNestedPayload {
  agentId?: number
  basic: {
    name: string
    description?: string
    iconUrl?: string
    publishRemark?: string
    visibility: 'public' | 'private'
    sourceType: 'external_service'
  }
  service: {
    protocolType: string
    baseUrl: string
    invokePath: string
    healthPath?: string
    streamPath?: string
    requestMethod?: string
    timeoutMs?: number
    retryTimes?: number
    authType?: string
    secretRef?: string
    authConfig?: Record<string, unknown>
  }
  protocol: {
    requestSchema?: string
    responseSchema?: string
    sampleRequest?: string
    sampleResponse?: string
    transformConfig?: string
  }
}

export function saveExternalAgentDraft(
  data: ExternalAgentNestedPayload,
): Promise<ApiResponse<ExternalAgentSaveResultVO>> {
  return post<ExternalAgentSaveResultVO>('/api/agents/external/draft', data)
}

export function publishExternalAgent(
  data: ExternalAgentNestedPayload,
): Promise<ApiResponse<ExternalAgentSaveResultVO>> {
  return post<ExternalAgentSaveResultVO>('/api/agents/external/publish', data)
}

export function getExternalAgentDetail(
  agentId: number,
): Promise<ApiResponse<ExternalAgentDetailVO>> {
  return get<ExternalAgentDetailVO>(`/api/agents/external/${agentId}`)
}

export function updateExternalAgent(
  agentId: number,
  data: ExternalAgentNestedPayload,
  publish: boolean,
): Promise<ApiResponse<ExternalAgentSaveResultVO>> {
  const q = publish ? '?publish=true' : '?publish=false'
  return put<ExternalAgentSaveResultVO>(`/api/agents/external/${agentId}${q}`, data)
}

export interface ExternalAgentHealthTestRequestBody {
  baseUrl: string
  healthPath: string
  protocolType?: string
  requestMethod?: string
  timeoutMs?: number
  authType?: string
  secretRef?: string
  /** 后端为 JSON 字符串 */
  authConfig?: string
}

export function testExternalAgentHealth(
  data: ExternalAgentHealthTestRequestBody,
): Promise<ApiResponse<ExternalAgentHealthTestResultVO>> {
  return post<ExternalAgentHealthTestResultVO>('/api/agents/external/test-health', data)
}

export interface ExternalAgentInvokeTestRequestBody {
  baseUrl: string
  invokePath: string
  protocolType?: string
  requestMethod?: string
  timeoutMs?: number
  authType?: string
  secretRef?: string
  authConfig?: string
  sampleRequest: string
}

export function testExternalAgentInvoke(
  data: ExternalAgentInvokeTestRequestBody,
): Promise<ApiResponse<ExternalAgentInvokeTestResultVO>> {
  return post<ExternalAgentInvokeTestResultVO>('/api/agents/external/test-invoke', data)
}

/** 使用页对话：与后端 ExternalAgentChatRequest / ExternalAgentChatResponse 对齐 */
export interface ExternalAgentChatRequestBody {
  taskId: string
  message: string
  messageType?: string
  externalSessionId?: string
}

export interface ExternalAgentChatResponseVO {
  taskId: string
  assistantMessage: string
  externalSessionId?: string
  httpStatus?: number
}

export function sendExternalAgentMessage(
  agentId: number,
  data: ExternalAgentChatRequestBody,
): Promise<ApiResponse<ExternalAgentChatResponseVO>> {
  return post<ExternalAgentChatResponseVO>(`/api/agents/external/${agentId}/chat`, data)
}
