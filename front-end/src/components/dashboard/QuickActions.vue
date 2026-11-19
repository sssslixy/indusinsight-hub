<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

interface QuickAction {
  id: string
  labelKey: string
  icon: string
  path: string
  color: string
}

const actions: QuickAction[] = [
  {
    id: 'create-agent',
    labelKey: 'dashboard.createAgent',
    icon: 'create-agent',
    path: '/agents/create',
    color: '#3b82f6'
  },
  {
    id: 'create-skill',
    labelKey: 'dashboard.createSkill',
    icon: 'create-skill',
    path: '/skills/create',
    color: '#8b5cf6'
  },
  {
    id: 'create-knowledge',
    labelKey: 'dashboard.createKnowledgeBase',
    icon: 'create-kb',
    path: '/knowledge/create',
    color: '#0ea5e9'
  },
  {
    id: 'favorites',
    labelKey: 'profile.myFavorites',
    icon: 'favorite',
    path: '/my/favorites',
    color: '#ec4899'
  },
  {
    id: 'manual',
    labelKey: 'profile.userManual',
    icon: 'manual',
    path: '/manual',
    color: '#06b6d4'
  },
]

const handleAction = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="quick-actions">
    <h3 class="actions-title">{{ t('profile.quickActions') }}</h3>

    <div class="actions-list">
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="action-btn"
        @click="handleAction(action.path)"
      >
        <div class="action-icon" :style="{ color: action.color }">
          <svg v-if="action.icon === 'create-agent'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 6V12M6 9H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="action.icon === 'create-skill'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 3L6 6L3 6L3 12L6 12L6 15L12 15L12 12L15 12L15 6L12 6L12 3L6 3Z" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
          </svg>
          <svg v-else-if="action.icon === 'create-tool'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L15 7L8.5 13.5L4 14L4.5 9.5L11 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M10 4.5L13.5 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="action.icon === 'create-kb'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 3H14C14.5523 3 15 3.44772 15 4V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4C3 3.44772 3.44772 3 4 3Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 6H12M6 9H12M6 12H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="action.icon === 'favorite'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3L10.5 7L14 7.5L11.5 10L12 14L9 12L6 14L6.5 10L4 7.5L7.5 7L9 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="action.icon === 'manual'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 14.5C3 13.6716 3.67157 13 4.5 13H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M4.5 3H15V16H4.5C3.67157 16 3 15.3284 3 14.5V4.5C3 3.67157 3.67157 3 4.5 3Z" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
        <span class="action-label">{{ t(action.labelKey) }}</span>
        <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.actions-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-btn:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transform: translateX(4px);
}

.action-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: currentColor;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border-radius: 6px;
  flex-shrink: 0;
}

.action-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.action-arrow {
  color: #a3a3a3;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.action-btn:hover .action-arrow {
  color: #525252;
  transform: translateX(2px);
}
</style>
