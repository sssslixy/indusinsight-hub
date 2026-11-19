<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getAdminAccount, logoutAdmin, AdminApiError } from '@/api/admin'
import LanguageToggle from '@/components/navigation/LanguageToggle.vue'
import HeaderIcon from '@/components/navigation/HeaderIcon.vue'
import logo from '@/assets/logo/logo_buaa.png'
import './admin.css'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const user = useUserStore()
const verified = ref(false)
const loading = ref(true)
const leaving = ref(false)
let disposed = false
async function verify() {
  loading.value = true
  const token = user.token
  try {
    const account = await getAdminAccount()
    if (disposed || token !== user.token || !token) return
    user.setLoginInfo(token, {
      ...account,
      phone: null,
      avatar: user.userInfo?.avatar || '/default-avatar.svg',
    })
    verified.value = true
  } catch (error) {
    if (error instanceof AdminApiError && [401, 403].includes(error.status)) return
    verified.value = false
  } finally {
    loading.value = false
  }
}
function expired() {
  ElMessage.warning(t('admin.expired'))
  void router.replace('/login')
}
function forbidden() {
  ElMessage.warning(t('admin.forbidden'))
  void router.replace('/dashboard')
}
async function logout() {
  if (leaving.value) return
  leaving.value = true
  const token = user.token
  // Resolve any editor leave guard before revoking the session.
  await router.push('/login')
  if (router.currentRoute.value.path !== '/login') {
    leaving.value = false
    return
  }
  try {
    await logoutAdmin()
  } catch {
    ElMessage.warning(t('admin.logoutFailed'))
  } finally {
    if (user.token === token) user.clearLoginInfo()
    leaving.value = false
  }
}
onMounted(() => {
  window.addEventListener('admin-session-expired', expired)
  window.addEventListener('admin-access-denied', forbidden)
  void verify()
})
onUnmounted(() => {
  disposed = true
  window.removeEventListener('admin-session-expired', expired)
  window.removeEventListener('admin-access-denied', forbidden)
})
</script>

<template>
  <div class="admin-app">
    <header class="adm-header">
      <div class="adm-header-inner">
        <RouterLink class="adm-brand" to="/admin/announcements"
          ><img :src="logo" alt="Logo" /><span>{{ t('admin.console') }}</span
          ><small>ADMIN</small></RouterLink
        >
        <nav class="adm-nav" :aria-label="t('admin.console')">
          <RouterLink
            to="/admin/announcements"
            :class="{ 'router-link-active': route.path.startsWith('/admin/announcements') }"
            >{{ t('admin.announcements') }}</RouterLink
          >
          <RouterLink to="/admin/security">{{ t('admin.security') }}</RouterLink>
        </nav>
        <div class="adm-header-actions">
          <LanguageToggle />
          <span class="adm-account" :aria-label="`${t('admin.account')}: admin`">
            <span>admin</span>
          </span>
          <button
            class="adm-logout"
            :disabled="leaving"
            :aria-label="t('admin.logout')"
            :title="t('admin.logout')"
            @click="logout"
          >
            <HeaderIcon name="logout" :size="17" />
            <span class="adm-logout-label">{{ t('admin.logout') }}</span>
          </button>
        </div>
      </div>
    </header>
    <main class="adm-main">
      <div v-if="loading" class="adm-state" role="status">
        <span class="adm-spinner" />{{ t('admin.verifying') }}
      </div>
      <RouterView v-else-if="verified" />
      <div v-else class="adm-state">
        <h2>{{ t('admin.verificationFailed') }}</h2>
        <p>{{ t('admin.verificationHint') }}</p>
        <button class="adm-button" @click="verify">{{ t('admin.retry') }}</button>
      </div>
    </main>
    <footer class="adm-footer">
      {{ t('admin.console') }} <span>·</span> {{ t('admin.tagline') }}
    </footer>
  </div>
</template>
