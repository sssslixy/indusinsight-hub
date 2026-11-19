<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { BackButton } from '@/components/base'

import type { KbDocument, KbKnowledgeBaseOverview } from '@/api/knowledgeDocument'

import {
  deleteKnowledgeBaseDocument,
  updateKnowledgeBaseDocumentEnabled,
  uploadKnowledgeBaseDocuments,
} from '@/api/knowledgeBaseDocument'
import { getMyKnowledgeBaseById } from '@/api/knowledgeBase'
import {
  KnowledgeBaseOverviewCard,
  DocumentTable,
  UploadDocumentDialog,
  DeleteDocumentDialog,
  DocumentToggleEnabledDialog,
} from './components'
import { useDocumentFilters } from './hooks/useDocumentFilters'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const kbId = computed(() => {
  const id = route.params?.id
  const n = Array.isArray(id) ? id[0] : id
  return Number(n)
})

const kb = ref<KbKnowledgeBaseOverview>({
  id: 0,
  name: '',
  visibility: 'private',
  status: 'active',
  documentCount: 0,
  chunkCount: 0,
  totalFileSize: 0,
  lastIndexedAt: null,
})

const listLoading = ref(false)

const {
  currentPage,
  draftFilter,
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
  refreshListAndStats,
  tableRefreshing,
} = useDocumentFilters(kbId)

const filterBusy = computed(() => listLoading.value || tableRefreshing.value)

const optionLabel = (opt: { label?: string; labelKey?: string }) =>
  opt.labelKey ? t(opt.labelKey) : (opt.label ?? '')

watch(
  kbStats,
  (s) => {
    if (!s) return
    kb.value.documentCount = s.totalDocuments
    kb.value.chunkCount = s.totalChunkCount
    kb.value.totalFileSize = s.totalFileSize
    kb.value.lastIndexedAt = s.lastIndexedAtMax ?? null
  },
  { deep: true },
)

/** 进入页面/切换路由知识库：拉取知识库元信息 + 文档列表（服务端分页）与汇总统计 */
const loadKnowledgeBasePage = async () => {
  const id = kbId.value
  if (!Number.isFinite(id) || id <= 0) {
    ElMessage({ message: t('knowledgeBase.documents.invalidKnowledgeBase'), type: 'error', duration: 2800 })
    await router.push('/my/knowledge')
    return
  }

  listLoading.value = true
  try {
    const item = await getMyKnowledgeBaseById(id)
    if (!item) {
      ElMessage({ message: t('knowledgeBase.documents.notFoundOrNoAccess'), type: 'error', duration: 3200 })
      await router.push('/my/knowledge')
      return
    }

    kb.value = {
      id: item.id,
      name: item.name,
      visibility: item.visibility,
      status: item.status,
      documentCount: item.documentCount ?? 0,
      chunkCount: item.chunkCount ?? 0,
      totalFileSize: item.totalFileSize ?? 0,
      lastIndexedAt: item.lastIndexedAt || null,
    }

    await refreshListAndStats({ silent: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('knowledgeBase.documents.loadFailed')
    ElMessage({ message: msg, type: 'error', duration: 3200 })
    await router.push('/my/knowledge')
  } finally {
    listLoading.value = false
  }
}

onMounted(() => {
  void loadKnowledgeBasePage()
})

watch(kbId, () => {
  resetByRouteChange()
  void loadKnowledgeBasePage()
})

// Upload
const uploadVisible = ref(false)
const uploading = ref(false)
const openUpload = () => {
  uploadVisible.value = true
}

/** 刷新统计 + 列表。upload 后 syncDraft=true，与旧行为一致：将草稿筛选同步为已应用并从第 1 页加载 */
const refreshDocuments = async (opts?: { withLoading?: boolean; syncDraft?: boolean }) => {
  const kid = kbId.value
  if (!Number.isFinite(kid) || kid <= 0) {
    throw new Error(t('knowledgeBase.documents.refreshMissingId'))
  }

  const withLoading = opts?.withLoading !== false
  if (opts?.syncDraft) {
    resetByDataReload()
  }
  await refreshListAndStats({ silent: opts?.withLoading === false })
}

const handleUpload = async (files: File[]) => {
  const kid = kbId.value
  if (!Number.isFinite(kid) || kid <= 0) {
    ElMessage({ message: t('knowledgeBase.documents.uploadMissingId'), type: 'error', duration: 3200 })
    return
  }
  if (!files || files.length === 0) {
    ElMessage({ message: t('knowledgeBase.documents.selectFilesFirst'), type: 'warning', duration: 2600 })
    return
  }

  uploading.value = true
  try {
    await uploadKnowledgeBaseDocuments(kid, files)

    ElMessage({ message: t('knowledgeBase.documents.uploadSuccess'), type: 'success', duration: 2200 })
    uploadVisible.value = false

    // 上传成功后刷新文档列表（以后端为准）
    try {
      await refreshDocuments({ syncDraft: true })
    } catch (e: any) {
      ElMessage({ message: e?.message || t('knowledgeBase.documents.uploadSuccessRefreshFailed'), type: 'warning', duration: 3200 })
    }
  } catch (e: any) {
    ElMessage({ message: e?.message || t('knowledgeBase.documents.uploadFailed'), type: 'error', duration: 3200 })
  } finally {
    uploading.value = false
  }
}

const closeUpload = () => {
  uploadVisible.value = false
}

// Delete
const deleteVisible = ref(false)
const deleteLoading = ref(false)
const deleteTargetDoc = ref<KbDocument | null>(null)
const openDelete = (doc: KbDocument) => {
  if (deleteLoading.value) return
  deleteTargetDoc.value = doc
  deleteVisible.value = true
}
const deleteBusyDocId = ref<number | null>(null)

const closeDelete = () => {
  if (deleteLoading.value) return
  deleteVisible.value = false
  deleteTargetDoc.value = null
}

const handleDeleteConfirm = async () => {
  if (!deleteTargetDoc.value) return
  const doc = deleteTargetDoc.value
  const kid = kbId.value
  if (!Number.isFinite(kid) || kid <= 0) {
    ElMessage({ message: t('knowledgeBase.documents.invalidKnowledgeBase'), type: 'error', duration: 2800 })
    return
  }

  deleteLoading.value = true
  deleteBusyDocId.value = doc.id
  try {
    await deleteKnowledgeBaseDocument(kid, doc.id)
    await refreshDocuments({ withLoading: false })
    deleteVisible.value = false
    deleteTargetDoc.value = null
    ElMessage({ message: t('knowledgeBase.documents.deleteSuccess'), type: 'success', duration: 2200 })
    await nextTick()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('knowledgeBase.documents.deleteFailed')
    ElMessage({ message: msg, type: 'error', duration: 3200 })
  } finally {
    deleteLoading.value = false
    deleteBusyDocId.value = null
  }
}

// Enable/Disable（联调后走 PUT enabled；确认弹窗与智能体删除/文档删除同结构）
const toggleEnabledBusyId = ref<number | null>(null)
const toggleConfirmVisible = ref(false)
const toggleConfirmLoading = ref(false)
const togglePendingDoc = ref<KbDocument | null>(null)
const togglePendingTargetEnabled = ref(false)

const closeToggleConfirm = () => {
  if (toggleConfirmLoading.value) return
  toggleConfirmVisible.value = false
  togglePendingDoc.value = null
}

const handleToggleEnabled = (doc: KbDocument) => {
  if (toggleEnabledBusyId.value != null || filterBusy.value || toggleConfirmLoading.value) return
  togglePendingDoc.value = doc
  togglePendingTargetEnabled.value = !doc.enabled
  toggleConfirmVisible.value = true
}

const handleToggleConfirm = async () => {
  const doc = togglePendingDoc.value
  if (!doc) return

  const targetEnabled = togglePendingTargetEnabled.value
  const kid = kbId.value
  if (!Number.isFinite(kid) || kid <= 0) {
    ElMessage({ message: t('knowledgeBase.documents.invalidKnowledgeBase'), type: 'error', duration: 2800 })
    closeToggleConfirm()
    return
  }

  toggleConfirmLoading.value = true
  toggleEnabledBusyId.value = doc.id
  try {
    await updateKnowledgeBaseDocumentEnabled(kid, doc.id, targetEnabled)
    await refreshDocuments({ withLoading: false })
    ElMessage({ message: targetEnabled ? t('knowledgeBase.documents.enabled') : t('knowledgeBase.documents.disabled'), type: 'success', duration: 2200 })
    toggleConfirmVisible.value = false
    togglePendingDoc.value = null
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('knowledgeBase.documents.operationFailed')
    ElMessage({ message: msg, type: 'error', duration: 3200 })
  } finally {
    toggleConfirmLoading.value = false
    toggleEnabledBusyId.value = null
  }
}

</script>

<template>
  <div class="knowledge-page">
    <DashboardHeader />

    <main class="page-main">
      <div class="page-container">
        <section class="page-header">
          <div class="title-area">
            <div class="breadcrumbs">
              <button class="crumb-link" @click="router.push('/my/knowledge')">{{ t('knowledgeBase.documents.myKnowledgeBases') }}</button>
              <span class="crumb-sep">/</span>
              <span class="crumb-current" :title="kb.name">{{ kb.name || t('knowledgeBase.documents.currentKnowledgeBase') }}</span>
              <span class="crumb-sep">/</span>
              <span class="crumb-current">{{ t('knowledgeBase.documents.pageTitle') }}</span>
            </div>

            <h1 class="page-title">{{ t('knowledgeBase.documents.pageTitle') }}</h1>
            <p class="page-subtitle">{{ t('knowledgeBase.documents.pageSubtitle') }}</p>
          </div>

          <div class="header-actions">
            <BackButton />
            <button class="create-btn" @click="openUpload">{{ t('knowledgeBase.documents.uploadDocument') }}</button>
          </div>
        </section>

        <KnowledgeBaseOverviewCard :kb="kb" />

        <section class="stats-row" :aria-label="t('knowledgeBase.documents.statsAria')">
          <div class="stat-card">
            <div class="stat-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M7 3h10l2 2v16H7V3z" stroke="currentColor" stroke-width="1.5" />
                <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </div>
            <div class="stat-body">
              <div class="stat-value">{{ kbStats?.totalDocuments ?? kb.documentCount }}</div>
              <div class="stat-label">{{ t('knowledgeBase.documents.totalDocuments') }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap stat-icon-processing">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M21 12h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M12 22v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M3 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M12 7a5 5 0 1 0 0 10" stroke="currentColor" stroke-width="1.5" />
              </svg>
            </div>
            <div class="stat-body">
              <div class="stat-value stat-processing">{{ kbStats?.processingCount ?? 0 }}</div>
              <div class="stat-label">{{ t('knowledgeBase.documents.processing') }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap stat-icon-failed">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 9V13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="M12 17H12.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                <path
                  d="M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="stat-body">
              <div class="stat-value stat-failed">{{ kbStats?.failedCount ?? 0 }}</div>
              <div class="stat-label">{{ t('knowledgeBase.documents.failed') }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap stat-icon-enabled">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div class="stat-body">
              <div class="stat-value stat-enabled">{{ kbStats?.enabledDocumentsCount ?? 0 }}</div>
              <div class="stat-label">{{ t('knowledgeBase.documents.enabledDocuments') }}</div>
            </div>
          </div>
        </section>

        <section class="filter-bar">
          <div class="filter-content">
            <div class="search-group">
              <div class="search-input-wrapper">
                <svg class="search-icon" width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" stroke-width="1.5" />
                  <path d="M11 11L14.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <input
                  v-model="draftFilter.keyword"
                  class="search-input"
                  type="text"
                  :placeholder="t('knowledgeBase.documents.searchPlaceholder')"
                  :disabled="filterBusy"
                  @keyup.enter="handleSearch"
                />
              </div>

              <div class="select-wrapper">
                <select
                  v-model="draftFilter.overallStatus"
                  class="filter-select"
                  :disabled="filterBusy"
                  @change="handleSearch"
                >
                  <option v-for="s in overallOptions" :key="s" :value="s">
                    {{
                      s === 'all'
                        ? t('knowledgeBase.documents.all')
                        : s === 'pending'
                          ? t('knowledgeBase.documents.pending')
                          : s === 'processing'
                            ? t('knowledgeBase.documents.processing')
                            : s === 'success'
                              ? t('knowledgeBase.documents.success')
                              : t('knowledgeBase.documents.failed')
                    }}
                  </option>
                </select>
              </div>

              <div class="select-wrapper">
                <select
                  v-model="draftFilter.fileType"
                  class="filter-select"
                  :disabled="filterBusy"
                  @change="handleSearch"
                >
                  <option v-for="opt in fileTypeOptions" :key="opt.value" :value="opt.value">
                    {{ optionLabel(opt) }}
                  </option>
                </select>
              </div>

              <div class="select-wrapper">
                <select
                  v-model="draftFilter.enabled"
                  class="filter-select"
                  :disabled="filterBusy"
                  @change="handleSearch"
                >
                  <option v-for="opt in enabledOptions" :key="opt" :value="opt">
                    {{ opt === 'all' ? t('knowledgeBase.documents.allEnabledStatus') : opt === 'enabled' ? t('knowledgeBase.documents.enabled') : t('knowledgeBase.documents.disabled') }}
                  </option>
                </select>
              </div>

              <div class="select-wrapper">
                <select
                  v-model="draftFilter.sortBy"
                  class="filter-select"
                  :disabled="filterBusy"
                  @change="handleSearch"
                >
                  <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                    {{ t(opt.labelKey) }}
                  </option>
                </select>
              </div>
            </div>

            <div class="action-group">
              <button type="button" class="search-btn" :disabled="filterBusy" @click="handleSearch">
                {{ t('knowledgeBase.documents.search') }}
              </button>
              <button type="button" class="reset-btn" :disabled="filterBusy" @click="handleReset">
                {{ t('knowledgeBase.documents.reset') }}
              </button>
            </div>
          </div>
        </section>

        <section class="table-section" :aria-label="t('knowledgeBase.documents.listAria')">
          <template v-if="listLoading">
            <div class="loading-overlay loading-overlay--blocking">{{ t('knowledgeBase.documents.loading') }}</div>
          </template>
          <template v-else>
            <div class="table-panel">
              <div v-if="tableRefreshing" class="loading-overlay loading-overlay--refresh">
                <span class="loading-overlay-text">{{ t('knowledgeBase.documents.loading') }}</span>
              </div>
              <div class="table-inner">
                <div v-if="pagedDocs.length > 0" class="table-scroll">
                  <DocumentTable
                    :docs="pagedDocs"
                    :toggle-enabled-busy-id="toggleEnabledBusyId"
                    :delete-busy-doc-id="deleteBusyDocId"
                    @toggle-enabled="handleToggleEnabled"
                    @delete="openDelete"
                  />
                </div>

                <div v-else-if="!docsExist" class="empty-state">
                  <div class="empty-icon">📄</div>
                  <p class="empty-title">{{ t('knowledgeBase.documents.emptyTitle') }}</p>
                  <p class="empty-sub">{{ t('knowledgeBase.documents.emptySubtitle') }}</p>
                  <button class="create-btn" @click="openUpload">{{ t('knowledgeBase.documents.uploadDocument') }}</button>
                </div>

                <div v-else class="empty-state">
                  <div class="empty-icon">🔎</div>
                  <p class="empty-title">{{ t('knowledgeBase.documents.noMatchingTitle') }}</p>
                  <p class="empty-sub">{{ t('knowledgeBase.documents.noMatchingSubtitle') }}</p>
                  <button class="empty-reset-btn" @click="handleReset">{{ t('knowledgeBase.documents.resetFilters') }}</button>
                </div>
              </div>
            </div>
          </template>
        </section>

        <section v-if="!listLoading && totalCount > 0 && pagedDocs.length > 0" class="pagination-area">
          <div class="pagination-info">
            {{ t('knowledgeBase.documents.paginationInfo', { total: totalCount, page: currentPage }) }}
          </div>
          <div class="pagination-controls">
            <button class="page-btn" :disabled="currentPage <= 1 || filterBusy" @click="goPage(currentPage - 1)">
              {{ t('common.previousPage') }}
            </button>
            <div class="page-numbers">
              <button
                v-for="p in getPages()"
                :key="String(p)"
                class="page-num"
                :class="{ active: p === currentPage, ellipsis: p === '...' }"
                :disabled="p === '...' || filterBusy"
                @click="typeof p === 'number' && goPage(p)"
              >
                {{ p }}
              </button>
            </div>
            <button class="page-btn" :disabled="currentPage >= totalPages || filterBusy" @click="goPage(currentPage + 1)">
              {{ t('common.nextPage') }}
            </button>
          </div>
        </section>
      </div>
    </main>


    <UploadDocumentDialog
      :visible="uploadVisible"
      :knowledge-base-name="kb.name"
      :uploading="uploading"
      @cancel="closeUpload"
      @upload="handleUpload"
    />

    <DeleteDocumentDialog
      :visible="deleteVisible"
      :document-name="deleteTargetDoc?.name || ''"
      :confirm-loading="deleteLoading"
      @cancel="closeDelete"
      @confirm="handleDeleteConfirm"
    />

    <DocumentToggleEnabledDialog
      :visible="toggleConfirmVisible"
      :document-name="togglePendingDoc?.name || ''"
      :target-enabled="togglePendingTargetEnabled"
      :confirm-loading="toggleConfirmLoading"
      @cancel="closeToggleConfirm"
      @confirm="handleToggleConfirm"
    />

  </div>
</template>

<style scoped>
.knowledge-page {
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
  max-width: 1680px;
  margin: 0 auto;
  padding: 48px 24px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  padding-bottom: 32px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
}

.title-area {
  flex: 1;
  min-width: 0;
}

.breadcrumbs {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  color: #a3a3a3;
  margin-bottom: 10px;
}

.crumb-link {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: #525252;
  font-weight: 700;
}

.crumb-link:hover {
  color: #1a1a1a;
  text-decoration: underline;
}

.crumb-sep {
  color: rgba(0, 0, 0, 0.25);
  font-weight: 700;
}

.crumb-current {
  color: #737373;
  font-weight: 700;
}

.page-title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: #737373;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.create-btn,
.search-btn,
.reset-btn,
.page-btn,
.page-num {
  height: 40px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn,
.page-btn,
.page-num {
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: transparent;
  color: #525252;
  padding: 0 16px;
}

.create-btn,
.search-btn {
  border: 1px solid #2d2d2d;
  background: #2d2d2d;
  color: #fff;
  padding: 0 18px;
}

.create-btn:hover,
.search-btn:hover {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.reset-btn:hover,
.page-btn:hover:not(:disabled),
.page-num:hover:not(:disabled):not(.active) {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.filter-bar {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 20px 24px;
}

.filter-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 13px;
  color: #a3a3a3;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 14px 0 40px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
}

.search-input::placeholder {
  color: #a3a3a3;
}

.search-input:focus {
  background: #ffffff;
  border-color: #2d2d2d;
}

.select-wrapper {
  flex-shrink: 0;
}

.filter-select {
  height: 40px;
  min-width: 140px;
  padding: 0 32px 0 14px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3.5 5.25L7 8.75L10.5 5.25' stroke='%23737373' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
  outline: none;
  vertical-align: middle;
}

.filter-select:hover {
  border-color: rgba(0, 0, 0, 0.14);
  background-color: #fff;
}

.filter-select:focus {
  border-color: #2d2d2d;
  background-color: #fff;
}

.action-group {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  align-items: center;
  align-self: flex-start;
}

.filter-bar .search-btn,
.filter-bar .reset-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 108px;
}

.table-section {
  min-height: 520px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.table-panel {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 520px;
}

.loading-overlay {
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #737373;
  font-size: 14px;
}

.loading-overlay--blocking {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
  z-index: 2;
}

.loading-overlay--refresh {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.58);
  z-index: 3;
}

.loading-overlay-text {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  font-size: 13px;
  font-weight: 600;
  color: #525252;
}

.table-inner {
  flex: 1;
  position: relative;
  z-index: 0;
}

.table-scroll {
  overflow-x: hidden;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
}

@media (max-width: 1450px) {
  .table-scroll {
    overflow-x: auto;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #ffffff;
  padding: 24px;
  gap: 10px;
}

.empty-icon {
  font-size: 34px;
  line-height: 1;
  opacity: 0.6;
}

.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
}

.empty-sub {
  margin: 0;
  font-size: 14px;
  color: #737373;
  max-width: 520px;
  text-align: center;
  line-height: 1.6;
}

.empty-reset-btn {
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: transparent;
  color: #525252;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 6px;
}

.empty-reset-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
}

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-processing {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.stat-icon-failed {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.stat-icon-enabled {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 900;
  color: #1a1a1a;
  line-height: 1.2;
}

.stat-processing {
  color: #2563eb;
}

.stat-failed {
  color: #dc2626;
}

.stat-enabled {
  color: #16a34a;
}

.stat-label {
  font-size: 12px;
  color: #737373;
}

.pagination-area {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pagination-info {
  font-size: 13px;
  color: #737373;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-numbers {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.page-btn:disabled,
.page-num:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.page-num {
  min-width: 36px;
  padding: 0 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  font-size: 13px;
  color: #525252;
  font-weight: 700;
}

.page-num.active {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #fff;
}

.page-num.ellipsis {
  background: transparent;
  border: none;
  cursor: default;
  color: #a3a3a3;
}

@media (max-width: 1100px) {
  .page-container {
    padding: 32px 20px 0;
    gap: 20px;
  }
}

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .filter-content {
    flex-direction: column;
    align-items: stretch;
  }
  .search-group {
    flex-wrap: wrap;
  }
  .action-group {
    justify-content: flex-start;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
  }
  .create-btn,
  :deep(.back-button) {
    width: auto;
  }
}

@media (max-width: 768px) {
  .page-main {
    padding-top: var(--app-page-top-mobile);
    padding-bottom: var(--app-page-bottom-mobile);
  }
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .filter-bar {
    padding: 16px;
  }
  .search-input-wrapper {
    min-width: 140px;
    width: 100%;
  }
  .filter-select {
    min-width: 140px;
    width: 100%;
  }
  .select-wrapper {
    width: 100%;
  }
  .pagination-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .page-numbers {
    justify-content: center;
  }
}
</style>

