<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  manifestJsonText: string
}>()

const { t } = useI18n()
const lines = computed(() => props.manifestJsonText.split('\n').length)
</script>

<template>
  <div class="card">
    <header class="hd">
      <h2 class="hd__title">{{ t('create.manifest.previewTitle') }}</h2>
      <p class="hd__sub">{{ t('create.manifest.previewSubtitle') }}</p>
    </header>
    <pre class="pre" :style="{ minHeight: Math.min(420, Math.max(160, lines * 18)) + 'px' }">{{ manifestJsonText }}</pre>
  </div>
</template>

<style scoped>
.card {
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 16px 18px 18px;
  position: sticky;
  top: 96px;
}
.hd {
  margin: 0 0 10px;
}
.hd__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.hd__sub {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}
.pre {
  margin: 0;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
  overflow: auto;
  color: #1f2937;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}
@media (max-width: 1024px) {
  .card {
    position: static;
  }
}
</style>
