<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

interface QuickAccessItem {
  id: string
  icon: string
  titleKey: string
  descriptionKey: string
  path: string
  color: string
}

const router = useRouter()
const { t } = useI18n()

const quickAccessItems: QuickAccessItem[] = [
  {
    id: 'my-agents',
    icon: 'my-agent',
    titleKey: 'profile.myAgents',
    descriptionKey: 'dashboard.manageMyAgents',
    path: '/my/agents',
    color: '#ec4899',
  },
  {
    id: 'my-skills',
    icon: 'my-skill',
    titleKey: 'profile.mySkills',
    descriptionKey: 'dashboard.manageMySkills',
    path: '/my/skills',
    color: '#f43f5e',
  },
  {
    id: 'my-knowledge-base',
    icon: 'my-knowledge-base',
    titleKey: 'profile.myKnowledgeBase',
    descriptionKey: 'dashboard.manageMyKnowledgeBases',
    path: '/my/knowledge',
    color: '#22c55e',
  },
  {
    id: 'favorites',
    icon: 'favorite',
    titleKey: 'profile.myFavorites',
    descriptionKey: 'dashboard.viewFavoriteContent',
    path: '/my/favorites',
    color: '#eab308',
  },
  {
    id: 'profile',
    icon: 'profile',
    titleKey: 'profile.pageTitle',
    descriptionKey: 'dashboard.viewEditProfile',
    path: '/profile',
    color: '#14b8a6',
  },
  {
    id: 'manual',
    icon: 'manual',
    titleKey: 'profile.userManual',
    descriptionKey: 'dashboard.learnManual',
    path: '/manual',
    color: '#6366f1',
  },
]

const getItemAriaLabel = (item: QuickAccessItem) => {
  return t('dashboard.quickAccessItemAria', {
    title: t(item.titleKey),
    description: t(item.descriptionKey),
  })
}

const handleNavigate = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="quick-access-grid" :aria-label="t('dashboard.quickAccessAria')">
    <div
      v-for="item in quickAccessItems"
      :key="item.id"
      class="access-card"
      role="button"
      tabindex="0"
      :aria-label="getItemAriaLabel(item)"
      @click="handleNavigate(item.path)"
      @keydown.enter="handleNavigate(item.path)"
      @keydown.space.prevent="handleNavigate(item.path)"
    >
      <div class="card-icon" :style="{ color: item.color }">
        <svg v-if="item.icon === 'my-agent'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="item.icon === 'my-skill'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else-if="item.icon === 'my-knowledge-base'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 7.5C4 6.67157 4.67157 6 5.5 6H10.5C11.3 6 12 6.7 12 7.5V17.5C12 16.7 11.3 16 10.5 16H5.5C4.67157 16 4 16.6716 4 17.5V7.5Z" stroke="currentColor" stroke-width="2"/>
          <path d="M20 7.5C20 6.67157 19.3284 6 18.5 6H13.5C12.7 6 12 6.7 12 7.5V17.5C12 16.7 12.7 16 13.5 16H18.5C19.3284 16 20 16.6716 20 17.5V7.5Z" stroke="currentColor" stroke-width="2"/>
          <path d="M9 10H7M17 10H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="item.icon === 'favorite'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 4L14 9L19 10L15.5 13.5L16 19L12 16L8 19L8.5 13.5L5 10L10 9L12 4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="item.icon === 'manual'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 19.5C4 18.1193 5.11929 17 6.5 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M6.5 3H20V21H6.5C5.11929 21 4 19.8807 4 18.5V5.5C4 4.11929 5.11929 3 6.5 3Z" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else-if="item.icon === 'profile'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
          <path d="M5 20C5 16.6863 7.68629 14 11 14H13C16.3137 14 19 16.6863 19 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="card-content">
        <h3 class="card-title">{{ t(item.titleKey) }}</h3>
        <p class="card-description">{{ t(item.descriptionKey) }}</p>
      </div>
      <div class="card-arrow">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.access-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.access-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.12);
}

.access-card:focus-visible {
  outline: 2px solid #525252;
  outline-offset: 2px;
}

.card-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: currentColor;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border-radius: 10px;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
  line-height: 1.3;
}

.card-description {
  font-size: 13px;
  color: #737373;
  margin: 0;
  line-height: 1.4;
}

.card-arrow {
  flex-shrink: 0;
  color: #a3a3a3;
  transition: all 0.2s ease;
}

.access-card:hover .card-arrow,
.access-card:focus-visible .card-arrow {
  color: #525252;
  transform: translateX(4px);
}

@media (max-width: 1180px) {
  .quick-access-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .quick-access-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .access-card,
  .card-arrow {
    transition: none;
  }

  .access-card:hover {
    transform: none;
  }

  .access-card:hover .card-arrow,
  .access-card:focus-visible .card-arrow {
    transform: none;
  }
}
</style>
