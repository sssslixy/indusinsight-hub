<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { changeAdminPassword } from '@/api/admin'
import { useUserStore } from '@/stores/user'
const { t } = useI18n()
const router = useRouter(),
  user = useUserStore()
const current = ref(''),
  next = ref(''),
  confirm = ref(''),
  saving = ref(false),
  error = ref('')
const valid = computed(
  () =>
    !!current.value.trim() &&
    !!next.value.trim() &&
    next.value.length >= 6 &&
    next.value.length <= 32 &&
    next.value !== current.value &&
    confirm.value === next.value,
)
async function save() {
  if (!valid.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await changeAdminPassword(current.value, next.value)
    current.value = ''
    next.value = ''
    confirm.value = ''
    user.clearLoginInfo()
    ElMessage.success(t('admin.passwordChanged'))
    await router.replace('/login')
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('admin.failed')
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <div class="adm-page">
    <section class="adm-page-heading">
      <div>
        <div class="adm-eyebrow">{{ t('admin.console') }}</div>
        <h1>{{ t('admin.securityTitle') }}</h1>
        <p>{{ t('admin.securitySubtitle') }}</p>
      </div>
    </section>
    <div class="adm-security-grid">
      <aside class="adm-card adm-account-card">
        <div class="adm-avatar" aria-hidden="true">A</div>
        <h2>admin</h2>
        <p>{{ t('admin.account') }}</p>
        <span class="adm-badge">{{ t('admin.accountHint') }}</span>
      </aside>
      <form class="adm-card adm-password-card" @submit.prevent="save">
        <h2>{{ t('admin.passwordTitle') }}</h2>
        <p class="adm-hint">{{ t('admin.passwordHint') }}</p>
        <div v-if="error" class="adm-error" role="alert">{{ error }}</div>
        <label for="current-password">{{ t('admin.currentPassword') }}</label
        ><input
          id="current-password"
          v-model="current"
          type="password"
          autocomplete="current-password"
          :disabled="saving"
          required
        /><label for="new-password">{{ t('admin.newPassword') }}</label
        ><input
          id="new-password"
          v-model="next"
          type="password"
          autocomplete="new-password"
          minlength="6"
          maxlength="32"
          :disabled="saving"
          required
        />
        <p class="adm-hint">{{ t('admin.passwordRule') }}</p>
        <label for="confirm-password">{{ t('admin.confirmPassword') }}</label
        ><input
          id="confirm-password"
          v-model="confirm"
          type="password"
          autocomplete="new-password"
          maxlength="32"
          :disabled="saving"
          required
        />
        <p v-if="confirm && confirm !== next" class="adm-field-error">
          {{ t('admin.passwordMismatch') }}
        </p>
        <div class="adm-password-submit">
          <button class="adm-button adm-primary" :disabled="!valid || saving">
            {{ t(saving ? 'admin.saving' : 'admin.changePassword') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
