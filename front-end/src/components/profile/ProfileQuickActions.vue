<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

interface QuickAction {
  id: string
  labelKey: string
  icon: string
  color: string
  actionType: 'route' | 'coming-soon'
  routeName?: string
  query?: Record<string, any>
}

const quickActions: QuickAction[] = [
  {
    id: 'my-agents',
    labelKey: 'profile.viewMyAgents',
    icon: 'agent',
    color: '#3b82f6',
    actionType: 'route',
    routeName: 'my-agents',
  },
  {
    id: 'my-skills',
    labelKey: 'profile.viewMySkills',
    icon: 'skill',
    color: '#8b5cf6',
    actionType: 'route',
    routeName: 'my-skills',
  },
  {
    id: 'favorite-agents',
    labelKey: 'profile.viewFavoriteAgents',
    icon: 'favorite-agent',
    color: '#f59e0b',
    actionType: 'route',
    routeName: 'my-favorites',
    query: { tab: 'agents' },
  },
  {
    id: 'favorite-skills',
    labelKey: 'profile.viewFavoriteSkills',
    icon: 'favorite-skill',
    color: '#10b981',
    actionType: 'route',
    routeName: 'my-favorites',
    query: { tab: 'plugins' },
  },
  {
    id: 'manual',
    labelKey: 'profile.openManual',
    icon: 'manual',
    color: '#06b6d4',
    actionType: 'coming-soon',
  },
  {
    id: 'dashboard',
    labelKey: 'profile.backToDashboard',
    icon: 'dashboard',
    color: '#ec4899',
    actionType: 'route',
    routeName: 'dashboard',
  },
]

const handleAction = (action: QuickAction) => {
  if (action.actionType === 'coming-soon') {
    ElMessage.info(t('profile.manualComingSoon'))
    return
  }

  if (action.actionType === 'route' && action.routeName) {
    router.push({
      name: action.routeName,
      query: action.query,
    })
  }
}
</script>

<template>
  <div class="profile-quick-actions">
    <div class="section-header">
      <h3 class="section-title">{{ t('profile.quickActions') }}</h3>
    </div>
    
    <div class="actions-list">
      <button
        v-for="action in quickActions"
        :key="action.id"
        class="action-item"
        @click="handleAction(action)"
      >
        <div 
          class="action-icon"
          :style="{ 
            color: action.color,
            background: `color-mix(in srgb, ${action.color} 10%, transparent)`
          }"
        >
          <svg v-if="action.icon === 'agent'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="3" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="9" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
          </svg>
          <svg v-else-if="action.icon === 'skill'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 3V6H4V12H7V15H11V12H14V6H11V3H7Z" stroke="currentColor" stroke-width="1.3"/>
          </svg>
          <svg v-else-if="action.icon === 'favorite-agent'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 4L11 8L15 9L12 12L13 16L9 14L5 16L6 12L3 9L7 8L9 4Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="action.icon === 'favorite-skill'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 4L11 8L15 9L12 12L13 16L9 14L5 16L6 12L3 9L7 8L9 4Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="action.icon === 'manual'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M5 3H13C13.5523 3 14 3.44772 14 4V14C14 14.5523 13.5523 15 13 15H5C4.44772 15 4 14.5523 4 14V4C4 3.44772 4.44772 3 5 3Z" stroke="currentColor" stroke-width="1.3"/>
            <path d="M7 7H11M7 10H11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="action.icon === 'dashboard'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9L9 3L15 9M5 7V14H13V7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="action-label">{{ t(action.labelKey) }}</span>
        <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-quick-actions {
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

.actions-list {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-item:hover {
  background: #fafafa;
}

.action-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
}

.action-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
}

.action-arrow {
  color: #a3a3a3;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.action-item:hover .action-arrow {
  color: #525252;
  transform: translateX(2px);
}
</style>

