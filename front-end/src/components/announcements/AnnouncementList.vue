<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AnnouncementCard from './AnnouncementCard.vue'

interface Announcement {
  id: number
  title: string
  contentSummary: string
  publishTime: string
  status: number
  statusLabel: string
  isLatest: boolean
  isImportant: boolean
}

interface Props {
  announcements: Announcement[]
  loading?: boolean
  isEmpty?: boolean
  isSearchResult?: boolean
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="announcement-list">
    <div v-if="loading" class="loading-state">
      <div class="loading-card" v-for="i in 5" :key="i">
        <div class="loading-skeleton skeleton-title"></div>
        <div class="loading-skeleton skeleton-summary"></div>
        <div class="loading-skeleton skeleton-footer"></div>
      </div>
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="12" y="16" width="40" height="36" rx="3" stroke="#d4d4d4" stroke-width="2"/>
        <path d="M20 26H44M20 34H38M20 42H32" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-text">
        {{ isSearchResult ? t('announcementsPage.noSearchResults') : t('announcementsPage.noAnnouncements') }}
      </p>
      <p class="empty-hint" v-if="isSearchResult">
        {{ t('announcementsPage.adjustSearchOrReset') }}
      </p>
    </div>

    <div v-else class="list-content">
      <AnnouncementCard
        v-for="announcement in announcements"
        :key="announcement.id"
        :announcement="announcement"
      />
    </div>
  </div>
</template>

<style scoped>
.announcement-list {
  min-height: 400px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading-card {
  padding: 28px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 6px;
}

.skeleton-title {
  height: 24px;
  width: 60%;
}

.skeleton-summary {
  height: 48px;
  width: 100%;
}

.skeleton-footer {
  height: 20px;
  width: 30%;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  color: #525252;
  margin: 0;
}

.empty-hint {
  font-size: 14px;
  color: #a3a3a3;
  margin: 0;
}

.list-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 768px) {
  .loading-card {
    padding: 20px;
  }

  .empty-state {
    padding: 60px 20px;
  }
}
</style>
