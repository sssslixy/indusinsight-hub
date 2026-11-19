<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getLatestAnnouncements, type AnnouncementItem } from '@/api/announcement'

const router = useRouter()
const { t } = useI18n()

const announcements = ref<AnnouncementItem[]>([])
const loading = ref(false)
const error = ref(false)

const fetchAnnouncements = async () => {
  loading.value = true
  error.value = false

  try {
    const response = await getLatestAnnouncements(5)
    announcements.value = response.data || []
  } catch (err) {
    console.error('Failed to fetch announcements:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isLatestAnnouncement = (item: AnnouncementItem) => {
  if (item.isLatest) return true
  if (!item.publishTime) return false

  try {
    const publishDate = new Date(item.publishTime)
    const now = new Date()
    const diffTime = now.getTime() - publishDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    return diffDays <= 3
  } catch (error) {
    console.error('Failed to parse announcement date:', error)
    return false
  }
}

const handleViewMore = () => {
  router.push('/announcements')
}

const handleViewDetail = (id: number) => {
  router.push(`/announcements/${id}`)
}

onMounted(() => {
  fetchAnnouncements()
})
</script>

<template>
  <div class="announcement-section">
    <div class="section-header">
      <h2 class="section-title">{{ t('dashboard.latestAnnouncements') }}</h2>
      <button class="view-more-btn" @click="handleViewMore">
        {{ t('common.viewMore') }}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-item" v-for="i in 3" :key="i">
        <div class="loading-skeleton"></div>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="#d4d4d4" stroke-width="2"/>
        <path d="M24 16V26M24 30V32" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="error-text">{{ t('dashboard.announcementsLoadFailed') }}</p>
      <button class="retry-btn" @click="fetchAnnouncements">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="announcements.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="12" width="32" height="28" rx="2" stroke="#d4d4d4" stroke-width="2"/>
        <path d="M14 20H34M14 26H28M14 32H24" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-text">{{ t('dashboard.noAnnouncements') }}</p>
    </div>

    <div v-else class="announcement-list">
      <div
        v-for="item in announcements"
        :key="item.id"
        class="announcement-item"
        @click="handleViewDetail(item.id)"
      >
        <span v-if="isLatestAnnouncement(item)" class="status-badge status-new">
          {{ t('dashboard.newest') }}
        </span>
        <span v-else-if="item.isImportant" class="status-badge status-important">
          {{ t('dashboard.important') }}
        </span>

        <div class="item-header">
          <h3 class="item-title">{{ item.title }}</h3>
        </div>
        <p class="item-summary">{{ item.contentSummary }}</p>
        <div class="item-footer">
          <span class="publish-time">{{ formatDate(item.publishTime) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.announcement-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.01em;
}

.view-more-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-more-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading-item {
  padding: 20px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
}

.loading-skeleton {
  height: 80px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 6px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 16px;
}

.error-text {
  font-size: 14px;
  color: #737373;
  margin: 0;
}

.retry-btn {
  padding: 8px 20px;
  background: #2d2d2d;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #3a3a3a;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 16px;
}

.empty-text {
  font-size: 14px;
  color: #737373;
  margin: 0;
}

.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.announcement-item {
  position: relative;
  padding: 20px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.announcement-item:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.item-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
  line-height: 1.4;
  padding-right: 70px;
}

.status-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.status-new {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.status-badge.status-important {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-badge.status-normal {
  background: rgba(163, 163, 163, 0.1);
  color: #737373;
}

.item-summary {
  font-size: 14px;
  color: #737373;
  margin: 0 0 12px;
  line-height: 1.5;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.publish-time {
  font-size: 13px;
  color: #a3a3a3;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 20px;
  }

  .announcement-item {
    padding: 16px;
  }

  .status-badge {
    top: 12px;
    right: 12px;
  }
}
</style>
