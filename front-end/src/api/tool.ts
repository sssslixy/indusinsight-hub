import { buildAuthHeaders, del, get, handleUnauthorizedResponse, post, postFormData } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import { i18n } from '@/i18n'

const tr = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params || {})

export interface ToolDraftPublishRequest {
  toolId?: number | null
  iconUrl?: string
  name: string
  description?: string
  categoryCode: string
  isPublic?: number
  fileName?: string
  entryFunction?: string
  timeoutMs?: number
  retryTimes?: number
  requiresGpu?: boolean
  /** JSON 字符串，含 input_schema / output_schema，对应 tool.tool_metadata */
  toolMetadata?: string
}

export interface ToolDraftPublishResponse {
  toolId: number
  status: string
  publishedAt?: string
}

export interface ToolListItem {
  id: number
  name: string
  description?: string
  categoryCode?: string
  iconUrl?: string
  status?: string
  isPublic?: boolean
  authorId?: number
  authorName?: string
  favoriteCount?: number
  viewCount?: number
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface ToolListPageResult {
  list: ToolListItem[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export interface ToolQuery {
  pageNum?: number
  pageSize?: number
  keyword?: string
  categoryCode?: string
  /** draft | published | disabled | validation_failed */
  status?: string
  /** 不传表示不限；false=仅私有 true=仅公开 */
  isPublic?: boolean
  /** 社区：latest | favorite | view | …；我的工具：created | favorite | view */
  sortBy?: string
}

export interface ToolDetail extends ToolListItem {
  iconUrl?: string
  toolMetadata?: string
  fileName?: string
  entryFunction?: string
  timeoutMs?: number
  retryTimes?: number
  requiresGpu?: boolean
  minioBucket?: string
  minioObjectKey?: string
  artifactSha256?: string
  artifactSize?: number
}

function buildToolDraftMultipart(data: ToolDraftPublishRequest, pyFile?: File | null): FormData {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  if (pyFile) {
    formData.append('artifact', pyFile, pyFile.name)
  }
  return formData
}

/** GET /api/my/tools/stats — 我的工具页顶部统计 */
export interface MyToolStats {
  totalCount: number
  publishedCount: number
  draftCount: number
  totalViewCount: number
}

export function getMyToolStats(): Promise<ApiResponse<MyToolStats>> {
  return get<MyToolStats>('/api/my/tools/stats')
}

export function getMyToolList(params: ToolQuery = {}): Promise<ApiResponse<ToolListPageResult>> {
  const query: Record<string, string> = {
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 10),
  }
  if (params.keyword?.trim()) query.keyword = params.keyword.trim()
  if (params.categoryCode?.trim()) query.categoryCode = params.categoryCode.trim()
  if (params.status?.trim()) query.status = params.status.trim()
  if (typeof params.isPublic === 'boolean') query.isPublic = String(params.isPublic)
  if (params.sortBy?.trim()) query.sortBy = params.sortBy.trim()
  return get<ToolListPageResult>('/api/tools/my', query)
}

export function getToolCommunityList(params: ToolQuery = {}): Promise<ApiResponse<ToolListPageResult>> {
  const query: Record<string, string> = {
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 10),
  }
  if (params.keyword?.trim()) query.keyword = params.keyword.trim()
  if (params.categoryCode?.trim()) query.categoryCode = params.categoryCode.trim()
  if (params.sortBy?.trim()) query.sortBy = params.sortBy.trim()
  return get<ToolListPageResult>('/api/tools/community', query)
}

export function getToolDetail(id: number): Promise<ApiResponse<ToolDetail>> {
  return get<ToolDetail>(`/api/tools/${id}`)
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

export async function downloadToolArtifact(id: number, filename?: string): Promise<void> {
  const requestOptions: RequestInit = { method: 'GET' }
  const res = await fetch(`/api/tools/${id}/download`, {
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
  const name = filename || parseDownloadFileName(res.headers.get('content-disposition')) || 'tool.py'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export function saveToolDraft(
  data: ToolDraftPublishRequest,
  pyFile?: File | null,
): Promise<ApiResponse<ToolDraftPublishResponse>> {
  return postFormData<ToolDraftPublishResponse>('/api/tools/draft', buildToolDraftMultipart(data, pyFile))
}

export function publishTool(
  data: ToolDraftPublishRequest,
  pyFile?: File | null,
): Promise<ApiResponse<ToolDraftPublishResponse>> {
  return postFormData<ToolDraftPublishResponse>('/api/tools/publish', buildToolDraftMultipart(data, pyFile))
}

export function uploadToolIcon(file: File): Promise<ApiResponse<string>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormData<string>('/api/tools/icon', formData)
}

export function deleteTool(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/tools/${id}`)
}

export function addToolView(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/tools/${id}/view`)
}

export function checkFavoriteTool(id: number): Promise<ApiResponse<boolean>> {
  return get<boolean>(`/api/tools/${id}/favorite/check`)
}

export function addFavoriteTool(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/tools/${id}/favorite`)
}

export function cancelFavoriteTool(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/tools/${id}/favorite`)
}
