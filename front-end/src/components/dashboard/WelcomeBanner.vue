<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import PlatformStats from './PlatformStats.vue'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const currentUser = computed(() => userStore.userInfo)

const handleCreateAgent = () => {
  router.push({ name: 'create-agent' })
}

const handleCreateSkill = () => {
  router.push('/skills/create')
}

const handleCreateKnowledgeBase = () => {
  router.push('/knowledge/create')
}

</script>

<template>
  <section class="welcome-banner">
    <div class="banner-container">
      <div class="welcome-text">
        <h1 class="banner-title">{{ t('profile.systemName') }}</h1>
        <p class="banner-subtitle">{{ t('dashboard.bannerSubtitle') }}</p>
        <p class="user-greeting">
          {{ t('dashboard.greeting', { username: currentUser?.username || t('common.user') }) }}
        </p>
      </div>

      <div class="banner-actions">
        <button class="action-btn primary" @click="handleCreateAgent">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="10" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          {{ t('dashboard.createAgent') }}
        </button>
        <button class="action-btn secondary" @click="handleCreateSkill">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 3L7 7L3 7L3 13L7 13L7 17L13 17L13 13L17 13L17 7L13 7L13 3L7 3Z" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          {{ t('dashboard.createSkill') }}
        </button>
        <button class="action-btn secondary" @click="handleCreateKnowledgeBase">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <ellipse cx="10" cy="5" rx="6" ry="2.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M4 5V10C4 11.3807 6.68629 12.5 10 12.5C13.3137 12.5 16 11.3807 16 10V5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M4 10V15C4 16.3807 6.68629 17.5 10 17.5C13.3137 17.5 16 16.3807 16 15V10" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          {{ t('dashboard.createKnowledgeBase') }}
        </button>
      </div>
      <PlatformStats class="banner-stats" />
    </div>
  </section>
</template>

<style scoped>
.welcome-banner {
  padding: 64px 0 48px;
  background: transparent;
}

.banner-container {
  max-width: var(--dashboard-content-max-width, 1040px);
  margin: 0 auto;
  padding: 0 48px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  grid-template-areas: "intro stats" "actions stats";
  min-width: 0;
  gap: 24px 32px;
}

.banner-stats {
  grid-area: stats;
  align-self: start;
  min-width: 0;
  margin-top: 4px;
}

.welcome-text {
  grid-area: intro;
  min-width: 0;
  overflow-wrap: anywhere;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.banner-title {
  font-size: 36px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.banner-subtitle {
  font-size: 16px;
  color: #737373;
  margin: 0;
  line-height: 1.5;
}

.user-greeting {
  font-size: 15px;
  color: #525252;
  margin: 0;
  font-weight: 500;
}

.banner-actions {
  grid-area: actions;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  min-height: 52px;
  max-width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: normal;
  overflow-wrap: anywhere;
}

.action-btn svg { flex-shrink: 0; }

.action-btn.primary {
  background: #2d2d2d;
  color: #ffffff;
}

.action-btn.primary:hover {
  background: #3a3a3a;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.action-btn.secondary {
  min-width: min(160px, 100%);
  padding-right: 22px;
  padding-left: 18px;
  background: #ffffff;
  color: #2d2d2d;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.action-btn.secondary:hover {
  background: #fafafa;
  border-color: #2d2d2d;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

@media (min-width: 1000px) {
  .banner-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    align-items: stretch;
  }
  .banner-actions .action-btn {
    min-width: 0;
    padding: 12px 16px;
    font-size: 14px;
  }
}

@media (max-width: 999px) {
  .banner-container {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "intro" "actions" "stats";
    gap: 24px;
  }

  .banner-stats {
    max-width: 420px;
    margin-top: 0;
  }
}

@media (max-width: 768px) {
  .welcome-banner {
    padding: 48px 0 32px;
  }

  .banner-container {
    padding: 0 24px;
  }

  .banner-title {
    font-size: 28px;
  }

  .banner-subtitle {
    font-size: 15px;
  }

}
</style>
