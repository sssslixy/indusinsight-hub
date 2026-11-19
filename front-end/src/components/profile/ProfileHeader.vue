<script setup lang="ts">
import { BackButton } from '@/components/base'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { profileReturnTarget } from '@/router/profileNavigation'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div class="profile-header">
    <div class="header-content">
      <div class="title-area">
        <h1 class="page-title">{{ t('profile.pageTitle') }}</h1>
        <p class="page-subtitle">{{ t('profile.pageSubtitle') }}</p>
      </div>

      <BackButton :destination="profileReturnTarget(router)" />
    </div>
  </div>
</template>

<style scoped>
.profile-header {
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
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 15px;
  color: #737373;
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .profile-header {
    padding-bottom: 24px;
  }

  .header-content {
    flex-direction: column;
    gap: 20px;
  }

  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 14px;
  }

  :deep(.back-button) {
    align-self: flex-start;
  }
}
</style>
