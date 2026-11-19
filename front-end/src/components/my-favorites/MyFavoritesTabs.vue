<script setup lang="ts">
import { useI18n } from 'vue-i18n'

export type FavoriteTab = 'agents' | 'plugins' | 'knowledge-bases'

defineProps<{ activeTab: FavoriteTab }>()
const emit = defineEmits<{ tabChange: [tab: FavoriteTab] }>()
const { t } = useI18n()

const tabs: { key: FavoriteTab; labelKey: string }[] = [
  { key: 'agents', labelKey: 'profile.favoriteAgents' },
  { key: 'plugins', labelKey: 'profile.favoriteSkills' },
  { key: 'knowledge-bases', labelKey: 'profile.favoriteKnowledgeBase' },
]
</script>

<template>
  <div class="tabs-wrapper">
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="emit('tabChange', tab.key)"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tabs-wrapper { border-bottom: 1px solid rgba(0, 0, 0, 0.08); }
.tabs { display: flex; gap: 0; }
.tab-item { position: relative; padding: 12px 20px; background: transparent; border: none; font-size: 14px; font-weight: 500; color: #737373; cursor: pointer; transition: color 0.2s ease; white-space: nowrap; }
.tab-item::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #2d2d2d; border-radius: 2px 2px 0 0; opacity: 0; transition: opacity 0.2s ease; }
.tab-item:hover { color: #1a1a1a; }
.tab-item.active { color: #1a1a1a; font-weight: 600; }
.tab-item.active::after { opacity: 1; }
</style>
