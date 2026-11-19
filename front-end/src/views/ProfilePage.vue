<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ProfilePageHeader,
  ProfileHeader,
  ProfileInfoCard,
  BasicInfoSection,
  SecuritySection,
  ProfileStatsSection,
  RecentActivitySection,
  ProfileQuickActions,
} from './profile/components'
import { getUserProfile, updateUserProfile } from '@/api/user'
import ChangeUsernameDialog from '@/components/profile/ChangeUsernameDialog.vue'
import { normalizeUsername, usernameError } from '@/utils/username'
import type { UserProfile } from '@/types/api'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

// 用户资料数据（全局共享给所有子组件）
const userProfile = ref<UserProfile | null>(null)
const loading = ref(false)
const userStore = useUserStore()
const { t } = useI18n()
const usernameDialogVisible = ref(false)
const usernameSaving = ref(false)
const usernameSaveError = ref('')

const openUsernameDialog = () => {
  if (!userProfile.value || loading.value) return
  usernameSaveError.value = ''
  usernameDialogVisible.value = true
}

const saveUsername = async (raw: string) => {
  if (usernameSaving.value || !userProfile.value) return
  const errorKey = usernameError(raw)
  if (errorKey) {
    usernameSaveError.value = t(errorKey)
    return
  }
  const username = normalizeUsername(raw)
  if (username === userProfile.value.username) return
  usernameSaving.value = true
  usernameSaveError.value = ''
  try {
    const response = await updateUserProfile({ username })
    if (response.code !== 0 || !response.data) {
      throw new Error(response.message || t('profile.usernameSaveFailed'))
    }
    // Merge only the edited field: an avatar upload may finish during this request.
    userProfile.value = { ...userProfile.value, username: response.data.username }
    userStore.updateProfile({ username: response.data.username })
    usernameDialogVisible.value = false
    ElMessage.success(t('profile.usernameUpdated'))
  } catch (error) {
    usernameSaveError.value = (error instanceof Error && error.message) || t('profile.usernameSaveFailed')
  } finally {
    usernameSaving.value = false
  }
}

// 修改密码弹窗显示状态（个人资料卡片与账号安全模块共用）
const changePasswordDialogVisible = ref(false)

// 通过 provide 向子组件提供用户资料数据及弹窗状态
provide('userProfile', userProfile)
provide('profileLoading', loading)
provide('changePasswordDialogVisible', changePasswordDialogVisible)

// 加载用户资料
const loadUserProfile = async () => {
  loading.value = true
  
  try {
    const response = await getUserProfile()
    if (response.code === 0 && response.data) {
      userProfile.value = response.data
      userStore.updateProfile({
        username: response.data.username,
        avatar: response.data.avatar
      })
    } else {
      ElMessage.error(response.message || t('profile.profileLoadFailed'))
    }
  } catch (error) {
    console.error('获取用户资料失败:', error)
    ElMessage.error(t('profile.profileLoadFailedRetry'))
  } finally {
    loading.value = false
  }
}

// 页面加载时获取用户资料
onMounted(() => {
  loadUserProfile()
})

const handleAvatarUpdated = (avatarUrl: string) => {
  if (userProfile.value) {
    userProfile.value = {
      ...userProfile.value,
      avatar: avatarUrl
    }
  }
  userStore.updateProfile({ avatar: avatarUrl })
}
</script>

<template>
  <div class="profile-page">
    <ProfilePageHeader />
    
    <div class="profile-container">
      <!-- 页面标题区 -->
      <ProfileHeader />
      
      <!-- 个人资料主卡片 -->
      <ProfileInfoCard :user-profile="userProfile" :loading="loading" @avatar-updated="handleAvatarUpdated" @change-username="openUsernameDialog" />
      <ChangeUsernameDialog
        :visible="usernameDialogVisible"
        :username="userProfile?.username || ''"
        :saving="usernameSaving"
        :error="usernameSaveError"
        @confirm="saveUsername"
        @cancel="usernameDialogVisible = false"
        @edit="usernameSaveError = ''"
      />
      
      <!-- 基础信息与账号安全 -->
      <div class="info-security-layout">
        <BasicInfoSection :user-profile="userProfile" />
        <SecuritySection :user-profile="userProfile" />
      </div>
      
      <!-- 我的数据概览 -->
      <ProfileStatsSection />
      
      <!-- 最近活动与快捷操作 -->
      <div class="activity-actions-layout">
        <RecentActivitySection />
        <ProfileQuickActions />
      </div>
    </div>
    
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--app-color-bg-page);
  padding-top: var(--app-page-top-desktop);
  display: flex;
  flex-direction: column;
}

.profile-container {
  flex: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 48px 48px 64px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.info-security-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.activity-actions-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;
}

@media (max-width: 1024px) {
  .info-security-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .activity-actions-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .profile-page {
    padding-top: var(--app-page-top-mobile);
  }
  
  .profile-container {
    padding: 32px 24px 48px;
    gap: 24px;
  }
}
</style>
