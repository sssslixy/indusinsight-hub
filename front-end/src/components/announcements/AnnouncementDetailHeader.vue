<script setup lang="ts">
import { BackButton } from '@/components/base'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="detail-page-header">
    <div class="header-content">
      <div class="title-area">
        <h1 class="page-title">{{ t('announcementsPage.detailTitle') }}</h1>
        <p class="page-subtitle">{{ t('announcementsPage.detailSubtitle') }}</p>
      </div>

      <div class="action-group">
        <BackButton />
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page-header {
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

.action-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .detail-page-header {
    padding-bottom: 24px;
  }

  .header-content {
    flex-direction: column;
    gap: 20px;
  }

  .page-title {
    font-size: 26px;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .action-group {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  :deep(.back-button) {
    width: 100%;
    justify-content: center;
  }
}
</style>
