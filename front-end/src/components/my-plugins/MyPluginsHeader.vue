<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BackButton } from '@/components/base'

const router = useRouter()
const { t } = useI18n()

const handleCreate = () => router.push('/skills/create')
</script>

<template>
  <div class="page-header">
    <div class="header-content">
      <div class="title-area">
        <h1 class="page-title">{{ t('profile.mySkills') }}</h1>
        <p class="page-subtitle">{{ t('dashboard.mySkillsSubtitle') }}</p>
      </div>
      <div class="header-actions">
        <BackButton />
        <button class="create-btn" @click="handleCreate">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          {{ t('dashboard.createSkill') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header { padding-bottom: 32px; border-bottom: 1px solid rgba(0, 0, 0, 0.08); }
.header-content { display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; }
.title-area { flex: 1; }
.page-title { font-size: 32px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px; letter-spacing: -0.02em; line-height: 1.2; }
.page-subtitle { font-size: 15px; color: #737373; margin: 0; line-height: 1.5; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.create-btn { display: flex; align-items: center; gap: 7px; padding: 10px 18px; background: #2d2d2d; border: 1px solid #2d2d2d; border-radius: 8px; font-size: 14px; font-weight: 500; color: #ffffff; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
.create-btn:hover { background: #1a1a1a; border-color: #1a1a1a; }
@media (max-width: 768px) {
  .page-header { padding-bottom: 24px; }
  .header-content { flex-direction: column; gap: 20px; }
  .page-title { font-size: 26px; }
  .page-subtitle { font-size: 14px; }
  .header-actions { align-self: flex-start; }
}
</style>
