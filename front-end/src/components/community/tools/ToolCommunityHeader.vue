<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
const handleBackToDashboard = () => router.push('/dashboard')
</script>

<template>
  <div class="page-header">
    <div class="header-content">
      <div class="title-area">
        <h1 class="page-title">{{ t('community.toolTitle') }}</h1>
        <p class="page-subtitle">{{ t('community.toolSubtitle') }}</p>
      </div>
      <button class="back-btn" @click="handleBackToDashboard">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M13 8H3M3 8L7 4M3 8L7 12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ t('community.backToWorkbench') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding-bottom: 32px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
}

.title-area {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 15px;
  color: #737373;
  margin: 0;
  line-height: 1.5;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.back-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

@media (max-width: 768px) {
  .page-header {
    padding-bottom: 24px;
  }
  .header-content {
    flex-direction: column;
    gap: 20px;
  }
  .page-title {
    font-size: 26px;
  }
  .back-btn {
    align-self: flex-start;
  }
}
</style>
