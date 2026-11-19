<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getRecentActivities } from '@/api/user'
import type { RecentActivity } from '@/types/api'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 数据状态
const recentActivities = ref<RecentActivity[]>([])
const loading = ref(false)
const error = ref(false)

// 格式化相对时间
const formatRelativeTime = (timeStr: string): string => {
  try {
    const time = new Date(timeStr).getTime()
    const now = Date.now()
    const diff = now - time
    
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    
    if (diff < minute) {
      return t('profile.justNow')
    } else if (diff < hour) {
      const minutes = Math.floor(diff / minute)
      return t('profile.minutesAgo', { count: minutes })
    } else if (diff < day) {
      const hours = Math.floor(diff / hour)
      return t('profile.hoursAgo', { count: hours })
    } else if (diff < 7 * day) {
      const days = Math.floor(diff / day)
      return t('profile.daysAgo', { count: days })
    } else {
      // 超过 7 天显示具体日期
      const date = new Date(time)
      return `${date.getMonth() + 1}-${date.getDate()}`
    }
  } catch (e) {
    return timeStr
  }
}

// 格式化活动标题
const formatActivityTitle = (activity: RecentActivity): string => {
  return `${activity.activityLabel}「${activity.targetName}」`
}

// 获取活动图标
const getActivityIcon = (activity: RecentActivity): string => {
  const rawType = activity.iconType || activity.activityType || 'agent'

  const icons = {
    agent: 'M4 4h16v16H4V4zm4 6a3 3 0 106 0 3 3 0 00-6 0z',
    plugin: 'M9 4v4H5v8h4v4h6v-4h4V8h-4V4H9z',
    tool: 'M9 4v4H5v8h4v4h6v-4h4V8h-4V4H9z',
    'knowledge-base': 'M6 4h12v16H6V4zm2 4h8M8 14h8M8 18h6',
    favorite: 'M12 5l2.5 5 5.5 1-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1L12 5z',
    session: 'M4 6h16v10H4V6zm3 3h10M7 12h6',
    CREATED_AGENT: 'M4 4h16v16H4V4zm4 6a3 3 0 106 0 3 3 0 00-6 0z',
    CREATED_PLUGIN: 'M9 4v4H5v8h4v4h6v-4h4V8h-4V4H9z',
    CREATED_TOOL: 'M9 4v4H5v8h4v4h6v-4h4V8h-4V4H9z',
    CREATED_KNOWLEDGE_BASE: 'M6 4h12v16H6V4zm2 4h8M8 14h8M8 18h6',
    FAVORITED_AGENT: 'M12 5l2.5 5 5.5 1-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1L12 5z',
    FAVORITED_PLUGIN: 'M12 5l2.5 5 5.5 1-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1L12 5z',
    FAVORITED_TOOL: 'M12 5l2.5 5 5.5 1-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1L12 5z',
    FAVORITED_KNOWLEDGE_BASE: 'M12 5l2.5 5 5.5 1-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1L12 5z',
    CHATTED_AGENT: 'M4 6h16v10H4V6zm3 3h10M7 12h6'
  } as const

  if (rawType in icons) {
    return icons[rawType as keyof typeof icons]
  }

  return icons.agent
}

// 获取活动颜色
const getActivityColor = (activity: RecentActivity): string => {
  const rawType = activity.iconType || activity.activityType || 'agent'

  const colors = {
    agent: '#3b82f6',
    plugin: '#8b5cf6',
    tool: '#0d9488',
    'knowledge-base': '#059669',
    favorite: '#f59e0b',
    session: '#10b981',
    CREATED_AGENT: '#3b82f6',
    CREATED_PLUGIN: '#8b5cf6',
    CREATED_TOOL: '#0d9488',
    CREATED_KNOWLEDGE_BASE: '#059669',
    FAVORITED_AGENT: '#f59e0b',
    FAVORITED_PLUGIN: '#f59e0b',
    FAVORITED_TOOL: '#f59e0b',
    FAVORITED_KNOWLEDGE_BASE: '#f59e0b',
    CHATTED_AGENT: '#10b981'
  } as const

  if (rawType in colors) {
    return colors[rawType as keyof typeof colors]
  }

  return colors.agent
}
// 加载最近活动
const loadRecentActivities = async () => {
  loading.value = true
  error.value = false
  
  try {
    const response = await getRecentActivities(6)
    const list = response.data ?? []
    recentActivities.value = list.slice(0, 6)
  } catch (err) {
    error.value = true
    console.error('获取最近活动失败:', err)
  } finally {
    loading.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  loadRecentActivities()
})
</script>

<template>
  <div class="recent-activity-section">
    <div class="section-header">
      <h3 class="section-title">{{ t('profile.recentActivity') }}</h3>
    </div>
    
    <!-- 加载中状态 -->
    <div v-if="loading" class="activity-loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ t('common.loading') }}</div>
    </div>
    
    <!-- 空状态 -->
    <div v-else-if="!error && recentActivities.length === 0" class="activity-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#d4d4d4" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <div class="empty-text">{{ t('profile.noRecentActivity') }}</div>
    </div>
    
    <!-- 活动列表 -->
    <div v-else-if="!error && recentActivities.length > 0" class="activity-list">
      <div
        v-for="activity in recentActivities"
        :key="`${activity.activityType}-${activity.targetId}-${activity.activityTime}`"
        class="activity-item"
      >
        <div 
          class="activity-icon"
          :style="{ 
            color: getActivityColor(activity),
            background: `color-mix(in srgb, ${getActivityColor(activity)} 10%, transparent)`
          }"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path :d="getActivityIcon(activity)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="activity-content">
          <div class="activity-title">{{ formatActivityTitle(activity) }}</div>
          <div class="activity-time">{{ formatRelativeTime(activity.activityTime) }}</div>
        </div>
      </div>
    </div>
    
    <!-- 错误状态（静默处理，不影响页面其他区域） -->
    <div v-else-if="error" class="activity-error">
      <div class="error-text">{{ t('profile.loadFailed') }}</div>
    </div>
  </div>
</template>

<style scoped>
.recent-activity-section {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.section-header {
  padding: 24px 24px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
}

.activity-list {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.activity-item:hover {
  background: #fafafa;
}

.activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.5;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 12px;
  color: #a3a3a3;
  line-height: 1.3;
}

/* 加载中状态 */
.activity-loading {
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: #a3a3a3;
}

/* 空状态 */
.activity-empty {
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.empty-text {
  font-size: 14px;
  color: #a3a3a3;
}

/* 错误状态 */
.activity-error {
  padding: 48px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-text {
  font-size: 14px;
  color: #ef4444;
}
</style>
