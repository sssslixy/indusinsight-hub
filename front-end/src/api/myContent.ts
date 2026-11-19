import { get, del, post } from '@/utils/request'
import type { ApiResponse } from '@/types/api'

// ── 通用分页结构 ──────────────────────────────────────────────

export interface PageResponse<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export interface MyContentQueryParams {
  pageNum?: number
  pageSize?: number
  keyword?: string
  status?: number
  sortBy?: string
}

// ── 我的智能体 ────────────────────────────────────────────────

export interface MyAgentItem {
  id: number
  agentName: string
  agentDescription: string
  agentIcon: string
  status: number
  statusLabel: string
  /** 智能体来源字段（兼容后端 snake_case） */
  sourceType?: string
  source_type?: string
  /** 当前生效配置版本号（仅已发布时展示），来自 agent_config.version_no */
  versionNo?: number | null
  createdAt: string
  updatedAt: string
  favoriteCount: number
  likeCount: number
  viewCount: number
  useCount: number
}

export interface MyAgentStats {
  totalCount: number
  publishedCount: number
  draftCount: number
  totalUseCount: number
}

export function getMyAgents(params: MyContentQueryParams = {}): Promise<ApiResponse<PageResponse<MyAgentItem>>> {
  return get<PageResponse<MyAgentItem>>('/api/my/agents', params)
}

export function getMyAgentStats(): Promise<ApiResponse<MyAgentStats>> {
  return get<MyAgentStats>('/api/my/agents/stats')
}

/**
 * 统一解析智能体来源（列表/详情可能为 sourceType 或 source_type）
 */
export function resolveAgentSourceType(entity: {
  sourceType?: string
  source_type?: string
}): 'platform' | 'external_service' {
  const raw = String(entity?.sourceType ?? entity?.source_type ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'external_service' || raw === 'external') {
    return 'external_service'
  }
  return 'platform'
}

export function deleteMyAgent(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/my/agents/${id}`)
}

// ── 我的插件 ──────────────────────────────────────────────────

export interface MyPluginItem {
  id: number
  pluginName: string
  pluginDescription: string
  pluginIcon: string
  pluginCategory: number
  pluginCategoryLabel: string
  status: number
  statusLabel: string
  createdAt: string
  updatedAt: string
  favoriteCount: number
  likeCount: number
  viewCount: number
}

export interface MyPluginStats {
  totalCount: number
  publishedCount: number
  draftCount: number
  totalViewCount: number
}

export function getMyPlugins(params: MyContentQueryParams = {}): Promise<ApiResponse<PageResponse<MyPluginItem>>> {
  return get<PageResponse<MyPluginItem>>('/api/my/plugins', params)
}

export function getMyPluginStats(): Promise<ApiResponse<MyPluginStats>> {
  return get<MyPluginStats>('/api/my/plugins/stats')
}

export function deleteMyPlugin(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/my/plugins/${id}`)
}

// ── 我的收藏 - 类型定义 ───────────────────────────────────────

export interface FavoriteStatsItem {
  totalCount: number
  favoriteAgentCount: number
  favoritePluginCount: number
  favoriteToolCount: number
  favoriteKnowledgeBaseCount: number
  recentAddedCount7d: number
}

export interface FavoriteAgentItem {
  id: number
  agentName: string
  agentDescription: string
  agentIcon: string
  authorId: number
  authorName: string
  status: number
  statusLabel: string
  publishTime: string
  favoriteCount: number
  likeCount: number
  viewCount: number
  useCount: number
  favoritedAt: string
  isHot: boolean
  isLatest: boolean
}

export interface FavoritePluginItem {
  id: number
  pluginName: string
  pluginDescription: string
  pluginIcon: string
  pluginCategory: number
  pluginCategoryLabel: string
  authorId: number
  authorName: string
  status: number
  statusLabel: string
  publishTime: string
  favoriteCount: number
  likeCount: number
  viewCount: number
  favoritedAt: string
  isHot: boolean
  isLatest: boolean
}

export interface FavoriteToolItem {
  id: number
  toolName: string
  toolDescription: string
  toolIcon: string
  categoryCode: string
  categoryLabel: string
  authorId: number
  authorName: string
  status: number
  statusLabel: string
  publishTime: string
  favoriteCount: number
  likeCount: number
  viewCount: number
  favoritedAt: string
  isHot: boolean
  isLatest: boolean
}

export interface FavoriteKnowledgeBaseItem {
  id: number
  kbName: string
  kbDescription: string
  kbIcon: string
  ownerUserId: number
  ownerName: string
  visibility: string
  status: string
  statusLabel: string
  documentCount: number
  chunkCount?: number
  totalFileSize?: number
  favoriteCount: number
  viewCount: number
  favoritedAt: string
  /** 知识库更新时间，与首页热门知识库「更新」一致 */
  updatedAt?: string
  isHot: boolean
  isLatest: boolean
}

// ── 我的收藏 - 接口 ───────────────────────────────────────────

/** 获取我的收藏顶部统计概览 */
export function getFavoriteStats(): Promise<ApiResponse<FavoriteStatsItem>> {
  return get<FavoriteStatsItem>('/api/my/favorites/stats')
}

/** 获取收藏的智能体分页列表 sortBy: favorited | favorite | latest */
export function getFavoriteAgents(params: MyContentQueryParams = {}): Promise<ApiResponse<PageResponse<FavoriteAgentItem>>> {
  return get<PageResponse<FavoriteAgentItem>>('/api/my/favorites/agents', params)
}

/** 添加收藏智能体（id 为智能体 ID，已收藏时幂等成功） */
export function addFavoriteAgent(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/my/favorites/agents/${id}`)
}

/** 查询当前用户是否已收藏该智能体 */
export function checkFavoriteAgent(id: number): Promise<ApiResponse<boolean>> {
  return get<boolean>(`/api/my/favorites/agents/${id}/check`)
}

/** 取消收藏智能体（id 为智能体 ID） */
export function cancelFavoriteAgent(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/my/favorites/agents/${id}`)
}

/** 获取收藏的插件分页列表 sortBy: favorited | favorite | latest */
export function getFavoritePlugins(params: MyContentQueryParams = {}): Promise<ApiResponse<PageResponse<FavoritePluginItem>>> {
  return get<PageResponse<FavoritePluginItem>>('/api/my/favorites/plugins', params)
}

/** 添加收藏插件（id 为插件 ID，已收藏时幂等成功） */
export function addFavoritePlugin(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/my/favorites/plugins/${id}`)
}

/** 查询当前用户是否已收藏该插件 */
export function checkFavoritePlugin(id: number): Promise<ApiResponse<boolean>> {
  return get<boolean>(`/api/my/favorites/plugins/${id}/check`)
}

/** 取消收藏插件（id 为插件 ID） */
export function cancelFavoritePlugin(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/my/favorites/plugins/${id}`)
}

/** 获取收藏的 tool 分页列表 sortBy: favorited | favorite | latest */
export function getFavoriteTools(params: MyContentQueryParams = {}): Promise<ApiResponse<PageResponse<FavoriteToolItem>>> {
  return get<PageResponse<FavoriteToolItem>>('/api/my/favorites/tools', params)
}

/** 添加收藏 tool（与 @/api/tool 中单条收藏接口不同，走我的收藏统一入口） */
export function addMyFavoriteTool(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/my/favorites/tools/${id}`)
}

export function checkMyFavoriteTool(id: number): Promise<ApiResponse<boolean>> {
  return get<boolean>(`/api/my/favorites/tools/${id}/check`)
}

export function cancelMyFavoriteTool(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/my/favorites/tools/${id}`)
}

/** 收藏的知识库分页 sortBy: favorited | favorite | latest（latest 按创建时间） */
export function getFavoriteKnowledgeBases(
  params: MyContentQueryParams = {},
): Promise<ApiResponse<PageResponse<FavoriteKnowledgeBaseItem>>> {
  return get<PageResponse<FavoriteKnowledgeBaseItem>>('/api/my/favorites/knowledge-bases', params)
}

export function addMyFavoriteKnowledgeBase(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/my/favorites/knowledge-bases/${id}`)
}

export function checkMyFavoriteKnowledgeBase(id: number): Promise<ApiResponse<boolean>> {
  return get<boolean>(`/api/my/favorites/knowledge-bases/${id}/check`)
}

export function cancelMyFavoriteKnowledgeBase(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/my/favorites/knowledge-bases/${id}`)
}

// ── 旧路径兼容（保留，my-agents / my-plugins 页面可能仍在用） ──

/** @deprecated 使用 getFavoriteAgents */
export function getMyFavoriteAgents(params: MyContentQueryParams = {}): Promise<ApiResponse<PageResponse<FavoriteAgentItem>>> {
  return getFavoriteAgents(params)
}

/** @deprecated 使用 getFavoritePlugins */
export function getMyFavoritePlugins(params: MyContentQueryParams = {}): Promise<ApiResponse<PageResponse<FavoritePluginItem>>> {
  return getFavoritePlugins(params)
}
