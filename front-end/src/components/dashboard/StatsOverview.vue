<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getMyDashboardStats } from '@/api/dashboard'
import type { MyDashboardStats } from '@/api/dashboard'

interface StatItem {
  id: string
  labelKey: string
  value: number | string
  icon: string
  color: string
}

const { t } = useI18n()

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

const fetchMyStats = async () => {
  try {
    const response = await getMyDashboardStats()
    if (response.data) {
      applyStats(response.data)
    }
  } catch (err) {
    console.error('Failed to fetch my dashboard stats:', err)
  }
}

const formatNumber = (num: number | string) => {
  if (typeof num === 'string') {
    return num
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

onMounted(() => {
  fetchMyStats()
})
</script>

<template>
  <div class="stats-overview">
    <h3 class="stats-title">{{ t('profile.statsTitle') }}</h3>

    <div class="stats-grid">
      <div
        v-for="stat in stats"
        :key="stat.id"
        class="stat-card"
      >
        <div class="stat-icon" :style="{ color: stat.color }">
          <svg v-if="stat.icon === 'agent'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="10" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="stat.icon === 'plugin'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 3L7 7L3 7L3 13L7 13L7 17L13 17L13 13L17 13L17 7L13 7L13 3L7 3Z" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="stat.icon === 'favorite'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4L12 8L16 9L13 12L14 16L10 14L6 16L7 12L4 9L8 8L10 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="stat.icon === 'kb'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4H16V16H4V4Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 7H13M7 10H13M7 13H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="stat.icon === 'tool'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M11 3L15 7L8.5 13.5L4 14L4.5 9.5L11 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M10 4.5L13.5 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
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
.stats-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stats-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: currentColor;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.2;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #737373;
  line-height: 1.2;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
