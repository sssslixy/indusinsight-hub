<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAgentDetail, getAgentEditDetail } from '@/api/agent'
import { resolveAgentSystemIconSrc } from '@/constants/systemAssetIcons'
import icon1 from '@/assets/icon/智能体图标1.png'

interface Props {
  src?: string | null
  alt?: string
  size?: number
  agentId?: number | null
  enableEditFallback?: boolean
  fallbackSource?: 'edit' | 'public'
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: '',
  size: 76,
  agentId: null,
  enableEditFallback: false,
  fallbackSource: 'edit',
})

const { t } = useI18n()
const imageLoadFailed = ref(false)
const retrySrc = ref('')
const recoveryAttempted = ref(false)
const recovering = ref(false)
const resolvedIconCache = new Map<number, string>()
let isUnmounted = false

const resolvedSrc = computed(() => resolveAgentSystemIconSrc(props.src))
const currentSource = computed(() => retrySrc.value || resolvedSrc.value || '')
const resolvedAlt = computed(() => props.alt || t('common.agentIconAlt'))
const displayIcon = computed(() => {
  if (!currentSource.value || imageLoadFailed.value) {
    return icon1
  }
  return currentSource.value
})

watch(
  () => props.src,
  (newSrc, oldSrc) => {
    if (newSrc !== oldSrc) {
      imageLoadFailed.value = false
      recoveryAttempted.value = false
      recovering.value = false
      retrySrc.value = ''
    }
  },
)

const handleError = async () => {
  if (isUnmounted) return
  if (!currentSource.value || currentSource.value === icon1) {
    return
  }
  if (!props.src || !props.src.startsWith('http')) {
    imageLoadFailed.value = true
    return
  }
  if (
    props.enableEditFallback &&
    !recoveryAttempted.value &&
    !recovering.value &&
    props.agentId != null &&
    props.agentId > 0
  ) {
    const cached = resolvedIconCache.get(props.agentId)
    if (cached && cached !== currentSource.value) {
      if (isUnmounted) return
      retrySrc.value = cached
      imageLoadFailed.value = false
      recoveryAttempted.value = true
      return
    }
    recoveryAttempted.value = true
    recovering.value = true
    try {
      const response =
        props.fallbackSource === 'public'
          ? await getAgentDetail(props.agentId)
          : await getAgentEditDetail(props.agentId)
      if (isUnmounted) return
      const latestIcon = response?.data?.agentIcon
      if (response.code === 0 && latestIcon && latestIcon !== currentSource.value) {
        resolvedIconCache.set(props.agentId, latestIcon)
        retrySrc.value = latestIcon
        imageLoadFailed.value = false
        return
      }
    } catch (error) {
      const reqErr = error as { code?: number; message?: string }
      if (reqErr?.code === 4003 || reqErr?.code === 4004 || reqErr?.code === 401) {
        imageLoadFailed.value = true
      }
      console.warn('智能体图标兜底重拉失败:', error)
    } finally {
      if (!isUnmounted) recovering.value = false
    }
  }
  imageLoadFailed.value = true
}

onBeforeUnmount(() => {
  isUnmounted = true
})
</script>

<template>
  <img
    :src="displayIcon"
    :alt="resolvedAlt"
    :width="size"
    :height="size"
    class="agent-icon"
    @error="handleError"
  />
</template>

<style scoped>
.agent-icon {
  object-fit: cover;
  border-radius: 10px;
  display: block;
}
</style>
