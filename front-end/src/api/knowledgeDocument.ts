export type DocumentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'disabled'

export type KbVisibility = 'private' | 'team' | 'public'
export type KbStatus = 'draft' | 'active' | 'reindexing' | 'disabled' | 'failed'

export interface KbKnowledgeBaseOverview {
  id: number
  name: string
  visibility: KbVisibility
  status: KbStatus
  documentCount: number
  chunkCount: number
  totalFileSize: number
  lastIndexedAt: string | null
}

export interface KbDocumentTask {
  id: number
  kbId: number
  documentId: number
  taskType: 'parse' | 'split' | 'embed' | 'index' | 'reindex'
  status: DocumentStatus
  message?: string | null
  createdAt: string
  updatedAt: string
}

export interface KbDocument {
  id: number
  kbId: number
  documentCode: string

  name: string
  sourceType: string
  fileType: string
  mimeType: string
  originalFileName: string
  fileExtension: string
  fileSize: number
  fileHash: string

  parseStatus: DocumentStatus
  splitStatus: DocumentStatus
  embeddingStatus: DocumentStatus
  indexStatus: DocumentStatus
  overallStatus: DocumentStatus

  pageCount: number
  tokenCount: number
  chunkCount: number

  language: string
  parserType: string
  versionNo: number

  enabled: boolean

  lastParsedAt: string | null
  lastEmbeddedAt: string | null

  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/** 文档管理排序（与后端 KnowledgeBaseDocumentHelper.resolveDocumentListOrderBy 一致） */
export type DocumentListSort = 'createdAt_desc' | 'fileSize_desc' | 'chunkCount_desc'

export interface DocumentListQuery {
  keyword?: string
  overallStatus?: DocumentStatus | 'all'
  fileType?: string | 'all'
  enabled?: boolean | 'all'
  sortBy?: DocumentListSort
  pageNum?: number
  pageSize?: number
}

/** 文档详情抽屉：与 kb_knowledge_base 处理配置对齐（GET 详情接口 kb 块；embeddingProvider 在 UI 为「模型提供方」） */
export interface KbDocumentDetailKbConfig {
  knowledgeBaseId?: number
  name: string
  visibility: KbVisibility
  embeddingProvider: string | null
  embeddingModel: string | null
  retrievalStrategy: string | null
  chunkStrategy: string | null
  chunkSize: number | null
  chunkOverlap: number | null
}

/** 与后端 KbDocumentDetailLatestTaskVO 对齐 */
export interface KbDocumentDetailLatestTask {
  id: number
  taskCode: string | null
  taskType: string | null
  taskStatus: string | null
  triggerType: string | null
  retryCount: number | null
  maxRetryCount: number | null
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
  errorStack: string | null
  latestErrorStage: string | null
}

/** 文档详情抽屉：失败摘要（与后端 KbDocumentDetailFailureVO 对齐） */
export interface KbDocumentDetailFailure {
  failedStageLabel: string | null
  errorMessage: string | null
  errorStack: string | null
  lastTaskStatus: string | null
  lastTaskTypeLabel: string | null
}

/** 文档详情 GET 接口完整 data（与后端 KbDocumentDetailVO 对齐） */
export interface KbDocumentDetailView {
  document: KbDocument
  kb: KbDocumentDetailKbConfig
  failure: KbDocumentDetailFailure | null
  latestTask: KbDocumentDetailLatestTask | null
}

