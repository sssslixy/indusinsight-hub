<script setup lang="ts">
import { BackButton } from '@/components/base'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="page-header">
    <div class="header-content">
      <div class="title-area">
        <h1 class="page-title">{{ t('profile.skillCommunity') }}</h1>
        <p class="page-subtitle">{{ t('community.skillSubtitle') }}</p>
      </div>
      <BackButton />
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

.title-area { flex: 1; }

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

@media (max-width: 768px) {
  .page-header { padding-bottom: 24px; }
  .header-content { flex-direction: column; gap: 20px; }
  .page-title { font-size: 26px; }
  :deep(.back-button) { align-self: flex-start; }
}
</style>
