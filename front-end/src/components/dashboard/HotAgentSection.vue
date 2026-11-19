<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getHotAgents, type HotAgentItem } from '@/api/agent'
import { AgentIcon } from '@/components/base'

const router = useRouter()
const { t } = useI18n()

const hotAgents = ref<HotAgentItem[]>([])
const loading = ref(false)
const error = ref(false)

const fetchHotAgents = async () => {
  loading.value = true
  error.value = false

  try {
    const response = await getHotAgents(6, true)
    hotAgents.value = response.data || []
  } catch (err) {
    console.error('Failed to fetch hot agents:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

const handleViewMore = () => {
  router.push('/community/agents')
}

const handleViewDetail = (id: number) => {
  void router.push({
    name: 'agent-use',
    params: { id: String(id) },
    query: { from: 'community' },
  })
}

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

onMounted(() => {
  fetchHotAgents()
})
</script>

<template>
  <div class="hot-agent-section">
    <div class="section-header">
      <h2 class="section-title">{{ t('dashboard.hotAgents') }}</h2>
      <button type="button" class="view-more-btn" @click="handleViewMore">
        {{ t('common.viewMore') }}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-card" v-for="i in 6" :key="i">
        <div class="loading-skeleton"></div>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="#d4d4d4" stroke-width="2"/>
        <path d="M24 16V26M24 30V32" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="error-text">{{ t('dashboard.hotAgentsLoadFailed') }}</p>
      <button type="button" class="retry-btn" @click="fetchHotAgents">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="hotAgents.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="32" height="32" rx="4" stroke="#d4d4d4" stroke-width="2"/>
        <circle cx="24" cy="22" r="4" stroke="#d4d4d4" stroke-width="2"/>
        <path d="M14 34C14 30 18 28 24 28C30 28 34 30 34 34" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-text">{{ t('dashboard.noHotAgents') }}</p>
    </div>

    <div v-else class="agent-grid">
      <div
        v-for="agent in hotAgents"
        :key="agent.id"
        class="agent-card"
        @click="handleViewDetail(agent.id)"
      >
        <div class="card-header">
          <div class="agent-icon">
            <AgentIcon
              :src="agent.agentIcon"
              :agent-id="agent.id"
              :enable-edit-fallback="false"
              fallback-source="public"
              :size="56"
              :alt="agent.agentName"
              class="icon-image"
            />
          </div>
          <div class="agent-info">
            <h3 class="agent-name">{{ agent.agentName }}</h3>
            <p class="agent-author">@{{ agent.authorName }}</p>
          </div>
        </div>

        <p class="agent-description">{{ agent.agentDescription }}</p>

        <div class="card-stats">
          <span class="stat-item">{{ t('common.favorite') }} {{ formatNumber(agent.favoriteCount) }}</span>
          <span class="stat-item">{{ t('common.views') }} {{ formatNumber(agent.viewCount) }}</span>
        </div>

        <button type="button" class="view-detail-btn" @click.stop="handleViewDetail(agent.id)">
          {{ t('common.viewDetails') }}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hot-agent-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.01em;
}

.view-more-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-more-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.loading-state {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.loading-card {
  padding: 24px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

.loading-skeleton {
  height: 180px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 8px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  gap: 16px;
}

.error-text {
  font-size: 14px;
  color: #737373;
  margin: 0;
}

.retry-btn {
  padding: 8px 20px;
  background: #2d2d2d;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #3a3a3a;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  gap: 16px;
}

.empty-text {
  font-size: 14px;
  color: #737373;
  margin: 0;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.agent-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.agent-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.agent-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  flex-shrink: 0;
  overflow: hidden;
}

.icon-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
  line-height: 1.3;
}

.agent-author {
  font-size: 13px;
  color: #737373;
  margin: 0;
}

.agent-description {
  font-size: 14px;
  color: #525252;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #737373;
}

.view-detail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-detail-btn:hover {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

.agent-card:hover .view-detail-btn {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 20px;
  }

  .agent-grid {
    grid-template-columns: 1fr;
  }

  .loading-state {
    grid-template-columns: 1fr;
  }
}
</style>
