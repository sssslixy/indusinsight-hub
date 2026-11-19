<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import DeletePluginDialog from '@/components/my-plugins/DeletePluginDialog.vue'
import MyToolsHeader from '@/components/my-tools/MyToolsHeader.vue'
import MyToolsFilterBar, { type ToolFilterParams } from '@/components/my-tools/MyToolsFilterBar.vue'
import MyToolCardList from '@/components/my-tools/MyToolCardList.vue'
import MyPluginsStats from '@/components/my-plugins/MyPluginsStats.vue'
import MyPluginsPagination from '@/components/my-plugins/MyPluginsPagination.vue'
import {
  getMyToolList,
  getMyToolStats,
  deleteTool,
  type ToolListItem,
  type MyToolStats,
} from '@/api/tool'

defineOptions({ name: 'MyToolsPage' })

const PAGE_SIZE = 6

const router = useRouter()
const { t } = useI18n()

const sortFrontToBack: Record<string, string> = {
  createdAt_desc: 'created',
  favoriteCount_desc: 'favorite',
  viewCount_desc: 'view',
}

const statusFrontToApi: Record<string, string | undefined> = {
  all: undefined,
  draft: 'draft',
  published: 'published',
}

const filterParams = ref<ToolFilterParams>({
  keyword: '',
  status: 'all',
  sort: 'createdAt_desc',
})
const filterBarKey = ref(0)
const currentPage = ref(1)

const tools = ref<ToolListItem[]>([])
const total = ref(0)
const totalPages = ref(1)
const listBootstrapping = ref(true)
const listRefreshing = ref(false)
const listError = ref('')

const stats = ref<MyToolStats | null>(null)

const fmt = (n: number | null | undefined) => {
  const num = n || 0
  return num >= 1000 ? `${(num / 1000).toFixed(1)}K` : String(num)
}

const statsItems = computed(() => {
  const s = stats.value
  return [
    { label: t('myContentPage.toolTotal'), value: s != null ? fmt(s.totalCount) : '--', iconKey: 'total' as const },
    { label: t('myContentPage.published'), value: s != null ? fmt(s.publishedCount) : '--', iconKey: 'published' as const },
    { label: t('myContentPage.draft'), value: s != null ? fmt(s.draftCount) : '--', iconKey: 'draft' as const },
    { label: t('myContentPage.totalViews'), value: s != null ? fmt(s.totalViewCount) : '--', iconKey: 'useCount' as const },
  ]
})

async function fetchStats() {
  try {
    const res = await getMyToolStats()
    stats.value = res.data
  } catch {
    stats.value = null
  }
}

async function fetchList() {
  const overlayOnly = !listBootstrapping.value
  if (overlayOnly) {
    listRefreshing.value = true
  }
  listError.value = ''
  try {
    const params: Parameters<typeof getMyToolList>[0] = {
      pageNum: currentPage.value,
      pageSize: PAGE_SIZE,
      sortBy: sortFrontToBack[filterParams.value.sort] || 'created',
    }
    if (filterParams.value.keyword.trim()) {
      params.keyword = filterParams.value.keyword.trim()
    }
    const st = statusFrontToApi[filterParams.value.status]
    if (st !== undefined) {
      params.status = st
    }
    const res = await getMyToolList(params)
    tools.value = res.data.list
    total.value = res.data.total
    totalPages.value = res.data.totalPages
  } catch (e: unknown) {
    const err = e as { message?: string }
    listError.value = err?.message || t('myContentPage.loadFailed')
    tools.value = []
    total.value = 0
    totalPages.value = 1
  } finally {
    listRefreshing.value = false
    listBootstrapping.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchList()
})

const handleSearch = (params: ToolFilterParams) => {
  filterParams.value = { ...params }
  currentPage.value = 1
  fetchList()
}

const handleReset = () => {
  filterParams.value = { keyword: '', status: 'all', sort: 'createdAt_desc' }
  currentPage.value = 1
  filterBarKey.value += 1
  fetchStats()
  fetchList()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchList()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const isFiltered = computed(
  () => filterParams.value.keyword.trim() !== '' || filterParams.value.status !== 'all',
)

const deleteDialogVisible = ref(false)
const pendingDeleteId = ref<number | null>(null)
const pendingDeleteName = ref('')
const deleteSubmitting = ref(false)

const handleDeleteRequest = (id: number) => {
  if (listRefreshing.value || deleteSubmitting.value || deleteDialogVisible.value) return
  const tool = tools.value.find((x) => x.id === id)
  if (!tool) return
  pendingDeleteId.value = id
  pendingDeleteName.value = tool.name || ''
  deleteDialogVisible.value = true
}

const handleDeleteConfirm = async () => {
  if (pendingDeleteId.value == null || deleteSubmitting.value) return
  deleteSubmitting.value = true
  try {
    await deleteTool(pendingDeleteId.value)
    deleteDialogVisible.value = false
    pendingDeleteId.value = null
    pendingDeleteName.value = ''
    if (tools.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1
    }
    await Promise.all([fetchStats(), fetchList()])
    ElMessage({ message: t('common.deleteSuccess'), type: 'success', duration: 2200 })
  } catch (e: unknown) {
    const err = e as { message?: string }
    ElMessage({ message: err?.message || t('common.deleteFailedRetry'), type: 'error', duration: 3000 })
  } finally {
    deleteSubmitting.value = false
  }
}

const handleDeleteCancel = () => {
  if (deleteSubmitting.value) return
  deleteDialogVisible.value = false
  pendingDeleteId.value = null
  pendingDeleteName.value = ''
}

const goCreateTool = () => router.push('/tools/create')
</script>

<template>
  <div class="my-tools-page">
    <DashboardHeader />
    <main class="page-main">
      <div class="page-container">
        <MyToolsHeader />
        <MyPluginsStats :stats="statsItems" />
        <MyToolsFilterBar
          :key="filterBarKey"
          @search="handleSearch"
          @reset="handleReset"
        />

        <div v-if="listBootstrapping" class="loading-state">
          <span class="loading-spinner" />
          <span>{{ t('common.loading') }}</span>
        </div>

        <div v-else class="list-section-main">
          <div v-if="listRefreshing" class="list-refresh-overlay" aria-busy="true" aria-live="polite">
            <span class="loading-spinner loading-spinner--sm" />
            <span>{{ t('common.loading') }}</span>
          </div>

          <div v-if="listError" class="error-state">
            <p class="error-text">{{ listError }}</p>
            <button class="retry-btn" type="button" @click="fetchList">{{ t('myContentPage.reload') }}</button>
          </div>

          <template v-else-if="tools.length > 0">
            <MyToolCardList :tools="tools" @delete="handleDeleteRequest" />
            <MyPluginsPagination
              :current-page="currentPage"
              :total-pages="totalPages"
              :total-count="total"
              :page-size="PAGE_SIZE"
              @page-change="handlePageChange"
            />
          </template>

          <div v-else class="empty-state">
            <div class="empty-icon">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect x="8" y="14" width="40" height="34" rx="5" stroke="#d4d4d4" stroke-width="2" />
                <path d="M20 14V11C20 9.9 20.9 9 22 9H34C35.1 9 36 9.9 36 11V14" stroke="#d4d4d4" stroke-width="2" />
                <circle cx="28" cy="30" r="7" stroke="#d4d4d4" stroke-width="2" />
                <path d="M24 30C24 27.8 25.8 26 28 26" stroke="#d4d4d4" stroke-width="1.8" stroke-linecap="round" />
                <circle cx="28" cy="30" r="2" fill="#d4d4d4" />
              </svg>
            </div>
            <p class="empty-title">{{ isFiltered ? t('myContentPage.noMatchingTools') : t('myContentPage.noToolsCreated') }}</p>
            <p class="empty-sub">
              {{ isFiltered ? t('myContentPage.adjustFilters') : t('myContentPage.createFirstTool') }}
            </p>
            <button v-if="!isFiltered" type="button" class="empty-create-btn" @click="goCreateTool">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              {{ t('myContentPage.createToolNow') }}
            </button>
            <button v-else type="button" class="empty-reset-btn" @click="handleReset">{{ t('myContentPage.clearFilters') }}</button>
          </div>
        </div>
      </div>
    </main>

    <DeletePluginDialog
      :visible="deleteDialogVisible"
      :plugin-name="pendingDeleteName"
      :entity-label="t('dashboard.entity.tool')"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<style scoped>
.my-tools-page {
  min-height: 100vh;
  background: var(--app-color-bg-page);
  display: flex;
  flex-direction: column;
}
.page-main {
  flex: 1;
  padding-top: var(--app-page-top-desktop);
  padding-bottom: var(--app-page-bottom-desktop);
}
.page-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 48px 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.list-section-main {
  position: relative;
  min-height: 120px;
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
  background: rgba(250, 250, 250, 0.85);
  border-radius: 12px;
  font-size: 14px;
  color: var(--app-color-text-secondary);
}

.loading-spinner--sm {
  width: 16px;
  height: 16px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 24px;
  color: var(--app-color-text-secondary);
  font-size: 14px;
}
.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #2d2d2d;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  gap: 12px;
}
.error-text {
  font-size: 14px;
  color: #dc2626;
  margin: 0;
}
.retry-btn {
  height: 36px;
  padding: 0 18px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  gap: 12px;
}
.empty-icon {
  margin-bottom: 8px;
  opacity: 0.7;
}
.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}
.empty-sub {
  font-size: 14px;
  color: var(--app-color-text-secondary);
  margin: 0;
  text-align: center;
  max-width: 360px;
  line-height: 1.6;
}
.empty-create-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  height: 40px;
  padding: 0 20px;
  background: #2d2d2d;
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
}
.empty-create-btn:hover {
  background: #1a1a1a;
  border-color: #1a1a1a;
}
.empty-reset-btn {
  display: flex;
  align-items: center;
  margin-top: 8px;
  height: 40px;
  padding: 0 20px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
}
.empty-reset-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

@media (max-width: 768px) {
  .page-main {
    padding-top: var(--app-page-top-mobile);
    padding-bottom: var(--app-page-bottom-mobile);
  }
  .page-container {
    padding: 32px 20px 0;
    gap: 24px;
  }
}
</style>
