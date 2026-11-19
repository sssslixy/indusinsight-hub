<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { AgentCommunityHeader, AgentFilterBar, AgentCardList, AgentPagination } from './components'
import { getAgentCommunityList } from '@/api/agent'
import type { AgentCommunityItem } from '@/api/agent'
import type { AgentItem } from './components'

const { t } = useI18n()

const loading = ref(false)
const error = ref<string | null>(null)

const agents = ref<AgentItem[]>([])
const totalCount = ref(0)
const totalPages = ref(0)

const currentPage = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const selectedSort = ref('latest')
const selectedTag = ref('all')

function toAgentItem(item: AgentCommunityItem): AgentItem {
  return {
    id: item.id,
    agentName: item.agentName,
    agentDescription: item.agentDescription,
    agentIcon: item.agentIcon || '',
    authorId: item.authorId,
    authorName: item.authorName || '',
    favoriteCount: item.favoriteCount || 0,
    useCount: item.useCount || 0,
    viewCount: item.viewCount || 0,
    likeCount: item.likeCount || 0,
    publishTime: item.publishTime || '',
    isHot: item.isHot || false,
    isLatest: item.isLatest || false,
    sourceType: item.sourceType ?? item.source_type,
  }
}

async function fetchList() {
  loading.value = true
  error.value = null
  try {
    const res = await getAgentCommunityList({
      includeMine: true,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      tag: selectedTag.value,
      sortBy: selectedSort.value,
    })
    const data = res.data
    agents.value = (data.list || []).map(toAgentItem)
    totalCount.value = data.total || 0
    totalPages.value = data.totalPages || 0
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message || t('community.agentsLoadFailed')
    agents.value = []
    totalCount.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

const isEmpty = computed(
  () => !loading.value && !error.value && agents.value.length === 0,
)
const isSearchResult = computed(
  () => searchKeyword.value.trim() !== '' || selectedTag.value !== 'all',
)

function handleSearch(keyword: string, sort: string, tag: string) {
  searchKeyword.value = keyword
  selectedSort.value = sort
  selectedTag.value = tag
  currentPage.value = 1
  fetchList()
}

function handleReset() {
  searchKeyword.value = ''
  selectedSort.value = 'latest'
  selectedTag.value = 'all'
  currentPage.value = 1
  fetchList()
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchList()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => fetchList())
</script>

<template>
  <div class="community-agents-page">
    <DashboardHeader />

    <main class="page-main">
      <div class="page-container">
        <AgentCommunityHeader />

        <AgentFilterBar @search="handleSearch" @reset="handleReset" />

        <div v-if="error && !loading" class="error-banner">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.4"/>
            <path d="M7.5 5V8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <circle cx="7.5" cy="10.5" r="0.75" fill="currentColor"/>
          </svg>
          {{ error }}
          <button class="retry-btn" @click="handleReset">{{ t('common.retry') }}</button>
        </div>

        <AgentCardList
          :agents="agents"
          :loading="loading"
          :is-empty="isEmpty"
          :is-search-result="isSearchResult"
        />

        <AgentPagination
          v-if="!error && totalCount > 0"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-count="totalCount"
          :page-size="pageSize"
          @page-change="handlePageChange"
        />
      </div>
    </main>

  </div>
</template>

<style scoped>
.community-agents-page {
  min-height: 100vh;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  padding-top: 90px;
  padding-bottom: 64px;
}

.page-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 48px 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  font-size: 14px;
  color: #dc2626;
}

.retry-btn {
  margin-left: auto;
  padding: 4px 13px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 6px;
  font-size: 13px;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: #dc2626;
}

@media (max-width: 768px) {
  .page-main { padding-top: 76px; padding-bottom: 48px; }
  .page-container { padding: 32px 20px 0; gap: 24px; }
}
</style>
