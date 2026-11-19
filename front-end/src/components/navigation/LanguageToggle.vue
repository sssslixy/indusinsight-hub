<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { toggleLocale } from '@/i18n'
import HeaderIcon from './HeaderIcon.vue'

const emit = defineEmits<{ change: [] }>()
const { t, locale } = useI18n()
const toEnglish = computed(() => locale.value === 'zh-CN')
const label = computed(() =>
  t(toEnglish.value ? 'locale.switchToEnglish' : 'locale.switchToChinese'),
)
const description = computed(() =>
  t(toEnglish.value ? 'locale.switchToEnglishLabel' : 'locale.switchToChineseLabel'),
)

function changeLanguage() {
  emit('change')
  const nextLocale = toggleLocale()
  ElMessage.success(
    t(nextLocale === 'en-US' ? 'locale.changedToEnglish' : 'locale.changedToChinese'),
  )
}
</script>

<template>
  <button
    class="language-toggle"
    type="button"
    :aria-label="description"
    :title="description"
    @click="changeLanguage"
  >
    <HeaderIcon name="globe" />
    <span :lang="toEnglish ? 'en' : 'zh-CN'">{{ label }}</span>
  </button>
</template>

<style scoped>
.language-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  min-height: 36px;
  padding: 8px 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #525252;
  font-size: var(--header-nav-font-size, 14px);
  font-weight: 500;
  line-height: var(--header-nav-line-height, 20px);
  white-space: nowrap;
  cursor: pointer;
  transition: color 150ms ease;
}
.language-toggle:hover {
  color: var(--app-color-text-primary);
}
.language-toggle:focus-visible {
  outline: 2px solid var(--app-color-text-primary);
  outline-offset: 3px;
}
@media (max-width: 768px) {
  .language-toggle {
    min-width: 44px;
    min-height: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .language-toggle {
    transition: none;
  }
}
</style>
