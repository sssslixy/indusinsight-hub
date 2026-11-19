<script setup lang="ts">
import { inject, ref, computed, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { Avatar } from '@/components/base'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

import type { UserProfile } from '@/types/api'
import { uploadUserAvatar } from '@/api/user'
import { useI18n } from 'vue-i18n'

const router = useRouter()

// 接收父组件传递的用户资料和加载状态
const props = defineProps<{
  userProfile: UserProfile | null
  loading: boolean
}>()
const emit = defineEmits<{
  (e: 'avatar-updated', avatarUrl: string): void
  (e: 'change-username'): void
}>()
const { t } = useI18n()

// 状态映射
const statusMap = computed<Record<number, { label: string; color: string }>>(() => ({
  1: { label: t('profile.status.normal'), color: '#10b981' },
  0: { label: t('profile.status.disabled'), color: '#ef4444' },
  2: { label: t('profile.status.frozen'), color: '#f59e0b' },
  3: { label: t('profile.status.closed'), color: '#9ca3af' }
}))

// 获取状态显示
const getStatusDisplay = (status: number) => {
  return statusMap.value[status] || { label: t('common.unknown'), color: '#9ca3af' }
}

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

const fileInputRef = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const cropDialogVisible = ref(false)
const selectedImageUrl = ref('')
const selectedImageFile = ref<File | null>(null)
const cropZoom = ref(1)
const cropOffsetX = ref(0)
const cropOffsetY = ref(0)
const cropImageRef = ref<HTMLImageElement | null>(null)
const dragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragOriginOffsetX = ref(0)
const dragOriginOffsetY = ref(0)
const cropBoxSize = 280
const cropExportSize = 512
const minZoom = 1
const maxZoom = 3
const previewTransform = computed(() => {
  return `translate(calc(-50% + ${cropOffsetX.value}px), calc(-50% + ${cropOffsetY.value}px)) scale(${cropZoom.value})`
})

const handleChangeAvatar = () => {
  if (avatarUploading.value) {
    return
  }
  fileInputRef.value?.click()
}

const handleAvatarFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.error(t('profile.selectImageFile'))
    return
  }

  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
  }
  selectedImageFile.value = file
  selectedImageUrl.value = URL.createObjectURL(file)
  cropZoom.value = 1
  cropOffsetX.value = 0
  cropOffsetY.value = 0
  cropDialogVisible.value = true
}

const uploadCroppedAvatar = async () => {
  if (!selectedImageFile.value || !cropImageRef.value) {
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = cropExportSize
  canvas.height = cropExportSize
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    ElMessage.error(t('profile.avatarProcessFailed'))
    return
  }

  const img = cropImageRef.value
  const baseScale = Math.max(cropBoxSize / img.naturalWidth, cropBoxSize / img.naturalHeight)
  const finalScale = baseScale * cropZoom.value
  const drawWidth = img.naturalWidth * finalScale * (cropExportSize / cropBoxSize)
  const drawHeight = img.naturalHeight * finalScale * (cropExportSize / cropBoxSize)
  const drawX = cropExportSize / 2 - drawWidth / 2 + cropOffsetX.value * (cropExportSize / cropBoxSize)
  const drawY = cropExportSize / 2 - drawHeight / 2 + cropOffsetY.value * (cropExportSize / cropBoxSize)

  ctx.clearRect(0, 0, cropExportSize, cropExportSize)
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })
  if (!blob) {
    ElMessage.error(t('profile.avatarProcessFailed'))
    return
  }

  const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })

  avatarUploading.value = true
  try {
    const response = await uploadUserAvatar(croppedFile)
    if (response.code === 0 && response.data) {
      emit('avatar-updated', response.data)
      ElMessage.success(t('profile.avatarUpdated'))
      closeCropDialog()
    } else {
      ElMessage.error(response.message || t('profile.avatarUpdateFailed'))
    }
  } catch (error) {
    console.error('头像更新失败:', error)
    ElMessage.error(t('profile.avatarUpdateFailedRetry'))
  } finally {
    avatarUploading.value = false
  }
}

const closeCropDialog = () => {
  cropDialogVisible.value = false
  selectedImageFile.value = null
  cropZoom.value = 1
  cropOffsetX.value = 0
  cropOffsetY.value = 0
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
    selectedImageUrl.value = ''
  }
}

const startDrag = (clientX: number, clientY: number) => {
  dragging.value = true
  dragStartX.value = clientX
  dragStartY.value = clientY
  dragOriginOffsetX.value = cropOffsetX.value
  dragOriginOffsetY.value = cropOffsetY.value
}

const moveDrag = (clientX: number, clientY: number) => {
  if (!dragging.value) return
  cropOffsetX.value = dragOriginOffsetX.value + (clientX - dragStartX.value)
  cropOffsetY.value = dragOriginOffsetY.value + (clientY - dragStartY.value)
}

const endDrag = () => {
  dragging.value = false
}

const handleMouseDown = (event: MouseEvent) => {
  startDrag(event.clientX, event.clientY)
}

const handleMouseMove = (event: MouseEvent) => {
  moveDrag(event.clientX, event.clientY)
}

const handleTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return
  startDrag(touch.clientX, touch.clientY)
}

const handleTouchMove = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return
  moveDrag(touch.clientX, touch.clientY)
}

const handleCropWheel = (event: WheelEvent) => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.05 : 0.05
  const next = Math.max(minZoom, Math.min(maxZoom, cropZoom.value + delta))
  cropZoom.value = Number(next.toFixed(2))
}

onBeforeUnmount(() => {
  endDrag()
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
  }
})

// 与账号安全模块共用同一修改密码弹窗（由 ProfilePage provide 状态）
const changePasswordDialogVisible = inject<Ref<boolean>>('changePasswordDialogVisible')

const handleChangePassword = () => {
  if (changePasswordDialogVisible) {
    changePasswordDialogVisible.value = true
  } else {
    ElMessage.info(t('profile.changePasswordInSecurity'))
  }
}

</script>

<template>
  <div class="profile-info-card">
    <div v-if="loading" class="card-loading">
      <div class="loading-spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>
    
    <div v-else-if="userProfile" class="card-main">
      <div class="profile-left">
        <Avatar
          :src="userProfile.avatar"
          decorative
          :size="80"
          :enable-profile-fallback="true"
          class="profile-avatar"
        />
        <div class="profile-details">
          <div class="profile-name-row">
            <h2 class="profile-name">{{ userProfile.username || '--' }}</h2>
            <span 
              class="profile-status-badge" 
              :style="{ 
                color: getStatusDisplay(userProfile.status).color,
                background: `color-mix(in srgb, ${getStatusDisplay(userProfile.status).color} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${getStatusDisplay(userProfile.status).color} 20%, transparent)`
              }"
            >
              {{ getStatusDisplay(userProfile.status).label }}
            </span>
            <button class="edit-name-btn" type="button" @click="emit('change-username')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ t('profile.changeUsername') }}
            </button>
          </div>
          <div class="profile-meta">
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 14C3 11.7909 5.23858 10 8 10C10.7614 10 13 11.7909 13 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ userProfile.account || '--' }}</span>
            </div>
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
                <path d="M2 6H14" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              <span>{{ t('profile.developer') }}</span>
            </div>
          </div>
        </div>
        <div class="profile-time-info">
            <div class="time-item">
              <span class="time-label">{{ t('profile.lastLogin') }}</span>
              <span class="time-value">{{ formatDateTime(userProfile.lastLoginAt) }}</span>
            </div>
            <div class="time-divider"></div>
            <div class="time-item">
              <span class="time-label">{{ t('profile.createdAt') }}</span>
              <span class="time-value">{{ formatDateTime(userProfile.createdAt) }}</span>
            </div>
          </div>
      </div>
      
      <div class="profile-actions">
        <button class="action-btn secondary" :disabled="avatarUploading" @click="handleChangeAvatar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="6" r="2.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M3 14C3 11.7909 5.23858 10 8 10C10.7614 10 13 11.7909 13 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          {{ avatarUploading ? t('common.upload') : t('profile.changeAvatar') }}
        </button>
        <button class="action-btn secondary" @click="handleChangePassword">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M5 7V5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5V7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          {{ t(userProfile?.hasPassword ? 'profile.changePassword' : 'profile.setPassword') }}
        </button>
        <button class="action-btn secondary" type="button" @click="router.push('/profile/llm')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="12" height="5" rx="1.5" stroke="currentColor" stroke-width="1.3" />
            <rect x="2" y="9" width="12" height="5" rx="1.5" stroke="currentColor" stroke-width="1.3" />
            <path d="M5 4.5h.01M5 11.5h.01M8 4.5h3M8 11.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          {{ t('llm.title') }}
        </button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="avatar-file-input"
        @change="handleAvatarFileChange"
      />
    </div>
    
    <div v-else class="card-error">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
        <path d="M24 16V26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="24" cy="32" r="1.5" fill="currentColor"/>
      </svg>
      <p>{{ t('profile.loadingFailed') }}</p>
    </div>

    <div v-if="cropDialogVisible" class="avatar-crop-modal-mask" @click.self="closeCropDialog">
      <div class="avatar-crop-modal">
        <div class="avatar-crop-modal-header">
          <h3>{{ t('profile.adjustAvatar') }}</h3>
          <button class="crop-close-btn" @click="closeCropDialog">×</button>
        </div>
        <div class="avatar-crop-container">
          <div class="avatar-crop-box" @wheel.prevent="handleCropWheel">
            <img
              v-if="selectedImageUrl"
              ref="cropImageRef"
              :src="selectedImageUrl"
              :alt="t('profile.avatarPreview')"
              class="avatar-crop-image"
              :class="{ dragging }"
              :style="{ transform: previewTransform }"
              @mousedown.prevent="handleMouseDown"
              @mousemove.prevent="handleMouseMove"
              @mouseup="endDrag"
              @mouseleave="endDrag"
              @touchstart.prevent="handleTouchStart"
              @touchmove.prevent="handleTouchMove"
              @touchend="endDrag"
              @touchcancel="endDrag"
            />
          </div>
          <div class="avatar-crop-tips">{{ t('profile.cropTips') }}</div>
        </div>
        <div class="crop-dialog-footer">
          <button class="crop-btn plain" @click="closeCropDialog">{{ t('common.cancel') }}</button>
          <button class="crop-btn primary" :disabled="avatarUploading" @click="uploadCroppedAvatar">
            {{ avatarUploading ? t('common.upload') : t('common.saveAndUpload') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-info-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.card-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  gap: 16px;
  color: #737373;
  font-size: 14px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #2d2d2d;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  gap: 16px;
  color: #737373;
}

.card-error svg {
  color: #ef4444;
}

.card-error p {
  margin: 0;
  font-size: 14px;
  color: #525252;
}

.card-main {
  display: flex;
  flex-direction: column;
}

.profile-left {
  min-width: 0;
  max-width: 100%;
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 32px;
}

.profile-avatar {
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 0 0 4px #f7f8fa;
  flex-shrink: 0;
}

.profile-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.profile-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.profile-name {
  overflow-wrap: anywhere;
  min-width: 0;
  max-width: 100%;
  font-size: 26px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.profile-status-badge {
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid;
  line-height: 1.4;
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #525252;
}

.meta-item svg {
  color: #a3a3a3;
  flex-shrink: 0;
}

.profile-time-info {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-left: auto;
  padding-left: 28px;
  border-left: 1px solid #eef0f2;
  flex-shrink: 0;
}

.time-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-label {
  font-size: 12px;
  color: #8a9099;
  line-height: 1.2;
}

.time-value {
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  line-height: 1.2;
}

.time-divider {
  display: none;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid #eef0f2;
  background: #fcfcfd;
}

.edit-name-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #737b86;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.edit-name-btn:hover { background: #f3f4f6; color: #303846; }
.edit-name-btn:focus-visible, .action-btn:focus-visible {
  outline: 2px solid #a6b7cb;
  outline-offset: 2px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
  white-space: nowrap;
}

.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.avatar-file-input {
  display: none;
}

.avatar-crop-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.avatar-crop-box {
  width: 280px;
  height: 280px;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #f5f5f5;
  position: relative;
}

.avatar-crop-image {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center center;
  user-select: none;
  -webkit-user-drag: none;
  cursor: grab;
}

.avatar-crop-image.dragging {
  cursor: grabbing;
}

.avatar-crop-tips {
  text-align: center;
  color: #737373;
  font-size: 13px;
}

.crop-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding: 0 24px 16px 0;
}

.avatar-crop-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.avatar-crop-modal {
  width: 540px;
  max-width: 100%;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
}

.avatar-crop-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.avatar-crop-modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.crop-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: #737373;
  cursor: pointer;
}

.crop-close-btn:hover {
  background: #f5f5f5;
}


.crop-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
  color: #404040;
  cursor: pointer;
}

.crop-btn.primary {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #fff;
}

.crop-btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

.action-btn.primary:hover {
  background: #1a1a1a;
  border-color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.action-btn.secondary {
  background: transparent;
  border-color: transparent;
  color: #525252;
}

.action-btn.secondary:hover {
  background: #f0f2f5;
  border-color: transparent;
  color: #1a1a1a;
}

@media (max-width: 1024px) {
  .profile-left {
    flex-wrap: wrap;
  }

  .profile-time-info {
    width: calc(100% - 100px);
    margin-left: 100px;
    padding-left: 0;
    border-left: 0;
  }
}

@media (max-width: 768px) {
  .profile-left {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    padding: 24px 20px;
    gap: 20px 16px;
  }

  .profile-avatar {
    width: 64px !important;
    height: 64px !important;
    min-width: 64px !important;
    min-height: 64px !important;
  }

  .profile-name-row {
    gap: 8px;
  }

  .profile-name { font-size: 22px; }
  .profile-meta { gap: 8px 12px; }
  .meta-item { font-size: 12px; overflow-wrap: anywhere; min-width: 0; }

  .profile-time-info {
    grid-column: 1 / -1;
    width: 100%;
    margin: 0;
    padding-top: 18px;
    border-top: 1px solid #eef0f2;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .time-value { font-size: 12px; overflow-wrap: anywhere; }

  .profile-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 10px 12px;
    gap: 4px;
  }

  .action-btn {
    justify-content: flex-start;
    min-height: 40px;
    white-space: normal;
    text-align: left;
  }

  .action-btn svg { flex-shrink: 0; }
}
</style>
