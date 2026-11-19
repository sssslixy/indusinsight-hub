<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { accountLogin, phoneLogin, sendSmsCode } from '@/api/modules/auth'
import logoImage from '@/assets/logo/logo_buaa.png'

import { useSmsCountdown } from '@/composables/useSmsCountdown'

type LoginType = 'account' | 'phone'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const loginType = ref<LoginType>('account')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isSendingCode = ref(false)
const uiTimers = new Set<ReturnType<typeof setTimeout>>()
let disposed = false
const scheduleUi = (callback: () => void, delay: number) => {
  if (disposed) return
  const timer = setTimeout(() => { uiTimers.delete(timer); callback() }, delay)
  uiTimers.add(timer)
}
onUnmounted(() => { disposed = true; uiTimers.forEach(clearTimeout); uiTimers.clear() })

const accountForm = ref({
  account: '',
  password: '',
  remember: false
})

const phoneForm = ref({
  phone: '',
  code: '',
  remember: false
})

const { countdown, start: startCountdown } = useSmsCountdown()
watch(() => phoneForm.value.phone, () => { phoneForm.value.code = '' })
watch(() => phoneForm.value.code, value => { phoneForm.value.code = value.replace(/\D/g, '').slice(0, 6) })

const isPhoneValid = computed(() => {
  return /^1[3-9]\d{9}$/.test(phoneForm.value.phone)
})

const isAccountLoginEnabled = computed(() => {
  return accountForm.value.account.trim() !== '' &&
         accountForm.value.password.trim() !== ''
})

const isPhoneLoginEnabled = computed(() => {
  return phoneForm.value.phone.trim() !== '' &&
         isPhoneValid.value &&
         /^[0-9]{6}$/.test(phoneForm.value.code)
})

const isCodeBtnEnabled = computed(() => {
  return isPhoneValid.value && countdown.value === 0 && !isSendingCode.value
})

const switchLoginType = (type: LoginType) => {
  loginType.value = type
  errorMessage.value = ''
  successMessage.value = ''
}

const showError = (message: string) => {
  errorMessage.value = message
  successMessage.value = ''
  scheduleUi(() => {
    errorMessage.value = ''
  }, 3000)
}

const showSuccess = (message: string) => {
  successMessage.value = message
  errorMessage.value = ''
  scheduleUi(() => {
    successMessage.value = ''
  }, 3000)
}

const handleAccountLogin = async () => {
  if (!isAccountLoginEnabled.value || isLoading.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const response = await accountLogin({
      account: accountForm.value.account,
      password: accountForm.value.password
    })

    if (accountForm.value.remember) {
      localStorage.setItem('savedAccount', accountForm.value.account)
      localStorage.setItem('rememberAccount', 'true')
    } else {
      localStorage.removeItem('savedAccount')
      localStorage.removeItem('rememberAccount')
    }

    userStore.setLoginInfo(response.data.token, response.data.userInfo)

    showSuccess(t('login.success'))
    scheduleUi(() => {
      router.push(response.data.userInfo.account === 'admin' ? '/admin/announcements' : '/dashboard')
    }, 500)
  } catch (error: any) {
    console.error('Account login failed', error)
    showError(error.message || t('login.accountFailed'))
  } finally {
    isLoading.value = false
  }
}

const handlePhoneLogin = async () => {
  if (!isPhoneLoginEnabled.value || isLoading.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const response = await phoneLogin({
      phone: phoneForm.value.phone,
      code: phoneForm.value.code
    })

    if (phoneForm.value.remember) {
      localStorage.setItem('savedPhone', phoneForm.value.phone)
      localStorage.setItem('rememberPhone', 'true')
    } else {
      localStorage.removeItem('savedPhone')
      localStorage.removeItem('rememberPhone')
    }

    userStore.setLoginInfo(response.data.token, response.data.userInfo)

    if (response.data.isNewUser) {
      showSuccess(t('login.newUserSuccess'))
    } else {
      showSuccess(t('login.success'))
    }

    scheduleUi(() => {
      router.push(response.data.userInfo.account === 'admin' ? '/admin/announcements' : '/dashboard')
    }, 500)
  } catch (error: any) {
    console.error('Phone login failed', error)
    showError(error.message || t('login.phoneFailed'))
  } finally {
    isLoading.value = false
  }
}

const sendCode = async () => {
  if (!isCodeBtnEnabled.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isSendingCode.value = true

  try {
    const response = await sendSmsCode({
      phone: phoneForm.value.phone,
      scene: 'LOGIN'
    })

    startCountdown(response.data.retryAfterSeconds)

    showSuccess(t('login.codeSent'))
  } catch (error: any) {
    console.error('Failed to send verification code', error)
    showError(error.message || t('login.codeSendFailed'))
  } finally {
    isSendingCode.value = false
  }
}

onMounted(() => {
  const rememberAccount = localStorage.getItem('rememberAccount')
  if (rememberAccount === 'true') {
    const savedAccount = localStorage.getItem('savedAccount')
    if (savedAccount) {
      accountForm.value.account = savedAccount
      accountForm.value.remember = true
    }
  }

  const rememberPhone = localStorage.getItem('rememberPhone')
  if (rememberPhone === 'true') {
    const savedPhone = localStorage.getItem('savedPhone')
    if (savedPhone) {
      phoneForm.value.phone = savedPhone
      phoneForm.value.remember = true
    }
  }
})
</script>

<template>
  <div class="login-page">
    <div class="page-container">
      <div class="left-section">
        <div class="brand-area">
          <div class="brand-header">
            <img :src="logoImage" alt="Logo" class="brand-logo" />
            <h1 class="brand-title">{{ t('profile.systemName') }}</h1>
          </div>
          <p class="brand-team">@{{ t('profile.institutionName') }}</p>
        </div>
      </div>

      <div class="right-section">
        <div class="login-card">
          <div class="login-header">
            <h2 class="login-title">{{ t('login.title') }}</h2>
            <p class="login-subtitle">{{ t('login.subtitle') }}</p>
          </div>

          <div v-if="errorMessage" class="message error-message">
            {{ errorMessage }}
          </div>
          <div v-if="successMessage" class="message success-message">
            {{ successMessage }}
          </div>

          <div class="login-tabs">
            <button
              class="tab-item"
              :class="{ active: loginType === 'account' }"
              @click="switchLoginType('account')"
            >
              <span class="tab-text">{{ t('login.accountLogin') }}</span>
            </button>
            <button
              class="tab-item"
              :class="{ active: loginType === 'phone' }"
              @click="switchLoginType('phone')"
            >
              <span class="tab-text">{{ t('login.phoneLogin') }}</span>
            </button>
          </div>

          <form v-if="loginType === 'account'" class="login-form" @submit.prevent="handleAccountLogin">
            <div class="form-item">
              <label class="form-label">{{ t('login.account') }}</label>
              <input
                v-model="accountForm.account"
                type="text"
                class="form-input"
                :placeholder="t('login.accountPlaceholder')"
                :disabled="isLoading"
              />
            </div>
            <div class="form-item">
              <label class="form-label">{{ t('login.password') }}</label>
              <input
                v-model="accountForm.password"
                type="password"
                class="form-input"
                :placeholder="t('login.passwordPlaceholder')"
                :disabled="isLoading"
              />
            </div>
            <div class="form-options">
              <label class="checkbox-label">
                <input v-model="accountForm.remember" type="checkbox" class="checkbox" :disabled="isLoading" />
                <span>{{ t('login.rememberMe') }}</span>
              </label>
            </div>
            <button
              type="submit"
              class="login-btn"
              :disabled="isLoading || !isAccountLoginEnabled"
            >
              {{ isLoading ? t('login.loggingIn') : t('common.login') }}
            </button>
          </form>

          <form v-if="loginType === 'phone'" class="login-form" @submit.prevent="handlePhoneLogin">
            <p class="registration-notice">{{ t('login.autoRegisterNotice') }}</p>
            <div class="form-item">
              <label class="form-label">{{ t('login.phone') }}</label>
              <input
                v-model="phoneForm.phone"
                :readonly="isSendingCode"
                type="tel"
                class="form-input"
                :class="{ 'input-error': phoneForm.phone && !isPhoneValid }"
                :placeholder="t('login.phonePlaceholder')"
                maxlength="11"
                :disabled="isLoading"
              />
              <span v-if="phoneForm.phone && !isPhoneValid" class="error-hint">
                {{ t('login.invalidPhone') }}
              </span>
            </div>
            <div class="form-item">
              <label class="form-label">{{ t('login.code') }}</label>
              <div class="code-input-group">
                <input
                  v-model="phoneForm.code"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  type="text"
                  class="form-input"
                  :placeholder="t('login.codePlaceholder')"
                  maxlength="6"
                  :disabled="isLoading"
                />
                <button
                  type="button"
                  class="code-btn"
                  :disabled="!isCodeBtnEnabled"
                  @click="sendCode"
                >
                  <span v-if="isSendingCode">{{ t('login.sending') }}</span>
                  <span v-else-if="countdown > 0">{{ t('login.retryAfterSeconds', { seconds: countdown }) }}</span>
                  <span v-else>{{ t('login.getCode') }}</span>
                </button>
              </div>
            </div>
            <div class="form-options">
              <label class="checkbox-label">
                <input v-model="phoneForm.remember" type="checkbox" class="checkbox" :disabled="isLoading" />
                <span>{{ t('login.rememberMe') }}</span>
              </label>
            </div>
            <button
              type="submit"
              class="login-btn"
              :disabled="isLoading || !isPhoneLoginEnabled"
            >
              {{ isLoading ? t('login.loggingIn') : t('common.login') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.registration-notice { margin: 0 0 16px; color: #666; font-size: 13px; line-height: 1.6; }
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #fafafa;
}

.page-container {
  width: 100%;
  max-width: 1280px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 64px;
  align-items: center;
}

.left-section {
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.brand-area {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 900px;
}

.brand-header {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand-logo {
  height: 52px;
  width: auto;
  flex-shrink: 0;
}

.brand-title {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.brand-team {
  font-size: 13px;
  font-weight: 400;
  color: #737373;
  margin: 0;
  line-height: 1.6;
  white-space: nowrap;
  padding-left: calc(52px + 18px);
}

.right-section {
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 48px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.login-header {
  margin-bottom: 32px;
  text-align: center;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.login-subtitle {
  font-size: 14px;
  line-height: 1.6;
  color: #737373;
  margin: 0;
}

.message {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 20px;
  text-align: center;
}

.error-message {
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: #dc2626;
}

.success-message {
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  color: #16a34a;
}

.login-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 4px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 28px;
}

.tab-item {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #737373;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-item:hover {
  color: #525252;
}

.tab-item.active {
  background: #ffffff;
  color: #1a1a1a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.tab-text {
  line-height: 1;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #525252;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  font-size: 14px;
  color: #1a1a1a;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input::placeholder {
  color: #a3a3a3;
}

.form-input:hover:not(:disabled) {
  border-color: rgba(0, 0, 0, 0.16);
}

.form-input:focus {
  outline: none;
  border-color: #2d2d2d;
  box-shadow: 0 0 0 3px rgba(45, 45, 45, 0.06);
}

.form-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.form-input.input-error {
  border-color: #dc2626;
}

.form-input.input-error:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.error-hint {
  font-size: 12px;
  color: #dc2626;
  margin-top: -4px;
}

.code-input-group {
  display: flex;
  gap: 10px;
}

.code-input-group .form-input {
  flex: 1;
}

.code-btn {
  padding: 0 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.code-btn:hover:not(:disabled) {
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.code-btn:disabled {
  background: #f5f5f5;
  color: #a3a3a3;
  border-color: rgba(0, 0, 0, 0.06);
  cursor: not-allowed;
}

.form-options {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
  transition: color 0.15s ease;
}

.checkbox-label:hover {
  color: #1a1a1a;
}

.checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
}

.login-btn {
  width: 100%;
  height: 44px;
  padding: 0 24px;
  background: #2d2d2d;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
  margin-top: 8px;
}

.login-btn:hover:not(:disabled) {
  background: #3a3a3a;
}

.login-btn:disabled {
  background: #d4d4d4;
  color: #a3a3a3;
  cursor: not-allowed;
}

@media (max-width: 1279px) {
  .page-container {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .left-section {
    order: 2;
  }

  .right-section {
    order: 1;
  }
}

@media (max-width: 768px) {
  .login-page {
    padding: 24px;
  }

  .brand-title {
    font-size: 20px;
  }

  .brand-team {
    white-space: normal;
    overflow-wrap: anywhere;
    padding-left: calc(44px + 16px);
  }

  .brand-header {
    gap: 16px;
  }

  .brand-logo {
    height: 44px;
  }

  .login-card {
    padding: 40px 32px;
  }

  .login-title {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
  }

  .brand-logo {
    height: 44px;
  }

  .brand-title {
    font-size: 18px;
  }

  .brand-team {
    padding-left: calc(44px + 14px);
  }

  .brand-header {
    gap: 14px;
  }

  .login-title {
    font-size: 22px;
  }
}
</style>
