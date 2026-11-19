<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getUserProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'

interface Props {
  src?: string | null
  alt?: string
  size?: number
  /**
   * 旁侧已有用户名等可见文案时设为 true：不展示 img 的 alt，避免加载异常时出现竖排占位文字，并 aria-hidden 避免重复朗读
   */
  decorative?: boolean
  /**
   * 当头像加载失败时，是否自动重拉一次 /api/user/profile 获取新签名兜底
   */
  enableProfileFallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: '',
  size: 40,
  decorative: false,
  enableProfileFallback: false
})

const { t } = useI18n()
const imageLoadFailed = ref(false)
const retrySrc = ref('')
const recoveryAttempted = ref(false)
const recovering = ref(false)
const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e5e7eb"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 8.954-25 20v10h50V70c0-11.046-11.193-20-25-20z" fill="%239ca3af"/%3E%3C/svg%3E'
const userStore = useUserStore()

const currentSource = computed(() => retrySrc.value || props.src || '')

const displayAvatar = computed(() => {
  if (!currentSource.value) {
    return defaultAvatar
  }
  if (imageLoadFailed.value) {
    return defaultAvatar
  }
  return currentSource.value
})

const imgAlt = computed(() => (props.decorative ? '' : props.alt || t('common.avatarAlt')))

const wrapperStyle = computed(() => {
  const s = `${props.size}px`
  return {
    width: s,
    height: s,
    minWidth: s,
    minHeight: s
  }
})

watch(() => props.src, (newSrc, oldSrc) => {
  if (newSrc !== oldSrc) {
    imageLoadFailed.value = false
    recoveryAttempted.value = false
    recovering.value = false
    retrySrc.value = ''
  }
})

const handleError = async () => {
  if (!currentSource.value || currentSource.value === defaultAvatar) {
    return
  }

  if (props.enableProfileFallback && !recoveryAttempted.value && !recovering.value) {
    recoveryAttempted.value = true
    recovering.value = true
    try {
      const response = await getUserProfile()
      const latestAvatar = response.data?.avatar
      if (response.code === 0 && latestAvatar && latestAvatar !== currentSource.value) {
        retrySrc.value = latestAvatar
        imageLoadFailed.value = false
        userStore.updateProfile({ avatar: latestAvatar })
        return
      }
    } catch (error) {
      console.warn('头像兜底重拉 profile 失败:', error)
    } finally {
      recovering.value = false
    }
  }

  if (currentSource.value !== defaultAvatar) {
    imageLoadFailed.value = true
  }
}
</script>

<template>
  <span
    class="avatar-wrapper"
    :style="wrapperStyle"
    :aria-hidden="decorative ? true : undefined"
  >
    <img
      :src="displayAvatar"
      :alt="imgAlt"
      :width="size"
      :height="size"
      class="avatar"
      decoding="async"
      @error="handleError"
    />
  </span>
</template>

<style scoped>
.avatar-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  vertical-align: middle;
  background: #e5e7eb;
}

.avatar {
  border-radius: 50%;
  object-fit: cover;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
