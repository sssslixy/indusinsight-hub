<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { BackButton } from '@/components/base'
import MyKnowledgeFilterBar, {
  type KnowledgeMyFilterParams,
} from '@/components/knowledge-base/MyKnowledgeFilterBar.vue'
import { KnowledgeBaseStats, KnowledgeBaseCard, DeleteKnowledgeBaseDialog } from './components'
import {
  deleteKnowledgeBase,
  getMyKnowledgeBaseList,
  getMyKnowledgeBaseOwnerStats,
  type MyKnowledgeBaseItem,
  type MyKnowledgeBaseOwnerStatsResponse,
  type MyKnowledgeBaseQueryParams,
} from '@/api/knowledgeBase'

const router = useRouter()
const { t } = useI18n()
const PAGE_SIZE = 6

const list = ref<MyKnowledgeBaseItem[]>([])
const page = ref(1)
const total = ref(0)
const totalPagesRaw = ref(1)
const totalPages = computed(() => Math.max(1, totalPagesRaw.value))

/** 首次进入页面：整块占位加载；后续筛选/排序/搜索：仅在列表区域叠加半透明遮罩，避免空状态 ↔ 加载中 DOM 切换闪烁 */
const listBootstrapping = ref(true)
const listRefreshing = ref(false)

const deletingId = ref<number | null>(null)

const deleteDialogVisible = ref(false)
const pendingDeleteId = ref<number | null>(null)
const pendingDeleteName = ref('')
const deleteLoading = ref(false)

const filterParams = ref<KnowledgeMyFilterParams>({
  keyword: '',
  visibility: 'all',
  sortBy: 'createdAt_desc',
})
const filterBarKey = ref(0)

const ownerStats = ref<MyKnowledgeBaseOwnerStatsResponse | null>(null)

const fmtStat = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(Number(n))) return '--'
  const num = Number(n)
  return num >= 1000 ? `${(num / 1000).toFixed(1)}K` : String(num)
}

const statsItems = computed(() => {
  const s = ownerStats.value
  return [
    { label: t('knowledgeBase.my.totalKnowledgeBases'), value: s != null ? fmtStat(s.totalCount) : '--', iconKey: 'total' as const },
    { label: t('knowledgeBase.my.publicCount'), value: s != null ? fmtStat(s.publicCount) : '--', iconKey: 'public' as const },
    { label: t('knowledgeBase.my.privateCount'), value: s != null ? fmtStat(s.privateCount) : '--', iconKey: 'private' as const },
    { label: t('knowledgeBase.my.totalDocuments'), value: s != null ? fmtStat(s.totalDocumentCount) : '--', iconKey: 'documents' as const },
  ]
})

async function fetchOwnerStats() {
  try {
    const res = await getMyKnowledgeBaseOwnerStats()
    ownerStats.value = res.data ?? null
  } catch {
    ownerStats.value = null
  }
}

const mapVisibilityToBackend = (
  v: KnowledgeMyFilterParams['visibility'],
): MyKnowledgeBaseItem['visibility'] | undefined => {
  if (v === 'all') return undefined
  return v
}

const mapSortByToBackend = (
  v: KnowledgeMyFilterParams['sortBy'],
): 'createdAtDesc' | 'documentCountDesc' => {
  switch (v) {
    case 'createdAt_desc':
      return 'createdAtDesc'
    case 'documentCount_desc':
      return 'documentCountDesc'
    default:
      return 'createdAtDesc'
  }
}

const fetchList = async () => {
  const overlayOnly = !listBootstrapping.value
  if (overlayOnly) {
    listRefreshing.value = true
  }

  try {
    const params: MyKnowledgeBaseQueryParams = {
      pageNum: page.value,
      pageSize: PAGE_SIZE,
      scope: 'all',
      sortBy: mapSortByToBackend(filterParams.value.sortBy),
    }

    const kw = filterParams.value.keyword.trim()
    if (kw) params.keyword = kw

    const mappedVisibility = mapVisibilityToBackend(filterParams.value.visibility)
    if (mappedVisibility) params.visibility = mappedVisibility

    const res = await getMyKnowledgeBaseList(params)
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
    page.value = res.data?.pageNum || page.value
    totalPagesRaw.value = res.data?.totalPages || 1
  } catch (e: unknown) {
    const err = e as { message?: string }
    ElMessage({
      message: err?.message || t('knowledgeBase.my.loadFailed'),
      type: 'error',
      duration: 3000,
    })
  } finally {
    listRefreshing.value = false
    listBootstrapping.value = false
  }
}

const waitForListIdle = async () => {
  while (listRefreshing.value || listBootstrapping.value) {
    await new Promise<void>(resolve => setTimeout(resolve, 50))
  }
}

const pagedList = computed(() => list.value)

const isFiltered = computed(
  () =>
    filterParams.value.keyword.trim() !== '' ||
    filterParams.value.visibility !== 'all',
)

const handleFilterSearch = (params: KnowledgeMyFilterParams) => {
  filterParams.value = { ...params }
  page.value = 1
  void fetchList()
}

const handleFilterReset = () => {
  filterParams.value = {
    keyword: '',
    visibility: 'all',
    sortBy: 'createdAt_desc',
  }
  filterBarKey.value += 1
  page.value = 1
  void Promise.all([fetchOwnerStats(), fetchList()])
}

const goPage = async (next: number) => {
  if (listRefreshing.value || listBootstrapping.value) return
  if (next < 1 || next > totalPages.value || next === page.value) return
  page.value = next
  window.scrollTo({ top: 0, behavior: 'smooth' })
  await fetchList()
}

const getPages = () => {
  const pages: (number | string)[] = []
  const totalNum = totalPages.value
  const current = page.value
  if (totalNum <= 7) {
    for (let i = 1; i <= totalNum; i++) pages.push(i)
  } else if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...', totalNum)
  } else if (current >= totalNum - 3) {
    pages.push(1, '...')
    for (let i = totalNum - 4; i <= totalNum; i++) pages.push(i)
  } else {
    pages.push(1, '...')
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push('...', totalNum)
  }
  return pages
}

const handleDelete = (id: number) => {
  const item = list.value.find(row => row.id === id)
  if (!item) return

  if (listRefreshing.value || listBootstrapping.value || deletingId.value !== null || deleteDialogVisible.value)
    return

  pendingDeleteId.value = id
  pendingDeleteName.value = item.name
  deleteDialogVisible.value = true
}

const handleDeleteConfirm = async () => {
  if (pendingDeleteId.value === null) return

  deleteLoading.value = true
  deletingId.value = pendingDeleteId.value

  try {
    await deleteKnowledgeBase(pendingDeleteId.value)
    ElMessage({ message: t('knowledgeBase.my.deleteSuccess'), type: 'success', duration: 2200 })

    const pageBeforeDelete = page.value
    await waitForListIdle()
    await fetchList()

    if (list.value.length === 0 && pageBeforeDelete > 1 && total.value > 0) {
      page.value = Math.min(pageBeforeDelete - 1, totalPages.value)
      await waitForListIdle()
      await fetchList()
    }

    deleteDialogVisible.value = false
    pendingDeleteId.value = null
    pendingDeleteName.value = ''
    await fetchOwnerStats()
  } catch (e: unknown) {
    const err = e as { message?: string }
    ElMessage({
      message: err?.message || t('knowledgeBase.my.deleteFailed'),
      type: 'error',
      duration: 3000,
    })
  } finally {
    deleteLoading.value = false
    deletingId.value = null
  }
}

const handleDeleteCancel = () => {
  deleteDialogVisible.value = false
  pendingDeleteId.value = null
  pendingDeleteName.value = ''
  deleteLoading.value = false
}

onMounted(() => {
  void fetchOwnerStats()
  void fetchList()
})
</script>

<template>
  <div class="knowledge-page">
    <DashboardHeader />
    <main class="page-main">
      <div class="page-container">
        <section class="page-header">
          <div class="title-area">
            <h1 class="page-title">{{ t('knowledgeBase.my.title') }}</h1>
            <p class="page-subtitle">{{ t('knowledgeBase.my.subtitle') }}</p>
          </div>
          <div class="header-actions">
            <BackButton />
            <button class="create-btn" @click="router.push('/knowledge/create')">
              {{ t('knowledgeBase.my.create') }}
            </button>
          </div>
        </section>

        <KnowledgeBaseStats :stats="statsItems" />

        <MyKnowledgeFilterBar
          :key="filterBarKey"
          @search="handleFilterSearch"
          @reset="handleFilterReset"
        />

        <div v-if="listBootstrapping" class="loading-state">
          <span class="loading-spinner"></span>
          <span>{{ t('common.loading') }}</span>
        </div>

        <div v-else class="list-section-main">
          <div v-if="listRefreshing" class="list-refresh-overlay" aria-busy="true" aria-live="polite">
            <span class="loading-spinner loading-spinner--sm"></span>
            <span>{{ t('common.loading') }}</span>
          </div>

          <template v-if="pagedList.length > 0">
            <div class="card-list">
              <KnowledgeBaseCard
                v-for="item in pagedList"
                :key="item.id"
                :item="item"
                :delete-loading="deletingId === item.id"
                :delete-disabled="
                  deletingId !== null || listRefreshing || listBootstrapping || deleteDialogVisible
                "
                @edit="(id) => router.push(`/my/knowledge/${id}/edit`)"
                @manage-docs="(id) => router.push(`/my/knowledge/${id}/documents`)"
                @delete="handleDelete"
              />
            </div>

            <div class="pagination">
              <span class="pagination-info">{{ t('knowledgeBase.my.paginationInfo', { total, page }) }}</span>
              <div class="pagination-controls">
                <button class="page-btn" :disabled="page === 1 || listRefreshing" @click="goPage(page - 1)">
                  {{ t('common.previousPage') }}
                </button>
                <button
                  v-for="(p, idx) in getPages()"
                  :key="idx"
                  class="page-num"
                  :class="{ active: p === page, ellipsis: p === '...' }"
                  :disabled="p === '...' || listRefreshing"
                  @click="typeof p === 'number' && !listRefreshing && goPage(p)"
                >
                  {{ p }}
                </button>
                <button class="page-btn" :disabled="page === totalPages || listRefreshing" @click="goPage(page + 1)">
                  {{ t('common.nextPage') }}
                </button>
              </div>
            </div>
          </template>

          <section v-else class="empty-state">
            <div class="empty-icon">📚</div>
            <p class="empty-title">{{ isFiltered ? t('knowledgeBase.my.noMatchingTitle') : t('knowledgeBase.my.emptyTitle') }}</p>
            <p class="empty-sub">
              {{ isFiltered ? t('knowledgeBase.my.noMatchingHint') : t('knowledgeBase.my.emptyHint') }}
            </p>
            <button class="create-btn" @click="router.push('/knowledge/create')">
              {{ t('knowledgeBase.my.create') }}
            </button>
          </section>
        </div>
      </div>
    </main>

    <DeleteKnowledgeBaseDialog
      :visible="deleteDialogVisible"
      :knowledge-base-name="pendingDeleteName"
      :confirm-loading="deleteLoading"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<style scoped>
.knowledge-page { min-height: 100vh; background: var(--app-color-bg-page); display: flex; flex-direction: column; }
.page-main { flex: 1; padding-top: var(--app-page-top-desktop); padding-bottom: var(--app-page-bottom-desktop); }
.page-container { max-width: 1100px; margin: 0 auto; padding: 48px 48px 0; display: flex; flex-direction: column; gap: 32px; }
.page-header { padding-bottom: 32px; border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
.title-area { flex: 1; }
.page-title { margin: 0 0 8px; font-size: 32px; font-weight: 600; color: #1a1a1a; line-height: 1.2; }
.page-subtitle { margin: 0; font-size: 15px; color: var(--app-color-text-secondary); line-height: 1.5; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.create-btn, .page-btn, .page-num { height: 40px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
.page-btn, .page-num { border: 1px solid rgba(0,0,0,0.12); background: transparent; color: #525252; padding: 0 16px; }
.create-btn { border: 1px solid #2d2d2d; background: #2d2d2d; color: #fff; padding: 0 18px; }
.create-btn:hover { background: #1a1a1a; border-color: #1a1a1a; }
.page-btn:hover:not(:disabled), .page-num:hover:not(:disabled):not(.active) { background: rgba(0,0,0,0.04); border-color: #2d2d2d; color: #1a1a1a; }

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 24px;
  min-height: 320px;
  color: var(--app-color-text-secondary);
  font-size: 14px;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #2d2d2d;
  border-radius: 50%;
  animation: kb-spin 0.7s linear infinite;
}

.loading-spinner--sm {
  width: 16px;
  height: 16px;
}

@keyframes kb-spin {
  to {
    transform: rotate(360deg);
  }
}

.list-section-main {
  position: relative;
  min-height: 520px;
  display: flex;
  flex-direction: column;
}

.list-refresh-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: rgba(250, 250, 250, 0.88);
  border-radius: 12px;
  font-size: 14px;
  color: var(--app-color-text-secondary);
}

.card-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; flex: 1; align-content: start; }
.pagination { margin-top: auto; padding-top: 24px; margin-bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pagination-info { font-size: 13px; color: var(--app-color-text-secondary); }
.pagination-controls { display: flex; align-items: center; gap: 6px; }
.page-btn:disabled, .page-num:disabled { opacity: 0.42; cursor: not-allowed; }
.page-num { min-width: 36px; padding: 0 10px; }
.page-num.active { background: #2d2d2d; border-color: #2d2d2d; color: #fff; }
.page-num.ellipsis { background: transparent; border: none; cursor: default; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; background: #fff; padding: 48px 24px; gap: 10px; }
.empty-icon { font-size: 34px; line-height: 1; opacity: 0.6; }
.empty-title { margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a; }
.empty-sub { margin: 0; font-size: 14px; color: var(--app-color-text-secondary); max-width: 440px; text-align: center; line-height: 1.6; }

@media (max-width: 900px) {
  .card-list { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .page-main { padding-top: var(--app-page-top-mobile); padding-bottom: var(--app-page-bottom-mobile); }
  .page-container { padding: 32px 20px 0; gap: 24px; }
  .page-header { flex-direction: column; }
  .page-title { font-size: 26px; }
  .header-actions { align-self: flex-start; }
  .pagination { flex-direction: column; align-items: flex-start; }
}
</style>
