<script setup lang="ts">
import { computed } from 'vue'
import type { UserProfile } from '@/types/api'
import { useI18n } from 'vue-i18n'

// 接收父组件传递的用户资料
const props = defineProps<{
  userProfile: UserProfile | null
}>()
const { t } = useI18n()

// 格式化时间
const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return '--'
  
  try {
    // 如果已经是格式化好的字符串，直接返回
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
      return dateStr
    }
    
    // 否则进行格式化
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '--'
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    console.error('时间格式化失败:', error)
    return '--'
  }
}

// 脱敏手机号
const maskPhone = (phone: string | null | undefined) => {
  if (!phone) return '--'
  if (phone.length === 11) {
    return phone.substring(0, 3) + '****' + phone.substring(7)
  }
  return phone
}

// 计算属性
const username = computed(() => props.userProfile?.username || '--')
const account = computed(() => props.userProfile?.account || '--')
const phone = computed(() => maskPhone(props.userProfile?.phone))
const statusLabel = computed(() => props.userProfile?.statusLabel || '--')
const statusClass = computed(() => {
  if (!props.userProfile) return ''
  return props.userProfile.status === 1 ? 'status-active' : ''
})
const passwordUpdatedAt = computed(() => formatDateTime(props.userProfile?.passwordUpdatedAt))
</script>

<template>
  <div class="basic-info-section">
    <div class="section-header">
      <h3 class="section-title">{{ t('profile.basicInfo') }}</h3>
    </div>
    
    <div class="info-list">
      <div class="info-item">
        <span class="info-label">{{ t('profile.username') }}</span>
        <span class="info-value">{{ username }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">{{ t('profile.account') }}</span>
        <span class="info-value">{{ account }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">{{ t('profile.phone') }}</span>
        <span class="info-value">{{ phone }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">{{ t('profile.userStatus') }}</span>
        <span class="info-value" :class="statusClass">{{ statusLabel }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">{{ t('profile.passwordUpdated') }}</span>
        <span class="info-value">{{ passwordUpdatedAt }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basic-info-section {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.section-header {
  padding: 24px 24px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
}

.info-list {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.info-label {
  font-size: 14px;
  color: #737373;
  line-height: 1.4;
  flex-shrink: 0;
}

.info-value {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
  text-align: right;
}

.info-value.status-active {
  color: #10b981;
}

@media (max-width: 768px) {
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .info-value {
    text-align: left;
  }
}
</style>
