<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import {
  AnnouncementPageHeader,
  AnnouncementFilterBar,
  AnnouncementList,
  AnnouncementPagination,
} from './components'
import { getAnnouncementList } from '@/api/announcement'
import type { AnnouncementItem } from '@/api/announcement'

const { t } = useI18n()
const LATEST_DAYS = 3

function isLatestAnnouncement(publishTime: string | null | undefined): boolean {
  if (!publishTime) return false
  try {
    const pub = new Date(publishTime)
    if (isNaN(pub.getTime())) return false
    const now = new Date()
    const pubDate = new Date(pub.getFullYear(), pub.getMonth(), pub.getDate())
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffDays = (nowDate.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= LATEST_DAYS
  } catch {
    return false
  }
}

type NormalizedItem = AnnouncementItem & { computedIsLatest: boolean }

function normalizeAnnouncements(list: AnnouncementItem[]): NormalizedItem[] {
  return list.map((item) => ({
    ...item,
    computedIsLatest: isLatestAnnouncement(item.publishTime),
  }))
}

const loading = ref(false)
const error = ref<string | null>(null)

const announcements = ref<NormalizedItem[]>([])
const total = ref(0)
const totalPages = ref(0)

const currentPage = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const selectedTag = ref('all')

async function fetchList() {
  loading.value = true
  error.value = null
  try {
    const res = await getAnnouncementList({
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      tag: selectedTag.value,
    })
    const data = res.data
    announcements.value = normalizeAnnouncements(data.list || [])
    total.value = data.total || 0
    totalPages.value = data.totalPages || 0
  } catch (e: any) {
    error.value = e?.message || t('announcementsPage.loadFailed')
    announcements.value = []
    total.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch(keyword: string, tag: string) {
  searchKeyword.value = keyword
  selectedTag.value = tag
  currentPage.value = 1
  fetchList()
}

function handleReset() {
  searchKeyword.value = ''
  selectedTag.value = 'all'
  currentPage.value = 1
  fetchList()
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchList()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  fetchList()
})
</script>

<template>
  <div class="announcements-page">
    <DashboardHeader />

    <main class="page-main">
      <div class="page-container">
        <AnnouncementPageHeader />

        <AnnouncementFilterBar
          @search="handleSearch"
          @reset="handleReset"
        />

        <div v-if="error && !loading" class="error-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 5V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
          </svg>
          {{ error }}
          <button class="retry-btn" @click="fetchList">{{ t('common.retry') }}</button>
        </div>

        <AnnouncementList
          :announcements="announcements"
          :loading="loading"
          :is-empty="!loading && !error && announcements.length === 0"
          :is-search-result="searchKeyword.trim() !== '' || selectedTag !== 'all'"
        />

        <AnnouncementPagination
          v-if="!loading && !error && total > 0"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-count="total"
          :page-size="pageSize"
          @page-change="handlePageChange"
        />
      </div>
    </main>

  </div>
</template>

<style scoped>
.announcements-page {
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
  max-width: 1080px;
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
  padding: 14px 20px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  font-size: 14px;
  color: #dc2626;
}

.retry-btn {
  margin-left: auto;
  padding: 4px 14px;
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
  .page-main {
    padding-top: var(--app-page-top-mobile);
    padding-bottom: var(--app-page-bottom-mobile);
  }

  .page-container {
    padding: 32px 24px 0;
    gap: 24px;
  }
}
</style>
