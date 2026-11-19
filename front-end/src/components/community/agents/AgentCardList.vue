<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AgentCard from './AgentCard.vue'
import type { AgentItem } from './AgentCard.vue'

interface Props {
  agents: AgentItem[]
  loading?: boolean
  isEmpty?: boolean
  isSearchResult?: boolean
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="agent-card-list">
    <div v-if="loading && agents.length === 0" class="agent-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="sk-header">
          <div class="sk sk-icon"></div>
          <div class="sk-info">
            <div class="sk sk-name"></div>
            <div class="sk sk-author"></div>
          </div>
        </div>
        <div class="sk sk-desc"></div>
        <div class="sk sk-desc sk-desc-short"></div>
        <div class="sk sk-btn"></div>
      </div>
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <rect x="10" y="10" width="40" height="40" rx="6" stroke="#d4d4d4" stroke-width="2"/>
        <circle cx="23" cy="27" r="4" stroke="#d4d4d4" stroke-width="2"/>
        <circle cx="37" cy="27" r="4" stroke="#d4d4d4" stroke-width="2"/>
        <path d="M22 36C22 36 25.3 39 30 39C34.7 39 38 36 38 36" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-text">
        {{ isSearchResult ? t('community.noSearchAgents') : t('community.noAgents') }}
      </p>
      <p v-if="isSearchResult" class="empty-hint">{{ t('community.adjustSearchOrReset') }}</p>
    </div>

    <div v-else class="agent-grid-wrap">
      <div class="agent-grid" :class="{ 'agent-grid--refreshing': loading && agents.length > 0 }">
        <AgentCard v-for="agent in agents" :key="agent.id" :agent="agent" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-card-list { min-height: 360px; }

.agent-grid-wrap {
  position: relative;
  min-height: 200px;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  transition: opacity 0.2s ease;
}

.agent-grid--refreshing {
  opacity: 0.55;
  pointer-events: none;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 12px;
}

.sk-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sk-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk {
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 5px;
}

.sk-icon { width: 54px; height: 54px; border-radius: 10px; flex-shrink: 0; }
.sk-name { height: 16px; width: 60%; }
.sk-author { height: 12px; width: 35%; }
.sk-desc { height: 13px; width: 100%; }
.sk-desc-short { width: 75%; }
.sk-btn { height: 36px; width: 100%; margin-top: 4px; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 14px;
  grid-column: 1 / -1;
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
  .agent-grid { grid-template-columns: 1fr; }
}
</style>
