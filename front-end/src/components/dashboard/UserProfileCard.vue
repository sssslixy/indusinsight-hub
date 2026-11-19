<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { Avatar } from '@/components/base'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const currentUser = computed(() => userStore.userInfo)

const handleViewProfile = () => {
  router.push('/profile')
}
</script>

<template>
  <div class="user-profile-card">
    <div class="profile-header">
      <Avatar
        :src="currentUser?.avatar"
        decorative
        :size="64"
        class="profile-avatar"
      />
      <div class="profile-info">
        <h3 class="profile-name">{{ currentUser?.username || t('common.user') }}</h3>
        <p class="profile-account">{{ currentUser?.account || 'user@example.com' }}</p>
      </div>
    </div>

    <div class="profile-details">
      <div class="detail-item">
        <span class="detail-label">{{ t('dashboard.userRole') }}</span>
        <span class="detail-value">{{ t('profile.developer') }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">{{ t('profile.lastLogin') }}</span>
        <span class="detail-value">{{ t('profile.justNow') }}</span>
      </div>
    </div>

    <button class="view-profile-btn" @click="handleViewProfile">
      {{ t('dashboard.viewProfile') }}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.user-profile-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-avatar {
  border: 2px solid rgba(0, 0, 0, 0.08);
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  overflow-wrap: anywhere;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
  line-height: 1.3;
}

.profile-account {
  font-size: 13px;
  color: #737373;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 13px;
  color: #737373;
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
}

.view-profile-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-profile-btn:hover {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}
</style>
