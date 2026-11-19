<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FavoriteAgentItem } from '@/api/myContent'
import { AgentIcon } from '@/components/base'

defineProps<{ agents: FavoriteAgentItem[] }>()
const emit = defineEmits<{ cancelFavorite: [id: number] }>()
const router = useRouter()
const { t } = useI18n()
const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n))
const handleViewDetail = (id: number) =>
  void router.push({
    name: 'agent-use',
    params: { id: String(id) },
    query: { from: 'community' },
  })
</script>

<template>
  <div class="card-grid">
    <div v-for="agent in agents" :key="agent.id" class="agent-card">
      <div class="card-header">
        <div class="agent-icon">
          <AgentIcon
            :src="agent.agentIcon"
            :agent-id="agent.id"
            :enable-edit-fallback="false"
            fallback-source="public"
            :size="54"
            :alt="agent.agentName"
            class="icon-img"
          />
        </div>
        <div class="agent-meta">
          <div class="name-row">
            <h3 class="agent-name">{{ agent.agentName }}</h3>
            <div class="badge-group">
              <span v-if="agent.isHot" class="badge badge-hot">{{ t('common.hot') }}</span>
              <span v-if="agent.isLatest" class="badge badge-latest">{{ t('common.latest') }}</span>
            </div>
          </div>
          <p class="agent-author">@{{ agent.authorName }}</p>
        </div>
      </div>

      <p class="agent-description">{{ agent.agentDescription }}</p>

      <div class="card-stats">
        <span class="stat-item">{{ t('common.favorite') }} {{ fmt(agent.favoriteCount) }}</span>
        <span class="stat-item">{{ t('common.views') }} {{ fmt(agent.viewCount) }}</span>
      </div>

      <div class="card-actions">
        <button type="button" class="detail-btn" @click="handleViewDetail(agent.id)">
          {{ t('common.viewDetails') }}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M4.5 2.5L8.5 6.5L4.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button type="button" class="unfav-btn" @click="emit('cancelFavorite', agent.id)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5L8.5 5.2L12.5 5.5L9.5 8.2L10.5 12L7 9.8L3.5 12L4.5 8.2L1.5 5.5L5.5 5.2Z" fill="#f59e0b" stroke="#f59e0b" stroke-width="0"/>
          </svg>
          {{ t('common.unfavorite') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.agent-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  transition: all 0.22s ease;
}

.agent-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.13);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.agent-icon {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.icon-img { width: 100%; height: 100%; object-fit: cover; }

.agent-meta { flex: 1; min-width: 0; }

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.agent-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
}

.badge-group {
  display: flex;
  gap: 5px;
  margin-left: auto;
  margin-right: 8px;
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge-hot    { background: rgba(249,115,22,0.1); color: #ea580c; }
.badge-latest { background: rgba(59,130,246,0.1);  color: #3b82f6; }

.agent-author {
  font-size: 13px;
  color: #737373;
  margin: 0;
}

.agent-description {
  font-size: 14px;
  color: #525252;
  margin: 0;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}

.stat-item {
  font-size: 13px;
  color: #737373;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.detail-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 14px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-btn:hover,
.agent-card:hover .detail-btn {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

.unfav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 14px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #92400e;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.unfav-btn:hover {
  background: rgba(245,158,11,0.15);
  border-color: rgba(245,158,11,0.4);
}

@media (max-width: 768px) {
  .card-grid { grid-template-columns: 1fr; }
}
</style>
