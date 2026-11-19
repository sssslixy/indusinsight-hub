<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { AnnouncementDetailHeader, AnnouncementContentCard } from './components'
import { getAnnouncementDetail } from '@/api/announcement'
import type { AnnouncementDetail } from '@/api/announcement'

const route = useRoute()
const { t } = useI18n()

function isLatestAnnouncement(publishTime: string | null | undefined): boolean {
  if (!publishTime) return false
  try {
    const pub = new Date(publishTime)
    if (isNaN(pub.getTime())) return false
    const now = new Date()
    const pubDate = new Date(pub.getFullYear(), pub.getMonth(), pub.getDate())
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffDays = (nowDate.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 3
  } catch {
    return false
  }
}

type PageState = 'loading' | 'success' | 'error' | 'notfound'

const pageState = ref<PageState>('loading')
const detail = ref<AnnouncementDetail | null>(null)
const errorMsg = ref('')
const computedIsLatest = ref(false)

async function loadDetail() {
  const id = Number(route.params.id)
  if (!id || isNaN(id)) {
    pageState.value = 'notfound'
    return
  }

  pageState.value = 'loading'
  errorMsg.value = ''

  try {
    const res = await getAnnouncementDetail(id)
    detail.value = res.data
    computedIsLatest.value = isLatestAnnouncement(detail.value?.publishTime)
    pageState.value = 'success'
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string }
    if (err?.code === 4004) {
      pageState.value = 'notfound'
    } else {
      errorMsg.value = err?.message || t('announcementsPage.detailLoadFailed')
      pageState.value = 'error'
    }
  }
}

onMounted(() => loadDetail())
watch(() => route.params.id, () => loadDetail())

const handleRetry = () => loadDetail()
</script>

<template>
  <div class="detail-page">
    <DashboardHeader />

    <main class="page-main">
      <div class="page-container">
        <AnnouncementDetailHeader />

        <div v-if="pageState === 'loading'" class="skeleton-card">
          <div class="sk sk-title"></div>
          <div class="sk sk-meta"></div>
          <div class="sk-divider"></div>
          <div class="sk sk-line"></div>
          <div class="sk sk-line sk-line-80"></div>
          <div class="sk sk-line"></div>
          <div class="sk sk-line sk-line-60"></div>
          <div class="sk sk-line"></div>
        </div>

        <div v-else-if="pageState === 'error'" class="state-card">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#ef4444" stroke-width="2"/>
            <path d="M24 15V25" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
            <circle cx="24" cy="32" r="1.5" fill="#ef4444"/>
          </svg>
          <p class="state-title">{{ t('announcementsPage.detailLoadFailed') }}</p>
          <p class="state-hint">{{ errorMsg }}</p>
          <div class="state-actions">
            <button class="btn-primary" @click="handleRetry">{{ t('common.retry') }}</button>
          </div>
        </div>

        <div v-else-if="pageState === 'notfound'" class="state-card">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect x="10" y="14" width="36" height="32" rx="3" stroke="#d4d4d4" stroke-width="2"/>
            <path d="M18 24H38M18 32H30" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p class="state-title">{{ t('announcementsPage.notFoundTitle') }}</p>
          <p class="state-hint">{{ t('announcementsPage.notFoundHint') }}</p>
        </div>

        <AnnouncementContentCard
          v-else-if="pageState === 'success' && detail"
          :title="detail.title"
          :content="detail.content"
          :publish-time="detail.publishTime"
          :is-latest="computedIsLatest"
          :is-important="detail.isImportant"
        />
      </div>
    </main>

  </div>
</template>

<style scoped>
.detail-page {
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

.skeleton-card {
  padding: 40px 48px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sk {
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 6px;
}

.sk-title  { height: 32px; width: 70%; }
.sk-meta   { height: 18px; width: 30%; }
.sk-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 4px 0; }
.sk-line   { height: 18px; width: 100%; }
.sk-line-80 { width: 80%; }
.sk-line-60 { width: 60%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.state-card {
  padding: 80px 40px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.state-title {
  font-size: 17px;
  font-weight: 600;
  color: #404040;
  margin: 0;
}

.state-hint {
  font-size: 14px;
  color: #a3a3a3;
  margin: 0;
}

.state-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn-primary {
  padding: 9px 22px;
  background: #2d2d2d;
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #1a1a1a;
  border-color: #1a1a1a;
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

  .skeleton-card {
    padding: 28px 24px;
  }

  .state-card {
    padding: 60px 24px;
  }

  .state-actions {
    flex-direction: column;
    width: 100%;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
