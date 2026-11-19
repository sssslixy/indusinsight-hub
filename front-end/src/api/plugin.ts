import { get, post } from '@/utils/request'
import type { ApiResponse } from '@/types/api'

// ----------------------------------------------------------------
// 热门插件（首页用）
// ----------------------------------------------------------------
export interface HotPluginItem {
  id: number
  pluginName: string
  pluginDescription: string
  pluginIcon: string
  pluginCategory: number
  pluginCategoryLabel: string
  authorId: number
  authorName: string
  favoriteCount: number
  likeCount: number
  viewCount: number
}

export function getHotPlugins(limit: number = 6): Promise<ApiResponse<HotPluginItem[]>> {
  return get<HotPluginItem[]>(`/api/plugins/hot?limit=${limit}`)
}

// ----------------------------------------------------------------
// 社区列表（分页）
// ----------------------------------------------------------------
export interface PluginCommunityItem {
  id: number
  pluginName: string
  pluginDescription: string
  pluginIcon: string
  pluginCategory: number
  pluginCategoryLabel: string
  authorId: number
  authorName: string
  favoriteCount: number
  likeCount: number
  viewCount: number
  publishTime: string
  isLatest: boolean
  isHot: boolean
}

export interface PluginCommunityPageResult {
  list: PluginCommunityItem[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export interface PluginCommunityQuery {
  pageNum?: number
  pageSize?: number
  keyword?: string
  /** 分类编号 1-6，不传则全部 */
  category?: number | null
  sortBy?: string
}

export function getPluginCommunityList(
  params: PluginCommunityQuery
): Promise<ApiResponse<PluginCommunityPageResult>> {
  const query: Record<string, string> = {
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 10),
  }
  if (params.keyword && params.keyword.trim()) query.keyword = params.keyword.trim()
  if (params.category != null)              query.category = String(params.category)
  if (params.sortBy)                        query.sortBy = params.sortBy
  return get<PluginCommunityPageResult>('/api/plugins', query)
}

// ----------------------------------------------------------------
// 创建智能体 - 插件选择浮层（分页）
// 对接后端 /api/plugins/picker/list
// ----------------------------------------------------------------

export interface PluginPickerItem {
  id: number
  pluginName: string
  pluginDescription: string
  pluginIcon: string
  pluginCategory: number
  pluginCategoryLabel: string
  authorId: number
  authorName: string
  favoriteCount: number
  likeCount: number
  viewCount: number
  status?: number
  statusLabel?: string
  isLatest?: boolean
  isHot?: boolean
}

export interface PluginPickerPageResult {
  list: PluginPickerItem[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export interface PluginPickerQuery {
  pageNum?: number
  pageSize?: number
  keyword?: string
  /** 来源范围：all | mine | favorite | community */
  sourceScope?: 'all' | 'mine' | 'favorite' | 'community'
  /** 排序：hot | latest | favorite */
  sortBy?: 'hot' | 'latest' | 'favorite'
  /** 是否仅显示当前推荐分类 */
  recommendedCategoryOnly?: boolean
  /** 插件类别编号 1-6 */
  category?: number | null
}

export function getPluginPickerList(
  params: PluginPickerQuery
): Promise<ApiResponse<PluginPickerPageResult>> {
  const query: Record<string, string> = {
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 8),
  }

  if (params.keyword && params.keyword.trim()) {
    query.keyword = params.keyword.trim()
  }
  if (params.sourceScope) {
    query.sourceScope = params.sourceScope
  }
  if (params.sortBy) {
    query.sortBy = params.sortBy
  }
  if (typeof params.recommendedCategoryOnly === 'boolean') {
    query.recommendedCategoryOnly = String(params.recommendedCategoryOnly)
  }
  if (params.category != null) {
    query.category = String(params.category)
  }

  return get<PluginPickerPageResult>('/api/plugins/picker/list', query)
}

// ----------------------------------------------------------------
// 智能体编辑回填：按 id 批量获取插件基础信息
// POST /api/plugins/basic/by-ids
// ----------------------------------------------------------------
export interface PluginBasicResponse {
  id: number
  pluginName: string
  pluginIcon?: string
}

export function getPluginBasicsByIds(ids: Array<number | string>): Promise<ApiResponse<PluginBasicResponse[]>> {
  const norm = (ids || [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0)
  return post<PluginBasicResponse[]>('/api/plugins/basic/by-ids', { ids: norm })
}

// ----------------------------------------------------------------
// 插件代码静态校验（创建/编辑插件用）
// POST /api/plugins/code/validate
// ----------------------------------------------------------------

export interface PluginCodeValidateRequest {
  /** 插件类型 1~5：DP=1, FE=2, MS=3, HD=4, RA=5 */
  pluginClass: number
  codeFileName: string
  codeContent: string
}

export interface PluginCodeIssueDTO {
  ruleCode: string
  severity: string
  message: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  source?: string
}

export interface PluginCodeValidateResponse {
  passed: boolean
  summary: { errorCount: number; warningCount: number }
  issues: PluginCodeIssueDTO[]
}

export function validatePluginCode(
  req: PluginCodeValidateRequest
): Promise<ApiResponse<PluginCodeValidateResponse>> {
  return post<PluginCodeValidateResponse>('/api/plugins/code/validate', req)
}

// ----------------------------------------------------------------
// 插件代码格式化（仅 .py）
// ----------------------------------------------------------------
export interface PluginCodeFormatRequest {
  codeFileName: string
  codeContent: string
}

export interface PluginCodeFormatResponse {
  formattedCode: string
}

export function formatPluginCode(
  req: PluginCodeFormatRequest
): Promise<ApiResponse<PluginCodeFormatResponse>> {
  return post<PluginCodeFormatResponse>('/api/plugins/code/format', req)
}

// ----------------------------------------------------------------
// 创建插件 - 保存草稿
// POST /api/plugins/draft
// ----------------------------------------------------------------

export interface PluginDraftSaveRequest {
  pluginId?: number | null
  pluginName: string
  pluginDescription?: string
  pluginIcon?: string
  pluginCategory: number
  codeFileName: string
  /** 是否公开：0/1 */
  isPublic: number
  codeContent: string
  /** 参数配置对象（后端会序列化入库） */
  paramConfig?: any
}

export interface PluginDraftSaveResponse {
  pluginId: number
}

export function savePluginDraft(
  req: PluginDraftSaveRequest
): Promise<ApiResponse<PluginDraftSaveResponse>> {
  return post<PluginDraftSaveResponse>('/api/plugins/draft', req)
}

// ----------------------------------------------------------------
// 发布插件
// POST /api/plugins/publish
// 复用草稿保存的请求结构
// ----------------------------------------------------------------

export interface PublishPluginRequest extends PluginDraftSaveRequest {}

export interface PublishPluginResponse {
  pluginId: number
  status: number
  statusLabel?: string
  publishTime?: string
}

export function publishPlugin(
  req: PublishPluginRequest,
): Promise<ApiResponse<PublishPluginResponse>> {
  return post<PublishPluginResponse>('/api/plugins/publish', req)
}

// ----------------------------------------------------------------
// 编辑插件 - 详情回填（我的插件）
// GET /api/plugins/{id}/edit
// ----------------------------------------------------------------

export interface PluginEditDetailResponse {
  id: number
  pluginName: string
  pluginDescription?: string
  pluginIcon?: string
  pluginCategory: number
  pluginCategoryLabel?: string
  status: number
  isPublic: number
  publishTime?: string
  createdAt?: string
  updatedAt?: string
  codeFileName: string
  codeContent: string
  /** 反序列化后的参数配置对象 */
  paramConfig?: any
}

export function getPluginEditDetail(
  id: number,
): Promise<ApiResponse<PluginEditDetailResponse>> {
  return get<PluginEditDetailResponse>(`/api/plugins/${id}/edit`)
}

/** 社区查看插件详情（已发布插件的只读详情，与编辑详情同结构）GET /api/plugins/{id}/view */
export function getPluginViewDetail(
  id: number,
): Promise<ApiResponse<PluginEditDetailResponse>> {
  return get<PluginEditDetailResponse>(`/api/plugins/${id}/view`)
}
