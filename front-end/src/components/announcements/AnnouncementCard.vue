<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

interface Announcement {
  id: number
  title: string
  contentSummary: string
  publishTime: string
  status: number
  statusLabel: string
  isLatest: boolean
  isImportant: boolean
  computedIsLatest?: boolean
}

interface Props {
  announcement: Announcement
}

const props = defineProps<Props>()
const router = useRouter()
const { t } = useI18n()

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const showLatestBadge = () => {
  if (props.announcement.computedIsLatest !== undefined) {
    return props.announcement.computedIsLatest
  }
  return props.announcement.isLatest
}

const handleViewDetail = () => {
  router.push(`/announcements/${props.announcement.id}`)
}
</script>

<template>
  <div class="announcement-card" @click="handleViewDetail">
    <div class="card-header">
      <h3 class="card-title">{{ announcement.title }}</h3>

      <div class="badge-group">
        <span v-if="announcement.isImportant" class="status-badge status-important">{{ t('dashboard.important') }}</span>
        <span v-if="showLatestBadge()" class="status-badge status-new">{{ t('common.latest') }}</span>
      </div>
    </div>

    <p class="card-summary">{{ announcement.contentSummary }}</p>

    <div class="card-footer">
      <span class="publish-time">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
          <path d="M7 4V7L9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        {{ formatDate(announcement.publishTime) }}
      </span>

      <button class="detail-btn">
        {{ t('common.viewDetails') }}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.announcement-card {
  padding: 28px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.announcement-card:hover {
  border-color: rgba(0, 0, 0, 0.16);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.4;
  flex: 1;
  transition: color 0.2s ease;
}

.announcement-card:hover .card-title {
  color: #2d2d2d;
}

.badge-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-badge {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.status-badge.status-new {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.status-badge.status-important {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.card-summary {
  font-size: 15px;
  color: #737373;
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.publish-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #a3a3a3;
}

.publish-time svg {
  flex-shrink: 0;
}

.detail-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-btn:hover {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

@media (max-width: 768px) {
  .announcement-card {
    padding: 20px;
    gap: 12px;
  }

  .card-title {
    font-size: 16px;
  }

  .card-summary {
    font-size: 14px;
  }

  .card-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .detail-btn {
    align-self: flex-end;
  }
}
</style>
