<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { backToTarget } from '@/router/profileNavigation'

const props = defineProps<{ destination?: string; label?: string; navigate?: () => void }>()

const router = useRouter()
const { t } = useI18n()

const handleBack = () => {
  if (props.navigate) {
    props.navigate()
    return
  }
  if (props.destination) {
    backToTarget(router, props.destination)
    return
  }
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/dashboard')
}
</script>

<template>
  <button class="back-button" type="button" @click="handleBack">
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M12 7.5H3M3 7.5L6.5 4M3 7.5L6.5 11"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    {{ label || t('common.back') }}
  </button>
</template>

<style scoped>
.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: 1px solid rgba(0, 0, 0, 0.11);
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s ease;
}

.back-button:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #374151;
  color: #1f2937;
}
</style>
