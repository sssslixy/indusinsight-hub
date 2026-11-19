<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMyDashboardStats } from '@/api/dashboard'
import type { MyDashboardStats } from '@/api/dashboard'
import { useI18n } from 'vue-i18n'

interface StatItem {
  id: string
  labelKey: string
  value: number | string
  icon: string
  color: string
}

const { t } = useI18n()

// 统计数据（与首页 StatsOverview 一致）
const stats = ref<StatItem[]>([
  {
    id: 'my-agents',
    labelKey: 'profile.myAgents',
    value: '--',
    icon: 'agent',
    color: '#3b82f6'
  },
  {
    id: 'my-skills',
    labelKey: 'profile.mySkills',
    value: '--',
    icon: 'plugin',
    color: '#8b5cf6'
  },
  {
    id: 'favorite-agents',
    labelKey: 'profile.favoriteAgents',
    value: '--',
    icon: 'favorite',
    color: '#f59e0b'
  },
  {
    id: 'favorite-skills',
    labelKey: 'profile.favoriteSkills',
    value: '--',
    icon: 'favorite',
    color: '#10b981'
  },
  {
    id: 'my-knowledge-base',
    labelKey: 'profile.myKnowledgeBase',
    value: '--',
    icon: 'kb',
    color: '#0ea5e9'
  },
  {
    id: 'favorite-knowledge-base',
    labelKey: 'profile.favoriteKnowledgeBase',
    value: '--',
    icon: 'kb',
    color: '#6366f1'
  },
])

const loading = ref(false)

function applyStats(data: MyDashboardStats) {
  const map: Record<string, number> = {
    'my-agents': data.myAgentCount,
    'my-skills': data.myPluginCount,
    'favorite-agents': data.favoriteAgentCount,
    'favorite-skills': data.favoritePluginCount,
    'my-knowledge-base': data.myKnowledgeBaseCount,
    'favorite-knowledge-base': data.favoriteKnowledgeBaseCount
  }
  stats.value.forEach((s) => {
    const v = map[s.id]
    if (v !== undefined) s.value = v
  })
}

// 格式化数字
const formatNumber = (num: number | string) => {
  if (typeof num === 'string') {
    return num
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 加载我的数据概览
const loadMyStats = async () => {
  loading.value = true
  
  try {
    const response = await getMyDashboardStats()
    if (response.code === 0 && response.data) {
      applyStats(response.data)
    }
  } catch (error) {
    console.error('获取我的数据概览失败:', error)
    // 失败时保持 '--' 显示
  } finally {
    loading.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  loadMyStats()
})
</script>

<template>
  <div class="profile-stats-section">
    <div class="section-header">
      <h3 class="section-title">{{ t('profile.statsTitle') }}</h3>
    </div>
    
    <div v-if="loading" class="stats-loading">
      <div class="loading-spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>
    
    <div v-else class="stats-grid">
      <div
        v-for="stat in stats"
        :key="stat.id"
        class="stat-card"
      >
        <div class="stat-icon" :style="{ 
          color: stat.color,
          background: `color-mix(in srgb, ${stat.color} 10%, transparent)`
        }">
          <svg v-if="stat.icon === 'agent'" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="11" r="3" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="stat.icon === 'plugin'" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 4V8H5V16H9V20H15V16H19V8H15V4H9Z" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="stat.icon === 'favorite'" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5L14.5 10L20 11L16 15L17 21L12 18L7 21L8 15L4 11L9.5 10L12 5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="stat.icon === 'kb'" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 3H19V21H5V3Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 8H16M8 12H16M8 16H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="stat.icon === 'tool'" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M13 3L19 9L14 14L8 18L5 19L6 16L10 10L13 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M12 5L14.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stat.value) }}</div>
          <div class="stat-label">{{ t(stat.labelKey) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-stats-section {
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

.stats-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  gap: 12px;
  color: #737373;
  font-size: 14px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #2d2d2d;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stats-grid {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.stat-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.2;
  margin-bottom: 4px;
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 13px;
  color: #737373;
  line-height: 1.2;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
