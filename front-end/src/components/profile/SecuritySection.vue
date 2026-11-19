<script setup lang="ts">
import { computed, ref, watch, inject } from 'vue'
import type { Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UserProfile } from '@/types/api'
import { sendSmsCode } from '@/api/auth'
import { changePassword } from '@/api/user'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSmsCountdown } from '@/composables/useSmsCountdown'

// 接收父组件传递的用户资料
const props = defineProps<{
  userProfile: UserProfile | null
}>()
const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()

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
    console.error('时间格式化失败', error)
    return '--'
  }
}

// 计算登录方式
const loginMethod = computed(() => {
  if (!props.userProfile) return '--'
  
  const hasAccount = props.userProfile.hasPassword
  const hasPhone = !!props.userProfile.phone
  
  if (hasAccount && hasPhone) {
    return t('profile.loginByAccountAndPhone')
  } else if (hasAccount) {
    return t('profile.loginByAccount')
  } else if (hasPhone) {
    return t('profile.loginByPhone')
  } else {
    return '--'
  }
})

// 计算密码状态
const passwordStatus = computed(() => props.userProfile ? t(props.userProfile.hasPassword ? 'profile.passwordSet' : 'profile.passwordNotSet') : '--')
const passwordAction = computed(() => t(props.userProfile?.hasPassword ? 'profile.changePassword' : 'profile.setPassword'))

// 计算最近更新时间
const passwordUpdatedAt = computed(() => {
  return formatDateTime(props.userProfile?.passwordUpdatedAt)
})

// ==================== 修改密码弹窗相关 ====================
// 使用父组件 provide 的弹窗状态，与个人资料卡片“修改密码”按钮共用同一弹窗
const injectedDialogVisible = inject<Ref<boolean>>('changePasswordDialogVisible')
const changeDialogVisible = injectedDialogVisible || ref(false)
const formLoading = ref(false)
const form = ref({
  code: '',
  newPassword: '',
  confirmPassword: ''
})

const isSendingCode = ref(false)
const { countdown, start: startCountdown } = useSmsCountdown()
watch(() => form.value.code, value => { form.value.code = value.replace(/\D/g, '').slice(0, 6) })

const canSendCode = computed(() => {
  return !!props.userProfile?.phone && !isSendingCode.value && countdown.value === 0
})

// 验证码已填、两个密码已填且一致、新密码长度 6-32 时才允许点击确认修改
const canConfirmChangePassword = computed(() => {
  const code = form.value.code.trim()
  const newPwd = form.value.newPassword
  const confirmPwd = form.value.confirmPassword
  if (!/^[0-9]{6}$/.test(code) || !newPwd || !confirmPwd) return false
  if (form.value.newPassword === props.userProfile?.phone) return false
  if (newPwd !== confirmPwd) return false
  if (newPwd.length < 6 || newPwd.length > 32) return false
  return true
})

// 确认密码已输入但与新密码不一致时显示提示
const isPasswordMismatch = computed(() => {
  const newPwd = form.value.newPassword
  const confirmPwd = form.value.confirmPassword
  return confirmPwd.length > 0 && newPwd !== confirmPwd
})

const openChangePasswordDialog = () => {
  if (!props.userProfile?.phone) {
    ElMessage.error(t('profile.noPhoneChangePassword'))
    return
  }
  changeDialogVisible.value = true
}

const resetForm = () => {
  form.value.code = ''
  form.value.newPassword = ''
  form.value.confirmPassword = ''
}

const handleSendCode = async () => {
  if (!canSendCode.value) return
  if (!props.userProfile?.phone) {
    ElMessage.error(t('profile.noPhone'))
    return
  }
  
  try {
    isSendingCode.value = true
    const response = await sendSmsCode({ phone: props.userProfile.phone, scene: 'CHANGE_PASSWORD' })
    
    ElMessage.success(t('profile.codeSent'))
    
    startCountdown(response.data.retryAfterSeconds)
  } catch (error: any) {
    console.error('发送验证码失败', error)
    ElMessage.error(error.message || t('profile.codeSendFailed'))
  } finally {
    isSendingCode.value = false
  }
}

const handleConfirmChangePassword = async () => {
  if (formLoading.value) return
  if (!props.userProfile?.phone) {
    ElMessage.error(t('profile.noPhoneCannotChange'))
    return
  }
  
  if (!/^[0-9]{6}$/.test(form.value.code)) {
    ElMessage.error(t('profile.codeRequired'))
    return
  }
  if (!form.value.newPassword.trim()) {
    ElMessage.error(t('profile.newPasswordRequired'))
    return
  }
  if (form.value.newPassword.length < 6 || form.value.newPassword.length > 32) {
    ElMessage.error(t('profile.passwordLengthInvalid'))
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    ElMessage.error(t('profile.passwordMismatch'))
    return
  }
  if (form.value.newPassword === props.userProfile.phone) {
    ElMessage.error(t('profile.passwordCannotBePhone'))
    return
  }
  
  try {
    formLoading.value = true
    await changePassword({
      code: form.value.code,
      newPassword: form.value.newPassword
    })
    
    ElMessage.success(t('profile.passwordChangeSuccess'))
    changeDialogVisible.value = false
    resetForm()
    userStore.clearLoginInfo()
    await router.replace('/login')
  } catch (error: any) {
    console.error('修改密码失败', error)
    ElMessage.error(error.message || t('profile.passwordChangeFailed'))
  } finally {
    formLoading.value = false
  }
}

</script>

<template>
  <div class="security-section">
    <div class="section-header">
      <h3 class="section-title">{{ t('profile.accountSecurity') }}</h3>
    </div>
    
    <div class="security-content">
      <div class="security-info">
        <div class="info-item">
          <span class="info-label">{{ t('profile.loginMethod') }}</span>
          <span class="info-value">{{ loginMethod }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ t('profile.passwordStatus') }}</span>
          <span class="info-value">{{ passwordStatus }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ t('profile.lastUpdated') }}</span>
          <span class="info-value">{{ passwordUpdatedAt }}</span>
        </div>
      </div>
      
      <div class="security-notice">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/>
          <path d="M8 5V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="8" cy="10.5" r="0.5" fill="currentColor"/>
        </svg>
        <span>{{ t('profile.securityNotice') }}</span>
      </div>
      
    </div>

    <!-- 修改密码弹窗（灰蓝克制风，自定义样式） -->
    <transition name="cp-fade">
      <div v-if="changeDialogVisible" class="cp-mask">
        <div class="cp-dialog">
          <div class="cp-dialog-header">
            <div class="cp-title-area">
              <h3 class="cp-title">{{ passwordAction }}</h3>
              <p class="cp-subtitle">{{ t('profile.passwordDialogSubtitle') }}</p>
            </div>
            <button class="cp-close-btn" @click="changeDialogVisible = false" :disabled="formLoading" :aria-label="t('common.cancel')">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <div class="dialog-row">
              <div class="dialog-label">{{ t('profile.boundPhone') }}</div>
              <div class="dialog-value-pill">
                <span class="pill-dot"></span>
                <span class="pill-text">
                  {{ props.userProfile?.phone || t('profile.unboundPhone') }}
                </span>
              </div>
            </div>

            <div class="dialog-row">
              <div class="dialog-label">{{ t('profile.smsCode') }}</div>
              <div class="dialog-code-group">
                <input
                  v-model="form.code"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  class="dialog-input"
                  maxlength="6"
                  :placeholder="t('profile.codePlaceholder')"
                />
                <button
                  type="button"
                  class="dialog-code-btn"
                  :class="{ disabled: !canSendCode }"
                  :disabled="!canSendCode"
                  @click="handleSendCode"
                >
                  <span v-if="isSendingCode">{{ t('profile.sending') }}</span>
                  <span v-else-if="countdown > 0">{{ t('profile.retryAfterSeconds', { seconds: countdown }) }}</span>
                  <span v-else>{{ t('profile.getCode') }}</span>
                </button>
              </div>
            </div>

            <div class="dialog-row">
              <div class="dialog-label">{{ t('profile.newPassword') }}</div>
              <input
                v-model="form.newPassword"
                class="dialog-input"
                type="password"
                :placeholder="t('profile.newPasswordPlaceholder')"
              />
              <p v-if="form.newPassword && form.newPassword === props.userProfile?.phone" class="dialog-row-hint error">
                {{ t('profile.passwordCannotBePhone') }}
              </p>
            </div>

            <div class="dialog-row">
              <div class="dialog-label">{{ t('profile.confirmPassword') }}</div>
              <input
                v-model="form.confirmPassword"
                class="dialog-input"
                :class="{ 'dialog-input--error': isPasswordMismatch }"
                type="password"
                :placeholder="t('profile.confirmPasswordPlaceholder')"
              />
              <p v-if="isPasswordMismatch" class="dialog-row-hint error">
                {{ t('profile.passwordMismatch') }}
              </p>
            </div>

            <div class="dialog-safe-tip">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2" />
                <path d="M8 4.8V8.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
                <circle cx="8" cy="11.3" r="0.55" fill="currentColor" />
              </svg>
              <span>{{ t('profile.passwordSafeTip') }}</span>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="dialog-btn cancel" @click="changeDialogVisible = false" :disabled="formLoading">
              {{ t('common.cancel') }}
            </button>
            <button
              class="dialog-btn primary"
              @click="handleConfirmChangePassword"
              :disabled="formLoading || !canConfirmChangePassword"
            >
              {{ formLoading ? t('profile.submit') : t('profile.confirmChange') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.security-section {
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

.security-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.security-info {
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
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
  text-align: right;
}

.security-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
}

.security-notice svg {
  color: #f59e0b;
  flex-shrink: 0;
  margin-top: 1px;
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

.cp-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.cp-dialog {
  width: 440px;
  max-width: 92vw;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 18px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cp-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.cp-title-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cp-title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.cp-subtitle {
  margin: 0;
  font-size: 15px;
  color: #6b7280;
}

.cp-close-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  color: #9ca3af;
  padding: 4px;
  border-radius: 999px;
}

.cp-close-btn:hover {
  background: rgba(148, 163, 184, 0.16);
  color: #4b5563;
}

.cp-close-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.cp-fade-enter-active,
.cp-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.cp-fade-enter-from,
.cp-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-row-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.3;
}

.dialog-row-hint.error {
  color: #b91c1c;
}

.dialog-input--error {
  border-color: #dc2626 !important;
}

.dialog-input--error:focus {
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
}

.dialog-label {
  font-size: 14px;
  color: #737373;
}

.dialog-value {
  font-size: 14px;
  color: #1f2933;
  font-weight: 500;
}

.dialog-value-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  border: 1px solid rgba(148, 163, 184, 0.4);
  max-width: 100%;
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #10b981;
  flex-shrink: 0;
}

.pill-text {
  font-size: 14px;
  color: #111827;
}

.dialog-code-group {
  display: flex;
  gap: 8px;
}

/* 验证码、新密码、确认密码三个输入框统一高度 */
.dialog-input {
  flex: 1;
  min-height: 42px;
  height: 42px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.65);
  font-size: 15px;
  box-sizing: border-box;
}

.dialog-input:focus {
  outline: none;
  border-color: #111827;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.08);
}

.dialog-code-btn {
  height: 42px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.82);
  background: #111827;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #f9fafb;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
}

.dialog-code-btn.disabled,
.dialog-code-btn:disabled {
  cursor: not-allowed;
  background: #e5e7eb;
  color: #9ca3af;
  border-color: rgba(148, 163, 184, 0.8);
  box-shadow: none;
}

.dialog-code-btn:not(.disabled):hover {
  background: #020617;
  border-color: #020617;
}

.dialog-tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.dialog-safe-tip {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #f3f4ff;
  border: 1px solid rgba(129, 140, 248, 0.3);
  color: #4b5563;
  font-size: 12px;
}

.dialog-safe-tip svg {
  color: #6366f1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-btn {
  min-width: 84px;
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
}

.dialog-btn.cancel {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.1);
  color: #4b5563;
}

.dialog-btn.cancel:hover {
  border-color: rgba(0, 0, 0, 0.2);
}

.dialog-btn.primary {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

.dialog-btn.primary:hover {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.dialog-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
