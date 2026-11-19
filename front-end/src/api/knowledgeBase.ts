import { del, get, post, postFormData, put } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { PageResponse } from '@/api/myContent'

export interface CreateKnowledgeBaseRequest {
  name: string
  description?: string
  iconUrl?: string
  visibility: 'private' | 'team' | 'public'
  enabled: boolean
  embeddingProvider: string
  embeddingModel: string
  embeddingDimension: number
  denseDistanceMetric: 'cosine' | 'dot'
  sparseEnabled: boolean
  sparseProvider?: string
  sparseModel?: string
  retrievalStrategy: 'dense' | 'hybrid'
  topK: number
  scoreThreshold?: number | null
  rerankEnabled: boolean
  rerankProvider?: string
  rerankModel?: string
  parserConfig: string
  chunkConfig: string
  retrievalConfig: string
  chunkStrategy: 'paragraph' | 'token' | 'markdown_heading' | 'fixed'
  chunkSize: number
  chunkOverlap: number
}

export interface CreateKnowledgeBaseResponse {
  id: number
  kbCode: string
  name: string
  status: string
  visibility: string
  vectorCollectionId: number
  collectionCode: string
  collectionName: string
  createdAt: string
}

export function createKnowledgeBase(
  data: CreateKnowledgeBaseRequest
): Promise<ApiResponse<CreateKnowledgeBaseResponse>> {
  return post<CreateKnowledgeBaseResponse>('/api/knowledge-base/create', data)
}

export function uploadKnowledgeBaseIcon(file: File): Promise<ApiResponse<string>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormData<string>('/api/knowledge-base/icon', formData)
}

// ----------------------------------------------------------------
// 我的知识库（编辑）
// ----------------------------------------------------------------

export type KnowledgeBaseVisibility = 'private' | 'team' | 'public'

export type KnowledgeBaseEmbeddingProvider = 'ollama' | 'qwen' | string

export type KnowledgeBaseRetrievalStrategy = 'dense' | 'hybrid'

export type KnowledgeBaseChunkStrategy = 'paragraph' | 'token' | 'markdown_heading' | 'fixed'

export interface KnowledgeBaseFormData {
  name: string
  description: string
  iconUrl: string
  visibility: KnowledgeBaseVisibility
  enabled: boolean
  embeddingProvider: KnowledgeBaseEmbeddingProvider
  embeddingModel: string
  denseDistanceMetric: 'cosine' | 'dot'
  sparseEnabled: boolean
  retrievalStrategy: KnowledgeBaseRetrievalStrategy
  topK: number
  rerankEnabled: boolean
  rerankModel: string
  chunkPreferHeadingSplit: boolean
  chunkMinChunkLength: number
  chunkMergeShortParagraphs: boolean
  chunkTableAsSingleChunk: boolean
  chunkCodeBlockAsSingleChunk: boolean
  retrievalDensePrefetchLimit: number
  retrievalSparsePrefetchLimit: number
  retrievalFusion: string
  retrievalRerankTopN: number
  retrievalReturnPayload: boolean
  retrievalRewriteQuery: boolean
  chunkStrategy: KnowledgeBaseChunkStrategy
  chunkSize: number
  chunkOverlap: number
}

// 表单的“初始值”，用于创建页；编辑页会由后端回填覆盖
export const DEFAULT_KNOWLEDGE_BASE_FORM: KnowledgeBaseFormData = {
  name: '',
  description: '',
  iconUrl: 'system-1',
  visibility: 'private',
  embeddingProvider: '',
  embeddingModel: '',
  denseDistanceMetric: 'cosine',
  sparseEnabled: true,
  retrievalStrategy: 'hybrid',
  topK: 10,
  rerankEnabled: false,
  rerankModel: 'Qwen/Qwen3-Reranker-0.6B',
  chunkPreferHeadingSplit: true,
  chunkMinChunkLength: 100,
  chunkMergeShortParagraphs: true,
  chunkTableAsSingleChunk: true,
  chunkCodeBlockAsSingleChunk: true,
  retrievalDensePrefetchLimit: 20,
  retrievalSparsePrefetchLimit: 20,
  retrievalFusion: 'rrf',
  retrievalRerankTopN: 20,
  retrievalReturnPayload: true,
  retrievalRewriteQuery: false,
  chunkStrategy: 'paragraph',
  chunkSize: 512,
  chunkOverlap: 64,
  enabled: true,
}

export interface KnowledgeBaseEditDetailResponse {
  id: number
  name: string
  description: string
  iconUrl: string | null
  visibility: string
  enabled: boolean
  embeddingProvider: string
  embeddingModel: string
  embeddingDimension: number
  denseDistanceMetric: string
  sparseEnabled: boolean
  sparseProvider?: string
  sparseModel?: string
  collectionCode?: string
  collectionName?: string
  retrievalStrategy: string
  topK: number
  scoreThreshold?: number | null
  rerankEnabled: boolean
  rerankProvider?: string
  rerankModel?: string
  parserConfig?: string
  chunkConfig?: string
  retrievalConfig?: string
  chunkStrategy: string
  chunkSize: number
  chunkOverlap: number
}

export interface UpdateKnowledgeBaseRequest {
  name: string
  description?: string
  iconUrl?: string
  visibility: KnowledgeBaseVisibility | string
  enabled: boolean
  embeddingProvider: string
  embeddingModel: string
  embeddingDimension: number
  denseDistanceMetric: 'cosine' | 'dot'
  sparseEnabled: boolean
  sparseProvider?: string
  sparseModel?: string
  retrievalStrategy: KnowledgeBaseRetrievalStrategy
  topK: number
  scoreThreshold?: number | null
  rerankEnabled: boolean
  rerankProvider?: string
  rerankModel?: string
  parserConfig: string
  chunkConfig: string
  retrievalConfig: string
  chunkStrategy: KnowledgeBaseChunkStrategy
  chunkSize: number
  chunkOverlap: number
}

export interface UpdateKnowledgeBaseResponse {
  id: number
  name: string
  status: string
  visibility: string
  updatedAt: string
}

export function getKnowledgeBaseDetail(
  id: number,
): Promise<ApiResponse<KnowledgeBaseEditDetailResponse>> {
  return get<KnowledgeBaseEditDetailResponse>(`/api/knowledge-base/${id}/edit`)
}

export function updateKnowledgeBase(
  id: number,
  data: UpdateKnowledgeBaseRequest,
): Promise<ApiResponse<UpdateKnowledgeBaseResponse>> {
  return put<UpdateKnowledgeBaseResponse>(`/api/knowledge-base/${id}`, data)
}

// ----------------------------------------------------------------
// 我的知识库（列表）
// ----------------------------------------------------------------

export type MyKnowledgeBaseStatus = 'draft' | 'active' | 'reindexing' | 'disabled' | 'failed'
export type MyKnowledgeBaseVisibility = 'private' | 'team' | 'public'
export type MyKnowledgeBaseScope = 'all' | 'owner' | 'joined'

export type MyKnowledgeBaseSortBy = 'createdAtDesc' | 'documentCountDesc' | 'favoriteDesc'

export interface MyKnowledgeBaseOwnerStatsResponse {
  totalCount: number
  publicCount: number
  privateCount: number
  teamCount: number
  totalDocumentCount: number
}

export function getMyKnowledgeBaseOwnerStats(): Promise<
  ApiResponse<MyKnowledgeBaseOwnerStatsResponse>
> {
  return get<MyKnowledgeBaseOwnerStatsResponse>('/api/knowledge-base/my/stats')
}

/** 社区列表与后端 KnowledgeBaseHelper.normalizeCommunitySortBy */
export type KnowledgeBaseCommunitySortBy = 'latest' | 'favorite' | 'documentCountDesc'

export interface MyKnowledgeBaseItem {
  id: number
  kbCode: string
  name: string
  description: string
  iconUrl?: string | null
  status: MyKnowledgeBaseStatus
  visibility: MyKnowledgeBaseVisibility
  documentCount: number
  chunkCount: number
  totalFileSize: number
  createdAt: string
  updatedAt: string
  ownerUserId: number
  /** 社区列表等场景可能有值 */
  ownerName?: string | null
  myRole?: string
  lastIndexedAt?: string | null
  favoriteCount?: number | null
  viewCount?: number | null
}

export interface MyKnowledgeBaseQueryParams {
  keyword?: string
  status?: MyKnowledgeBaseStatus
  visibility?: MyKnowledgeBaseVisibility
  scope?: MyKnowledgeBaseScope
  sortBy?: MyKnowledgeBaseSortBy
  pageNum?: number
  pageSize?: number
}

export interface KnowledgeBaseCommunityQueryParams {
  includeMine?: boolean
  keyword?: string
  sortBy?: KnowledgeBaseCommunitySortBy
  pageNum?: number
  pageSize?: number
}

export function getMyKnowledgeBaseList(
  params: MyKnowledgeBaseQueryParams = {},
): Promise<ApiResponse<PageResponse<MyKnowledgeBaseItem>>> {
  return get<PageResponse<MyKnowledgeBaseItem>>('/api/knowledge-base/my', params)
}

/** 公开且启用的知识库；社区/热门传 includeMine=true，绑定选择器保留 false（默认）。 */
export function getKnowledgeBaseCommunityList(
  params: KnowledgeBaseCommunityQueryParams = {},
): Promise<ApiResponse<PageResponse<MyKnowledgeBaseItem>>> {
  const pageNum = params.pageNum != null && params.pageNum > 0 ? params.pageNum : 1
  const pageSize = params.pageSize != null && params.pageSize > 0 ? params.pageSize : 10
  const query: Record<string, string | number> = {
    pageNum,
    pageSize,
  }
  const kw = params.keyword?.trim()
  if (kw) query.keyword = kw
  if (params.sortBy) query.sortBy = params.sortBy
  if (typeof params.includeMine === 'boolean') query.includeMine = String(params.includeMine)
  return get<PageResponse<MyKnowledgeBaseItem>>('/api/knowledge-base/community', query)
}

export function checkFavoriteKnowledgeBase(id: number): Promise<ApiResponse<boolean>> {
  return get<boolean>(`/api/knowledge-base/${id}/favorite/check`)
}

export function addFavoriteKnowledgeBase(id: number): Promise<ApiResponse<void>> {
  return post<void>(`/api/knowledge-base/${id}/favorite`)
}

export function cancelFavoriteKnowledgeBase(id: number): Promise<ApiResponse<void>> {
  return del<void>(`/api/knowledge-base/${id}/favorite`)
}

/**
 * 在“我的知识库”列表中按 id 查询一条记录（scope: all）
 * 用于文档管理等页面拉取名称、可见性、状态等元信息
 */
export async function getMyKnowledgeBaseById(id: number): Promise<MyKnowledgeBaseItem | null> {
  if (!Number.isFinite(id) || id < 1) return null

  let pageNum = 1
  const pageSize = 50

  for (;;) {
    const res = await getMyKnowledgeBaseList({ scope: 'all', pageNum, pageSize })
    const data = res.data
    if (!data?.list?.length) return null

    const hit = data.list.find((x) => x.id === id)
    if (hit) return hit

    const totalPages =
      data.totalPages || Math.max(1, Math.ceil(Number(data.total || 0) / pageSize))
    if (pageNum >= totalPages) return null
    pageNum += 1
  }
}

// ----------------------------------------------------------------
// 我的知识库（删除）
// ----------------------------------------------------------------
export function deleteKnowledgeBase(
  id: number,
): Promise<ApiResponse<void>> {
  return del<void>(`/api/knowledge-base/${id}`)
}
