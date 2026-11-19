import { get, post, postFormData } from '@/utils/request'
import type { ApiResponse } from '@/types/api'

// ----------------------------------------------------------------
// 热门智能体（首页用）
// ----------------------------------------------------------------
export interface HotAgentItem {
  id: number
  agentName: string
  agentDescription: string
  agentIcon: string
  authorId: number
  authorName: string
  favoriteCount: number
  useCount: number
  viewCount: number
  likeCount?: number
}

export function getHotAgents(limit: number = 6, includeMine = false): Promise<ApiResponse<HotAgentItem[]>> {
  return get<HotAgentItem[]>('/api/agents/hot', { limit, includeMine: String(includeMine) })
}

// ----------------------------------------------------------------
// 社区列表（分页）
// ----------------------------------------------------------------
export interface AgentCommunityItem {
  id: number
  agentName: string
  agentDescription: string
  agentIcon: string
  authorId: number
  authorName: string
  favoriteCount: number
  useCount: number
  viewCount: number
  likeCount: number
  publishTime: string
  isLatest: boolean
  isHot: boolean
  /** 智能体来源字段 */
  sourceType?: string
  source_type?: string
}

export interface AgentCommunityPageResult {
  list: AgentCommunityItem[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export interface AgentCommunityQuery {
  includeMine?: boolean
  pageNum?: number
  pageSize?: number
  keyword?: string
  tag?: string
  sortBy?: string
}

export function getAgentCommunityList(
  params: AgentCommunityQuery
): Promise<ApiResponse<AgentCommunityPageResult>> {
  const query: Record<string, string> = {
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 10),
  }
  if (params.keyword && params.keyword.trim()) query.keyword = params.keyword.trim()
  if (params.tag && params.tag !== 'all') query.tag = params.tag
  if (params.sortBy) query.sortBy = params.sortBy
  if (typeof params.includeMine === 'boolean') query.includeMine = String(params.includeMine)
  return get<AgentCommunityPageResult>('/api/agents', query)
}

// ----------------------------------------------------------------
// 创建智能体 - 保存草稿
// ----------------------------------------------------------------

export interface SaveAgentDraftRequest {
  agentId?: number
  agentName: string
  agentDescription?: string
  agentIcon?: string
  isPublic: number
  publishRemark?: string
  configData: any
}

export interface SaveAgentDraftResponse {
  agentId: number
  configId: number
  status: number
  statusLabel: string
  updatedAt: string
  message?: string
}

export function saveAgentDraft(
  data: SaveAgentDraftRequest,
): Promise<ApiResponse<SaveAgentDraftResponse>> {
  return post<SaveAgentDraftResponse>('/api/agents/draft/save', data)
}

// ----------------------------------------------------------------
// 创建/修改智能体 - 发布
// ----------------------------------------------------------------
export interface PublishAgentRequest {
  agentId?: number
  agentName: string
  agentDescription?: string
  agentIcon?: string
  isPublic: number
  publishRemark?: string
  configData: any
}

export interface PublishAgentResponse {
  agentId: number
  status: number
  statusLabel?: string
  publishTime?: string
}

export function publishAgent(
  data: PublishAgentRequest,
): Promise<ApiResponse<PublishAgentResponse>> {
  return post<PublishAgentResponse>('/api/agents/publish', data)
}

// ----------------------------------------------------------------
// 编辑智能体 - 详情回填（我的草稿）
// ----------------------------------------------------------------
export interface AgentEditDetailResponse {
  personalLlmBindings?: Record<string, string>
  id: number
  agentName: string
  agentDescription?: string
  agentIcon?: string
  status: number
  isPublic: number
  publishTime?: string
  createdAt?: string
  updatedAt?: string
  configId?: number
  versionNo?: number
  configData: any
  /** 与 configData 一致时由后端返回，阶段配置快照 */
  stageConfigs?: any
  /** 真实绑定（优先）；兼容旧字段 stageBoundSkills */
  boundSkills?: Record<string, AgentBoundSkillItem[]>
  stageBoundSkills?: Record<string, AgentBoundSkillItem[]>
  boundTools?: Record<string, AgentBoundToolItem[]>
  boundKnowledgeBases?: Record<string, AgentBoundKbItem[]>
}

export interface AgentBoundSkillItem {
  relationId?: number
  skillId: number
  skillName: string
  skillVersionId?: number
  versionLabel?: string
  versionNo?: number
  skillStatus?: number | string
  categoryCode?: string
  skillType?: string
  isEnabled?: number
  sortNo?: number
  invokePolicy?: string
  stage?: string
}

export interface AgentBoundToolItem {
  relationId?: number
  toolId: number
  toolName: string
  toolStatus?: string
  categoryCode?: string
  stage?: string
}

export interface AgentBoundKbItem {
  relationId?: number
  kbId: number
  kbName: string
  visibility?: string
  status?: string
  stage?: string
}

export function getAgentEditDetail(id: number): Promise<ApiResponse<AgentEditDetailResponse>> {
  return get<AgentEditDetailResponse>(`/api/agents/${id}/edit`)
}

// ----------------------------------------------------------------
// 使用智能体 - 公共详情（不包含配置）
// ----------------------------------------------------------------
export interface AgentDetailResponse {
  id: number
  /** 智能体来源字段；兼容后端 snake_case */
  sourceType?: string
  source_type?: string
  agentName: string
  agentDescription?: string
  agentIcon?: string
  authorId: number
  authorName: string
  status: number
  isPublic: number
  favoriteCount: number
  likeCount: number
  viewCount: number
  useCount: number
  sessionCount: number
  publishTime?: string
  lastUsedAt?: string
  createdAt?: string
  updatedAt?: string
  isLatest: boolean
  isHot: boolean
  /** 部分场景可能与 stageConfigs 同时返回，用于兼容 */
  configData?: any
  stageConfigs?: any
  boundSkills?: Record<string, AgentBoundSkillItem[]>
  stageBoundSkills?: Record<string, AgentBoundSkillItem[]>
  boundTools?: Record<string, AgentBoundToolItem[]>
  boundKnowledgeBases?: Record<string, AgentBoundKbItem[]>
}

export function getAgentDetail(id: number): Promise<ApiResponse<AgentDetailResponse>> {
  return get<AgentDetailResponse>(`/api/agents/${id}`)
}

export function uploadAgentIcon(file: File): Promise<ApiResponse<string>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormData<string>('/api/agents/icon', formData)
}
