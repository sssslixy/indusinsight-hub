import { del, get, postFormData, put } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { PageResponse } from '@/api/myContent'
import type {
  DocumentStatus,
  KbDocument,
  KbDocumentDetailView,
  DocumentListQuery,
  DocumentListSort,
} from '@/api/knowledgeDocument'

/**
 * 获取知识库文档列表（分页）
 *
 * 说明：
 * - 列表字段与 `KbDocument` 保持一致
 * - sort/filter 参数尽量复用前端筛选字段（由后端支持的部分生效）
 */
export function getKnowledgeBaseDocuments(
  kbId: number,
  params: DocumentListQuery = {},
): Promise<ApiResponse<PageResponse<KbDocument>>> {
  return get<PageResponse<KbDocument>>(`/api/knowledge-base/${kbId}/documents`, params)
}

/** GET /api/knowledge-base/{kbId}/documents/stats — 顶部统计卡片（不受列表筛选影响） */
export interface KbDocumentKbStats {
  totalDocuments: number
  processingCount: number
  failedCount: number
  enabledDocumentsCount: number
  totalChunkCount: number
  totalFileSize: number
  lastIndexedAtMax: string | null
}

export function getKnowledgeBaseDocumentStats(kbId: number): Promise<ApiResponse<KbDocumentKbStats>> {
  return get<KbDocumentKbStats>(`/api/knowledge-base/${kbId}/documents/stats`)
}

/** 组装文档列表 GET 查询参数（省略「全部」类默认值） */
export function buildDocumentListQuery(
  f: {
    keyword: string
    overallStatus: DocumentStatus | 'all'
    fileType: string | 'all'
    enabled: 'all' | 'enabled' | 'disabled'
    sortBy: DocumentListSort
  },
  pageNum: number,
  pageSize: number,
): DocumentListQuery {
  const q: DocumentListQuery = {
    pageNum,
    pageSize,
    sortBy: f.sortBy,
  }
  const kw = f.keyword?.trim()
  if (kw) q.keyword = kw
  if (f.overallStatus !== 'all') q.overallStatus = f.overallStatus
  if (f.fileType !== 'all') q.fileType = f.fileType
  if (f.enabled !== 'all') {
    q.enabled = f.enabled === 'enabled'
  }
  return q
}

/**
 * 文档详情（详情抽屉）
 * GET /api/knowledge-base/{kbId}/documents/{documentId}
 */
export function getKnowledgeBaseDocumentDetail(
  kbId: number,
  documentId: number,
): Promise<ApiResponse<KbDocumentDetailView>> {
  return get<KbDocumentDetailView>(`/api/knowledge-base/${kbId}/documents/${documentId}`)
}

/**
 * 上传知识库文档（multipart/form-data）
 * - 后端期望 FormData 字段名为 `files`
 * - 支持多文件：对同一字段名多次 append
 */
export function uploadKnowledgeBaseDocuments(
  kbId: number,
  files: File[],
): Promise<ApiResponse<unknown>> {
  const form = new FormData()
  for (const f of files) {
    form.append('files', f)
  }
  return postFormData<unknown>(`/api/knowledge-base/${kbId}/documents/upload`, form)
}

/** 后端返回：文档启用状态更新结果 */
export interface KbDocumentEnabledResult {
  id: number
  enabled: boolean
}

/**
 * 更新知识库文档启用状态（PUT，body: { enabled }）
 */
export function updateKnowledgeBaseDocumentEnabled(
  kbId: number,
  documentId: number,
  enabled: boolean,
): Promise<ApiResponse<KbDocumentEnabledResult>> {
  return put<KbDocumentEnabledResult>(`/api/knowledge-base/${kbId}/documents/${documentId}/enabled`, {
    enabled,
  })
}

export interface KbDocumentDeletedResult {
  id: number
  deleted: boolean
}

/**
 * 软删除知识库文档
 */
export function deleteKnowledgeBaseDocument(
  kbId: number,
  documentId: number,
): Promise<ApiResponse<KbDocumentDeletedResult>> {
  return del<KbDocumentDeletedResult>(`/api/knowledge-base/${kbId}/documents/${documentId}`)
}

