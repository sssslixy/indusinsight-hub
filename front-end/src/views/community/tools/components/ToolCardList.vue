<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MyToolCard from '@/components/my-tools/MyToolCard.vue'
import type { ToolListItem } from '@/api/tool'

interface Props {
  tools: ToolListItem[]
  loading?: boolean
  isEmpty?: boolean
  isSearchResult?: boolean
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="tool-card-list">
    <div v-if="loading" class="tool-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card"></div>
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      <p class="empty-text">{{ isSearchResult ? t('community.noSearchTools') : t('community.noTools') }}</p>
      <p v-if="isSearchResult" class="empty-hint">{{ t('community.adjustSearchOrReset') }}</p>
    </div>

    <div v-else class="tool-grid">
      <MyToolCard v-for="tool in tools" :key="tool.id" variant="community" :tool="tool" />
    </div>
  </div>
</template>

<style scoped>
.tool-card-list {
  min-height: 360px;
}
.tool-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.skeleton-card {
  height: 220px;
  background: #f2f2f2;
  border-radius: 12px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 14px;
}
.empty-text {
  font-size: 15px;
  font-weight: 500;
  color: #525252;
  margin: 0;
}
.empty-hint {
  font-size: 13px;
  color: #a3a3a3;
  margin: 0;
}
@media (max-width: 900px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
}
</style>
