import type { DocumentListSort, DocumentStatus } from '@/api/knowledgeDocument'

export type DraftFilter = {
  keyword: string
  overallStatus: DocumentStatus | 'all'
  fileType: string | 'all'
  enabled: 'all' | 'enabled' | 'disabled'
  sortBy: DocumentListSort
}
