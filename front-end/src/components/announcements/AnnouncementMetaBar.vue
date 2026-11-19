<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  publishTime: string
  isLatest: boolean
  isImportant: boolean
}

defineProps<Props>()

const { t } = useI18n()

const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="meta-bar">
    <span class="publish-time">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.3"/>
        <path d="M7.5 4.5V7.5L9.5 9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      {{ formatDate(publishTime) }}
    </span>

    <div class="badge-group">
      <span v-if="isImportant" class="badge badge-important">{{ t('dashboard.important') }}</span>
      <span v-if="isLatest" class="badge badge-latest">{{ t('common.latest') }}</span>
    </div>
  </div>
</template>

<style scoped>
.meta-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.publish-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #737373;
}

.badge-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge-latest {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.badge-important {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}
</style>
