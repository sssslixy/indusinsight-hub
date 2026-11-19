import { buildAuthHeaders, del, get, handleUnauthorizedResponse, post, postFormData } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import { i18n } from '@/i18n'
export { getSkillCategoryLabel } from '@/constants/skillCategory'

const tr = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params || {})

/**
 * 与单表 skill 模型对齐；请求 manifestJson 与库 manifest_json 均仅 input_schema / output_schema。
 * 兼容字段（codeFileName/entrypoint 等）仅用于旧客户端，新页面请使用 entryPoint/entryFunction/manifestJson。
 */
export interface SkillDraftPublishRequest {
  skillId?: number | null
  name: string
  description?: string
  iconUrl?: string
  skillType?: string
  categoryCode: string
  visibility?: number
  tags?: string[]
  /** 仅 input_schema / output_schema JSON */
  manifestJson: string
  entryPoint: string
  entryFunction: string
  timeoutMs?: number
  retryTimes?: number
  requiresGpu?: boolean
  /** 仅 POST /draft：通常为 draft */
  targetStatus?: 'draft'
  validationToken?: string
  validationArtifactSha256?: string
  /** 本次规范验证/评分所选的个人模型 ID；省略时只做规范检查。 */
  validationUserModelId?: string
  /** @deprecated 使用 entryPoint */
  codeFileName?: string
  /** @deprecated 使用 entryFunction */
  entrypoint?: string
}

export interface SkillDraftPublishResponse {
  skillId: number
  currentVersionId?: number
  status?: number
  publishTime?: string
  name?: string
}

export interface SkillValidationIssue {
  severity: 'fatal' | 'warning' | 'info'
  code: string
  title: string
  message: string
  path?: string
  line?: number
  suggestion?: string
}

export interface SkillValidationLlmAnalysis {
  score?: number
  dimensions?: SkillReviewDimension[]
  summary?: string
  descriptionFeedback?: string
  skillMdFeedback?: string
  suggestions?: string[]
}

export interface SkillReviewEvidence { path: string; startLine: number; endLine: number }
export interface SkillReviewDimension {
  id: 'purpose' | 'usefulness' | 'accuracy' | 'conditions' | 'usability'
  score: number
  maxScore: number
  explanation: string
  deductions: string[]
  evidence: SkillReviewEvidence[]
}
export interface SkillCapabilityFact { kind: string; value: string; evidence: SkillReviewEvidence[] }
export interface SkillReviewCoverage {
  complete: boolean
  characters: number
  files: Array<{ path: string; lineCount: number; readRanges: SkillReviewEvidence[]; status: 'full' | 'partial' | 'unread'; reason?: string | null }>
}

export interface SkillValidationReport {
  reviewRulesVersion?: string
  metadataPromptVersion?: string
  minimumPublishScore?: number
  reviewCoverage?: SkillReviewCoverage | null
  capabilityFacts?: SkillCapabilityFact[] | null
  scoreValidatedAt?: string | null
  validationId?: string
  validatedAt?: string
  matchesCurrentArtifact?: boolean
  passed?: boolean
  summary?: string
  issues?: SkillValidationIssue[]
  llmStatus?: 'skipped' | 'succeeded' | 'failed'
  llmErrorCode?: string | null
  llmAnalysis?: SkillValidationLlmAnalysis | null
  metadataStatus?: 'skipped' | 'succeeded' | 'failed'
  metadataErrorCode?: string | null
  generatedName?: string | null
  generatedDescription?: string | null
  modelName?: string | null
}

export interface SkillValidationResponse extends SkillValidationReport {
  metadataSkipReason?: 'no_model' | 'static_failed' | 'review_failed' | null
  expiresAt?: string
  derivedFromValidationId?: string | null
  passed: boolean
  fatalCount: number
  warningCount: number
  infoCount: number
  validationToken?: string
  artifactSha256?: string
  summary?: string
  issues: SkillValidationIssue[]
  llmAnalysis?: SkillValidationLlmAnalysis | null
  llmStatus: 'skipped' | 'succeeded' | 'failed'
  llmSkipReason?: 'no_model' | 'static_failed' | null
  llmErrorCode?: string | null
  llmModel?: {
    userModelId: string
    modelCode: string
    displayName: string
    connectionName?: string
  } | null
}

function buildSkillDraftMultipart(data: SkillDraftPublishRequest, skillFile?: File | null): FormData {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  if (skillFile) {
    formData.append('skill', skillFile, skillFile.name)
  }
  return formData
}

export function saveSkillDraft(
  data: SkillDraftPublishRequest,
  skillFile?: File | null,
): Promise<ApiResponse<SkillDraftPublishResponse>> {
  return postFormData<SkillDraftPublishResponse>('/api/skills/draft', buildSkillDraftMultipart(data, skillFile))
}

export function publishSkill(
  data: SkillDraftPublishRequest,
  skillFile?: File | null,
): Promise<ApiResponse<SkillDraftPublishResponse>> {
  return postFormData<SkillDraftPublishResponse>('/api/skills/publish', buildSkillDraftMultipart(data, skillFile))
}

export function validateSkillPackage(
  data: SkillDraftPublishRequest,
  skillFile?: File | null,
): Promise<ApiResponse<SkillValidationResponse>> {
  return postFormData<SkillValidationResponse>('/api/skills/validation', buildSkillDraftMultipart(data, skillFile))
}

export function retrySkillMetadata(validationId: string, data: SkillDraftPublishRequest, skillFile?: File | null): Promise<ApiResponse<SkillValidationResponse>> {
  const form = buildSkillDraftMultipart(data, skillFile)
  form.append('validationId', validationId)
  return postFormData<SkillValidationResponse>('/api/skills/validation/metadata-retry', form)
}

export function uploadSkillIcon(file: File): Promise<ApiResponse<string>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormData<string>('/api/skills/icon', formData)
}

export interface SkillDetail {
  currentValidation?: SkillValidationReport | null
  publishedValidation?: SkillValidationReport | null
  skill?: {
    id?: number
    /** 社区视图为已发布 AI 信息优先的展示值；作者默认视图保留用户原文。 */
    name?: string
    description?: string
    iconUrl?: string
    skillType?: string
    categoryCode?: string
    authorId?: number
    visibility?: number
    status?: number
    favoriteCount?: number
    viewCount?: number
    currentVersionId?: number
    sourceType?: string
    publishTime?: string
    createdAt?: string
    updatedAt?: string
    manifestJson?: string
    entryPoint?: string
    entryFunction?: string
    timeoutMs?: number
    retryTimes?: number
    requiresGpu?: boolean
    minioBucket?: string
    minioObjectKey?: string
    artifactSha256?: string
    artifactSize?: number
    /** 用户上传 skill 的展示文件名（优先于 minioObjectKey 末段） */
    fileName?: string
  }
  /** 兼容占位：单表模型下仍返回 v1 占位，字段可从 manifest 推导 */
  currentVersion?: {
    id?: number
    versionNo?: number
    versionLabel?: string
    promptTemplate?: string
    codeContent?: string
    codeFileName?: string
    paramConfig?: string
    inputSchema?: string
    outputSchema?: string
    codeLanguage?: string
    isActive?: number
  }
  runtimeBindings?: unknown[]
  tags?: Array<{ id?: number; tagName?: string }>
}

/** community 强制使用社区展示值；默认由服务端按作者身份返回个人或公开视图。 */
export function getSkillDetail(id: number, options?: { view: 'community' }): Promise<ApiResponse<SkillDetail>> {
  return options ? get<SkillDetail>(`/api/skills/${id}`, options) : get<SkillDetail>(`/api/skills/${id}`)
}

function parseDownloadFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  const encoded = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  return contentDisposition
    .match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]
    ?.replace(/['"]/g, '')
    ?.trim() || null
}

export async function downloadSkillArtifact(id: number, filename?: string): Promise<void> {
  const requestOptions: RequestInit = { method: 'GET' }
  const res = await fetch(`/api/skills/${id}/download`, {
    ...requestOptions,
    headers: buildAuthHeaders(requestOptions),
  })
  if (handleUnauthorizedResponse(res)) {
    throw new Error(tr('common.authExpired'))
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || tr('common.downloadFailed'))
  }
  const blob = await res.blob()
  const name = filename || parseDownloadFileName(res.headers.get('content-disposition')) || 'skill.zip'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export function addSkillView(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/skills/${id}/view`)
}

export function checkFavoriteSkill(id: number): Promise<ApiResponse<boolean>> {
  return get<boolean>(`/api/skills/${id}/favorite/check`)
}

export function addFavoriteSkill(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/skills/${id}/favorite`)
}

export function cancelFavoriteSkill(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/skills/${id}/favorite`)
}

/** 软删除当前用户自己创建的 Skill */
export function deleteSkill(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/skills/${id}`)
}

export interface SkillListItem {
  id: number
  /** 社区接口为已发布 AI 信息优先的展示值；个人接口为用户原文。 */
  name: string
  description?: string
  iconUrl?: string
  skillType?: string
  categoryCode?: string
  authorId?: number
  authorName?: string
  visibility?: number
  status?: number
  versionLabel?: string
  publishTime?: string
  updatedAt?: string
  favoriteCount?: number
  likeCount?: number
  viewCount?: number
  useCount?: number
  isBuiltin?: number
}

export interface SkillListPageResult {
  list: SkillListItem[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export interface SkillPublishLeaderboardEntry {
  authorId: number
  authorName: string
  avatar: string | null
  publishedCount: number
  rank: number
  isCurrentUser: boolean
}

export interface SkillPublishLeaderboardResponse {
  rankingPage: {
    list: SkillPublishLeaderboardEntry[]
    total: number
    pageNum: number
    pageSize: number
    totalPages: number
  }
  myEntry: SkillPublishLeaderboardEntry | null
}

/** 当前有效公开 Skill 按作者聚合的总榜，独立于社区作品筛选。 */
export function getSkillPublishLeaderboard(
  params: { pageNum?: number; pageSize?: number } = {},
): Promise<ApiResponse<SkillPublishLeaderboardResponse>> {
  return get<SkillPublishLeaderboardResponse>('/api/skills/community/publish-leaderboard', {
    pageNum: String(params.pageNum ?? 1),
    pageSize: String(params.pageSize ?? 100),
  })
}

export interface SkillListQuery {
  pageNum?: number
  pageSize?: number
  keyword?: string
  categoryCode?: string
  skillType?: string
  status?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** GET /api/my/skills/stats — 我的技能页顶部统计 */
export interface MySkillStats {
  totalCount: number
  publishedCount: number
  draftCount: number
  totalViewCount: number
}

export function getMySkillStats(): Promise<ApiResponse<MySkillStats>> {
  return get<MySkillStats>('/api/my/skills/stats')
}

export function getMySkillList(
  params: SkillListQuery = {}
): Promise<ApiResponse<SkillListPageResult>> {
  const query: Record<string, string> = {
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 10),
  }
  if (params.keyword && params.keyword.trim()) query.keyword = params.keyword.trim()
  if (params.categoryCode && params.categoryCode.trim()) query.categoryCode = params.categoryCode.trim()
  if (params.skillType && params.skillType.trim()) query.skillType = params.skillType.trim()
  if (typeof params.status === 'number') query.status = String(params.status)
  if (params.sortBy && params.sortBy.trim()) query.sortBy = params.sortBy.trim()
  if (params.sortOrder) query.sortOrder = params.sortOrder
  return get<SkillListPageResult>('/api/skills/my', query)
}

export type SkillCommunityQuery = SkillListQuery & { includeMine?: boolean }

export function getSkillCommunityList(
  params: SkillCommunityQuery = {}
): Promise<ApiResponse<SkillListPageResult>> {
  const query: Record<string, string> = {
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 10),
  }
  if (params.keyword && params.keyword.trim()) query.keyword = params.keyword.trim()
  if (params.categoryCode && params.categoryCode.trim()) query.categoryCode = params.categoryCode.trim()
  if (params.skillType && params.skillType.trim()) query.skillType = params.skillType.trim()
  if (params.sortBy && params.sortBy.trim()) query.sortBy = params.sortBy.trim()
  if (params.sortOrder) query.sortOrder = params.sortOrder
  if (typeof params.includeMine === 'boolean') query.includeMine = String(params.includeMine)
  return get<SkillListPageResult>('/api/skills/community', query)
}

