import { computed, nextTick, ref, watch, type Ref } from 'vue'
import type { KbDocument, DocumentListSort } from '@/api/knowledgeDocument'
import type { KbDocumentKbStats } from '@/api/knowledgeBaseDocument'
import {
  buildDocumentListQuery,
  getKnowledgeBaseDocuments,
  getKnowledgeBaseDocumentStats,
} from '@/api/knowledgeBaseDocument'
import type { DraftFilter } from '../types'

const DEFAULT_PAGE_SIZE = 8

const defaultDraft: DraftFilter = {
  keyword: '',
  overallStatus: 'all',
  fileType: 'all',
  enabled: 'all',
  sortBy: 'createdAt_desc',
}

export function useDocumentFilters(kbId: Ref<number>) {
  const currentPage = ref(1)
  const draftFilter = ref<DraftFilter>({ ...defaultDraft })
  const appliedFilter = ref<DraftFilter>({ ...defaultDraft })

  const documents = ref<KbDocument[]>([])
  const serverTotal = ref(0)
  const kbStats = ref<KbDocumentKbStats | null>(null)

  /** 筛选 / 排序 / 翻页刷新列表时短暂遮罩（不影响表格挂载，避免整块卸载闪烁） */
  const tableRefreshing = ref(false)

  const enabledOptions: Array<DraftFilter['enabled']> = ['all', 'enabled', 'disabled']
  const overallOptions: Array<DraftFilter['overallStatus']> = [
    'all',
    'pending',
    'processing',
    'success',
    'failed',
  ]
  const fileTypeOptions = [
    { labelKey: 'knowledgeBase.documents.all', value: 'all' as const },
    { label: 'pdf', value: 'pdf' as const },
    { label: 'docx', value: 'docx' as const },
    { label: 'txt', value: 'txt' as const },
    { label: 'md', value: 'md' as const },
    { label: 'xlsx', value: 'xlsx' as const },
    { labelKey: 'category.other', value: 'other' as const },
  ]
  const sortOptions: Array<{ labelKey: string; value: DocumentListSort }> = [
    { labelKey: 'knowledgeBase.documents.sort.recentlyUploaded', value: 'createdAt_desc' },
    { labelKey: 'knowledgeBase.documents.sort.fileSize', value: 'fileSize_desc' },
    { labelKey: 'knowledgeBase.documents.sort.chunkCount', value: 'chunkCount_desc' },
  ]

  const totalCount = computed(() => serverTotal.value)
  const totalPages = computed(() => Math.max(1, Math.ceil(serverTotal.value / DEFAULT_PAGE_SIZE)))

  /** 当前页数据（服务端分页，仅一页） */
  const pagedDocs = computed(() => documents.value)

  /** 知识库内是否至少有一条未删文档（用于「暂无文档」vs「暂无匹配」） */
  const kbHasDocuments = computed(() => (kbStats.value?.totalDocuments ?? 0) > 0)

  const docsExist = computed(() => kbHasDocuments.value)

  async function refreshKbStats() {
    const id = kbId.value
    if (!Number.isFinite(id) || id <= 0) return
    const res = await getKnowledgeBaseDocumentStats(id)
    kbStats.value = res.data ?? null
  }

  async function fetchDocuments(options?: { silent?: boolean }) {
    const silent = options?.silent === true
    const id = kbId.value
    if (!Number.isFinite(id) || id <= 0) return
    if (!silent) tableRefreshing.value = true
    try {
      const params = buildDocumentListQuery(appliedFilter.value, currentPage.value, DEFAULT_PAGE_SIZE)
      const res = await getKnowledgeBaseDocuments(id, params)
      const page = res.data
      documents.value = page?.list ?? []
      serverTotal.value = Number(page?.total ?? 0)
    } finally {
      if (!silent) tableRefreshing.value = false
    }
  }

  /**
   * 统计 + 当前筛选下列表（用于首屏、筛选重置、上传/删除后）
   */
  async function refreshListAndStats(options?: { silent?: boolean }) {
    await refreshKbStats()
    await fetchDocuments(options)
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value)
      await fetchDocuments(options)
    }
  }

  function handleSearch() {
    if (tableRefreshing.value) return
    // 下拉框在模板中 @change 也会调用此处：将 draft 同步为 applied 并请求后端
    appliedFilter.value = { ...draftFilter.value }
    currentPage.value = 1
    void fetchDocuments()
  }

  function handleReset() {
    if (tableRefreshing.value) return
    draftFilter.value = { ...defaultDraft }
    appliedFilter.value = { ...defaultDraft }
    currentPage.value = 1
    void refreshListAndStats()
  }

  async function goPage(next: number) {
    if (tableRefreshing.value) return
    if (next < 1 || next > totalPages.value) return
    if (next === currentPage.value) return
    currentPage.value = next
    await fetchDocuments()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await nextTick()
  }

  function resetByRouteChange() {
    draftFilter.value = { ...defaultDraft }
    appliedFilter.value = { ...defaultDraft }
    currentPage.value = 1
    documents.value = []
    serverTotal.value = 0
    kbStats.value = null
  }

  /** 数据变更后保持当前草稿条件，重置到第 1 页并拉列表（统计由上层是否在 refreshListAndStats 中处理） */
  function resetByDataReload() {
    appliedFilter.value = { ...draftFilter.value }
    currentPage.value = 1
  }

  function getPages(): (number | string)[] {
    const total = totalPages.value
    const current = currentPage.value
    const pages: (number | string)[] = []
    if (total <= 7) {
      for (let i = 1; i <= total; i += 1) pages.push(i)
    } else if (current <= 4) {
      for (let i = 1; i <= 5; i += 1) pages.push(i)
      pages.push('...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...')
      for (let i = total - 4; i <= total; i += 1) pages.push(i)
    } else {
      pages.push(1, '...')
      for (let i = current - 1; i <= current + 1; i += 1) pages.push(i)
      pages.push('...', total)
    }
    return pages
  }

  watch(
    () => totalCount.value,
    () => {
      if (currentPage.value > totalPages.value) currentPage.value = 1
    },
  )

  return {
    currentPage,
    draftFilter,
    appliedFilter,
    tableRefreshing,
    enabledOptions,
    overallOptions,
    fileTypeOptions,
    sortOptions,
    kbStats,
    totalCount,
    totalPages,
    pagedDocs,
    docsExist,
    handleSearch,
    handleReset,
    goPage,
    getPages,
    resetByRouteChange,
    resetByDataReload,
    fetchDocuments,
    refreshKbStats,
    refreshListAndStats,
    PAGE_SIZE: DEFAULT_PAGE_SIZE,
  }
}
