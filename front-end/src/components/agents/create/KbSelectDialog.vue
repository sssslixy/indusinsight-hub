<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import KnowledgeBasePickerCard from '@/components/knowledge-base/KnowledgeBasePickerCard.vue'
import { getMyKnowledgeBaseList, getKnowledgeBaseCommunityList } from '@/api/knowledgeBase'
import type {
  MyKnowledgeBaseItem,
  MyKnowledgeBaseSortBy,
  KnowledgeBaseCommunitySortBy,
  MyKnowledgeBaseStatus,
} from '@/api/knowledgeBase'
import { getFavoriteKnowledgeBases } from '@/api/myContent'
import type { FavoriteKnowledgeBaseItem } from '@/api/myContent'

type KbPickerSortKey = 'documentCountDesc' | 'recentPublish' | 'favoriteMost'

function resolveFavoriteKbSort(k: KbPickerSortKey): 'latest' | 'favorite' | 'favorited' {
  if (k === 'favoriteMost') return 'favorite'
  if (k === 'documentCountDesc') return 'favorite'
  return 'latest'
}

function favoriteKbToMyItem(raw: FavoriteKnowledgeBaseItem): MyKnowledgeBaseItem {
  const st = String(raw.status ?? 'active').toLowerCase()
  const statuses: MyKnowledgeBaseStatus[] = ['draft', 'active', 'reindexing', 'disabled', 'failed']
  const status = (statuses.includes(st as MyKnowledgeBaseStatus) ? st : 'active') as MyKnowledgeBaseStatus
  const v = String(raw.visibility ?? 'public').toLowerCase()
  const vis = v === 'private' || v === 'team' || v === 'public' ? v : 'public'
  const at = raw.favoritedAt || ''
  return {
    id: raw.id,
    kbCode: '',
    name: raw.kbName,
    description: raw.kbDescription || '',
    iconUrl: raw.kbIcon || null,
    status,
    visibility: vis as MyKnowledgeBaseItem['visibility'],
    documentCount: raw.documentCount ?? 0,
    chunkCount: raw.chunkCount ?? 0,
    totalFileSize: raw.totalFileSize ?? 0,
    createdAt: at,
    updatedAt: raw.updatedAt || at,
    ownerUserId: raw.ownerUserId,
    ownerName: raw.ownerName ?? null,
    favoriteCount: raw.favoriteCount,
    viewCount: raw.viewCount,
  }
}

function resolveMineSort(k: KbPickerSortKey): MyKnowledgeBaseSortBy {
  if (k === 'documentCountDesc') return 'documentCountDesc'
  if (k === 'favoriteMost') return 'favoriteDesc'
  return 'createdAtDesc'
}

function resolveCommunitySort(k: KbPickerSortKey): KnowledgeBaseCommunitySortBy {
  if (k === 'documentCountDesc') return 'documentCountDesc'
  if (k === 'favoriteMost') return 'favorite'
  return 'latest'
}

const props = defineProps<{
  visible: boolean
  agentName: string
  selectedIds: string[]
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  confirm: [ids: string[], meta: Record<string, { name: string; icon?: string }>]
}>()

const { t } = useI18n()

/** 输入框当前值，仅用于展示，不参与请求 */
const keywordDraft = ref('')
/** 已提交的搜索关键词，只有点击搜索或回车时才更新，列表请求用此值 */
const submittedKeyword = ref('')
const sourceFilter = ref<'mine' | 'community' | 'favorite'>('mine')
const sortOrder = ref<KbPickerSortKey>('recentPublish')
const localSelected = ref<string[]>([])

const pageSize = 8
const currentPage = ref(1)
const totalCount = ref(0)
const totalPages = ref(0)
const kbList = ref<MyKnowledgeBaseItem[]>([])
/** 跨页缓存已选知识库的 name/icon，确认时写回智能体配置 */
const kbMetaCache = ref<Record<string, { name: string; icon?: string }>>({})

const loading = ref(false)
const error = ref<string | null>(null)

const listRef = ref<HTMLDivElement | null>(null)

const syncSelected = () => {
  localSelected.value = [...props.selectedIds]
}

watch(
  () => props.selectedIds,
  () => {
    syncSelected()
  },
  { immediate: true },
)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      keywordDraft.value = ''
      submittedKeyword.value = ''
      syncSelected()
      currentPage.value = 1
      fetchKbList()
    }
  },
)

const startItem = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1,
)
const endItem = computed(() =>
  totalCount.value === 0 ? 0 : Math.min(currentPage.value * pageSize, totalCount.value),
)

const pageList = computed<(number | string)[]>(() => {
  const t = totalPages.value
  const c = currentPage.value
  if (t <= 1) return []
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  if (c <= 4) return [1, 2, 3, 4, 5, '...', t]
  if (c >= t - 3) return [1, '...', t - 4, t - 3, t - 2, t - 1, t]
  return [1, '...', c - 1, c, c + 1, '...', t]
})

const fetchKbList = async () => {
  loading.value = true
  error.value = null

  try {
    let data:
      | {
          list?: unknown[]
          total?: number
          totalPages?: number
        }
      | undefined

    if (sourceFilter.value === 'community') {
      const res = await getKnowledgeBaseCommunityList({
        includeMine: false,
        pageNum: currentPage.value,
        pageSize,
        keyword: submittedKeyword.value || undefined,
        sortBy: resolveCommunitySort(sortOrder.value),
      })
      data = res.data
      kbList.value = (data?.list || []) as MyKnowledgeBaseItem[]
    } else if (sourceFilter.value === 'favorite') {
      const res = await getFavoriteKnowledgeBases({
        pageNum: currentPage.value,
        pageSize,
        keyword: submittedKeyword.value?.trim() || undefined,
        sortBy: resolveFavoriteKbSort(sortOrder.value),
      })
      data = res.data
      kbList.value = ((data?.list ?? []) as FavoriteKnowledgeBaseItem[]).map((row) =>
        favoriteKbToMyItem(row),
      )
    } else {
      const res = await getMyKnowledgeBaseList({
        pageNum: currentPage.value,
        pageSize,
        keyword: submittedKeyword.value || undefined,
        status: 'active' as const,
        sortBy: resolveMineSort(sortOrder.value),
      })
      data = res.data
      kbList.value = (data?.list || []) as MyKnowledgeBaseItem[]
    }

    for (const p of kbList.value) {
      const id = String(p.id)
      kbMetaCache.value[id] = {
        name: p.name,
        icon: p.iconUrl || undefined,
      }
    }
    totalCount.value = data?.total ?? 0
    totalPages.value = data?.totalPages ?? 0

    // 确保当前页不超过总页数
    if (totalPages.value > 0 && currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }

    scrollListToTop()
  } catch (e: any) {
    error.value = e?.message || t('agentCreate.picker.knowledgeBaseListLoadFailedRetry')
    kbList.value = []
    totalCount.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

const scrollListToTop = () => {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = 0
    }
  })
}

/** 点击搜索或回车：提交当前输入为搜索关键词并请求列表 */
const handleSearch = () => {
  submittedKeyword.value = keywordDraft.value.trim()
  currentPage.value = 1
  fetchKbList()
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  fetchKbList()
}

// 来源、排序、推荐类变化时重置页码并请求（使用已提交的 submittedKeyword，不响应未提交的 keywordDraft）
watch([sourceFilter, sortOrder], () => {
  currentPage.value = 1
  fetchKbList()
})

const isSelected = (id: string | number) => localSelected.value.includes(String(id))

const toggleKb = (id: string | number) => {
  const key = String(id)
  if (isSelected(key)) {
    localSelected.value = localSelected.value.filter((i) => i !== key)
  } else {
    localSelected.value = [...localSelected.value, key]
  }
}

const close = () => {
  emit('update:visible', false)
}

const handleCancel = () => {
  close()
}

const handleConfirm = () => {
  const ids = [...localSelected.value]
  const meta: Record<string, { name: string; icon?: string }> = {}
  for (const id of ids) {
    const m = kbMetaCache.value[String(id)]
    if (m) meta[String(id)] = m
  }
  emit('confirm', ids, meta)
}

// 不响应 Esc 关闭：仅允许通过“取消”“确认添加”“右上角关闭”来关闭弹窗，避免误触 Esc 关闭
const handleKeydown = (_e: KeyboardEvent) => {
  // 已禁用 Esc 关闭，保留函数便于后续若需恢复可直接扩展
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (props.visible) {
    fetchKbList()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <transition name="plugin-select-fade">
      <!-- 不绑定 @click.self：仅允许取消/确认/关闭按钮关闭，点击遮罩不关闭 -->
      <div v-if="visible" class="plugin-select-overlay">
        <div class="plugin-select-dialog" role="dialog" aria-modal="true">
          <header class="dialog-header">
            <div class="title-block">
              <h2 class="dialog-title">{{ t('agentCreate.picker.selectKnowledgeBase') }}</h2>
              <p class="dialog-subtitle">
                {{ t('agentCreate.picker.selectKnowledgeBaseSubtitle', { agentName }) }}
              </p>
            </div>
            <button class="close-btn" type="button" :aria-label="t('agentCreate.picker.close')" @click="close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 2L10 10M10 2L2 10"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </header>

          <div class="dialog-body">
            <div class="summary-row">
              <div class="summary-item">
                <span class="summary-label">{{ t('agentCreate.picker.currentAgent') }}</span>
                <span class="summary-value">{{ agentName }}</span>
              </div>
              <div class="summary-separator" />
              <div class="summary-item">
                <span class="summary-label">{{ t('agentCreate.picker.selectedKnowledgeBases') }}</span>
                <span class="summary-value">{{ t('agentCreate.picker.selectedCountWithUnit', { count: localSelected.length }) }}</span>
              </div>
            </div>

            <div class="filter-row">
              <div class="search-row">
                <div class="search-box">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M6.5 2.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm3.5 6.5L11.5 11"
                      stroke="currentColor"
                      stroke-width="1.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <input
                    v-model="keywordDraft"
                    class="search-input"
                    type="text"
                    :placeholder="t('agentCreate.picker.searchKnowledgeBasePlaceholder')"
                    @keydown.enter.prevent="handleSearch"
                  />
                </div>
                <!-- 复用主按钮样式（与“确认添加”一致），高度与搜索框对齐 -->
                <button type="button" class="btn btn-primary btn-search" @click="handleSearch">
                  {{ t('agentCreate.picker.search') }}
                </button>
              </div>

              <div class="filter-selects">
                <div class="select-wrapper">
                  <select v-model="sourceFilter" class="dialog-filter-select">
                    <option value="mine">{{ t('agentCreate.picker.mineAvailable') }}</option>
                    <option value="community">{{ t('agentCreate.picker.communityOthers') }}</option>
                    <option value="favorite">{{ t('agentCreate.picker.myFavorites') }}</option>
                  </select>
                </div>
                <div class="select-wrapper">
                  <select v-model="sortOrder" class="dialog-filter-select">
                    <option value="documentCountDesc">{{ t('agentCreate.picker.documentCount') }}</option>
                    <option value="recentPublish">{{ t('agentCreate.picker.recentlyPublished') }}</option>
                    <option value="favoriteMost">{{ t('agentCreate.picker.mostFavorited') }}</option>
                  </select>
                </div>
              </div>

            </div>

            <div ref="listRef" class="plugin-list-wrapper">
              <div v-if="loading" class="empty-state">
                <div class="empty-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="12" stroke="#d1d5db" stroke-width="1.4" />
                    <path
                      d="M16 8v4M16 16v0"
                      stroke="#d1d5db"
                      stroke-width="1.4"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>
                <div class="empty-text-main">{{ t('agentCreate.picker.loadingKnowledgeBases') }}</div>
                <div class="empty-text-sub">{{ t('agentCreate.picker.pleaseWait') }}</div>
              </div>

              <div v-else-if="error" class="empty-state">
                <div class="empty-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect
                      x="6"
                      y="6"
                      width="20"
                      height="16"
                      rx="3"
                      stroke="#f97316"
                      stroke-width="1.4"
                    />
                    <path
                      d="M16 11v5"
                      stroke="#f97316"
                      stroke-width="1.4"
                      stroke-linecap="round"
                    />
                    <circle cx="16" cy="18" r="0.9" fill="#f97316" />
                  </svg>
                </div>
                <div class="empty-text-main">{{ t('agentCreate.picker.knowledgeBaseListLoadFailed') }}</div>
                <div class="empty-text-sub">{{ error }}</div>
                <button class="btn btn-ghost btn-retry" type="button" @click="fetchKbList">
                  {{ t('agentCreate.picker.retry') }}
                </button>
              </div>

              <div v-else-if="totalCount > 0" class="plugin-list">
                <KnowledgeBasePickerCard
                  v-for="item in kbList"
                  :key="item.id"
                  :item="item"
                  :selected="isSelected(item.id)"
                  @toggle="toggleKb(item.id)"
                />
              </div>

              <div v-else class="empty-state">
                <div class="empty-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect
                      x="6"
                      y="6"
                      width="20"
                      height="16"
                      rx="3"
                      stroke="#d1d5db"
                      stroke-width="1.4"
                    />
                    <path
                      d="M10 13h12M10 17h8"
                      stroke="#d1d5db"
                      stroke-width="1.4"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>
                <div class="empty-text-main">{{ t('agentCreate.picker.noMatchingKnowledgeBases') }}</div>
                <div class="empty-text-sub">{{ t('agentCreate.picker.tryRelaxSearch') }}</div>
              </div>
            </div>

            <div v-if="totalPages > 1" class="dialog-pagination">
              <span class="page-info">
                {{ t('agentCreate.picker.pageInfo', { start: startItem, end: endItem, total: totalCount }) }}
              </span>
              <div class="page-controls">
                <button
                  class="page-btn"
                  :disabled="currentPage === 1"
                  @click="handlePageChange(currentPage - 1)"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M9.5 12L5.5 7.5L9.5 3"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  {{ t('agentCreate.picker.previousPage') }}
                </button>

                <button
                  v-for="(p, i) in pageList"
                  :key="i"
                  class="page-num"
                  :class="{ active: p === currentPage, ellipsis: p === '...' }"
                  :disabled="p === '...'"
                  @click="typeof p === 'number' && handlePageChange(p)"
                >
                  {{ p }}
                </button>

                <button
                  class="page-btn"
                  :disabled="currentPage === totalPages"
                  @click="handlePageChange(currentPage + 1)"
                >
                  {{ t('agentCreate.picker.nextPage') }}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M5.5 3L9.5 7.5L5.5 12"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <footer class="dialog-footer">
            <div class="footer-left">
              <span class="footer-tip">
                {{ t('agentCreate.picker.selectedFooter', { count: localSelected.length, resource: t('agentCreate.picker.knowledgeBaseResource') }) }}
              </span>
            </div>
            <div class="footer-actions">
              <button class="btn btn-ghost" type="button" @click="handleCancel">
                {{ t('agentCreate.picker.cancel') }}
              </button>
              <button class="btn btn-primary" type="button" @click="handleConfirm">
                {{ t('agentCreate.picker.confirmAdd') }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.plugin-select-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
}

/* 固定宽高，保证至少完整显示两行插件卡片；列表少时也不缩小 */
.plugin-select-dialog {
  width: min(980px, 100% - 80px);
  height: min(820px, 88vh);
  max-height: min(820px, 88vh);
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(15, 23, 42, 0.02);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dialog-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

.dialog-subtitle {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.agent-name {
  font-weight: 500;
  color: #111827;
}

.category-label {
  font-weight: 500;
  color: #1d4ed8;
}

.close-btn {
  margin-left: 12px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.16s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: #111827;
  color: #ffffff;
  border-color: #111827;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  padding: 14px 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.summary-row {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  font-size: 11px;
  color: #9ca3af;
}

.summary-value {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.summary-separator {
  width: 1px;
  height: 26px;
  background: rgba(0, 0, 0, 0.06);
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.search-row {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 搜索框与搜索按钮统一 40px 高度、border-box，保证同一基线 */
.search-box {
  flex: 1;
  min-width: 0;
  height: 40px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fafafa;
  color: #6b7280;
}


.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #111827;
  width: 100%;
  font-family: inherit;
}

.search-input::placeholder {
  color: #9ca3af;
}

.filter-selects {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.select-wrapper {
  flex-shrink: 0;
}

/* 与插件区 PluginFilterBar 下拉框风格一致：灰白、细边框、圆角、小字 */
.dialog-filter-select {
  height: 40px;
  min-width: 120px;
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
  transition: border-color 0.2s ease, background-color 0.2s ease;
  outline: none;
  font-family: inherit;
}

.dialog-filter-select:hover {
  border-color: rgba(0, 0, 0, 0.14);
  background-color: #fff;
}

.dialog-filter-select:focus {
  border-color: #2d2d2d;
  background-color: #fff;
}

.checkbox-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #4b5563;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.checkbox-filter input {
  display: none;
}

.checkbox-shape {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: #ffffff;
  position: relative;
  transition: all 0.15s ease;
}

.checkbox-filter input:checked + .checkbox-shape {
  border-color: #1e40af;
  background: #1e40af;
}

.checkbox-filter input:checked + .checkbox-shape::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 2px;
  border-bottom: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  transform: rotate(-45deg);
}

.checkbox-label {
  white-space: nowrap;
}

/* 列表区域固定占满剩余高度并内部滚动，不随条数变化影响弹窗高度 */
.plugin-list-wrapper {
  flex: 1;
  min-height: 0;
  margin-top: 4px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-right: 4px;
}

.plugin-list-wrapper::-webkit-scrollbar {
  width: 6px;
}

.plugin-list-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.plugin-list-wrapper::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 3px;
}

.plugin-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 2px 0;
}

.dialog-pagination {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 2px 4px;
  gap: 12px;
}

.page-info {
  font-size: 12px;
  color: #737373;
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-num {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-num:hover:not(:disabled):not(.active) {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
}

.page-num.active {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

.page-num.ellipsis {
  border: none;
  background: transparent;
  cursor: default;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #9ca3af;
}

.empty-icon {
  margin-bottom: 4px;
}

.empty-text-main {
  font-size: 14px;
  color: #6b7280;
}

.empty-text-sub {
  font-size: 12px;
  color: #9ca3af;
}

.dialog-footer {
  flex-shrink: 0;
  padding: 12px 22px 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #f9fafb;
}

.footer-left {
  font-size: 12px;
  color: #6b7280;
}

.count {
  font-weight: 600;
  color: #111827;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 7px;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.16s ease;
}

.btn-ghost {
  background: transparent;
  border-color: rgba(0, 0, 0, 0.14);
  color: #4b5563;
}

.btn-ghost:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #374151;
  color: #111827;
}

.btn-primary {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
}

.btn-primary:hover {
  background: #020617;
  border-color: #020617;
}

/* 搜索按钮略低于输入框（覆盖 .btn 的 32px），复用主按钮风格 */
.btn-search {
  height: 36px;
  box-sizing: border-box;
  padding: 0 14px;
  flex-shrink: 0;
  border-radius: 7px;
}

.plugin-select-fade-enter-active,
.plugin-select-fade-leave-active {
  transition: opacity 0.18s ease;
}

.plugin-select-fade-enter-from,
.plugin-select-fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .plugin-select-dialog {
    width: min(100% - 32px, 720px);
    height: min(760px, 88vh);
    max-height: min(760px, 88vh);
  }

  .plugin-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .plugin-select-dialog {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .summary-row {
    flex-wrap: wrap;
  }
}
</style>

