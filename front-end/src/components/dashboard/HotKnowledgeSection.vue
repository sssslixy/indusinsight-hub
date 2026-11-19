<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import KnowledgeBaseCommunityCard from '@/components/community/knowledge-base/KnowledgeBaseCommunityCard.vue'
import { getKnowledgeBaseCommunityList, type MyKnowledgeBaseItem } from '@/api/knowledgeBase'

const router = useRouter()
const { t } = useI18n()

const items = ref<MyKnowledgeBaseItem[]>([])
const loading = ref(false)
const error = ref(false)

const fetchHotKnowledgeBases = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await getKnowledgeBaseCommunityList({
      includeMine: true,
      pageNum: 1,
      pageSize: 6,
      sortBy: 'favorite',
    })
    items.value = res.data?.list || []
  } catch (e) {
    console.error('Failed to fetch hot knowledge bases:', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

const handleViewMore = () => {
  router.push('/community/knowledge')
}

onMounted(() => {
  fetchHotKnowledgeBases()
})
</script>

<template>
  <div class="hot-knowledge-section">
    <div class="section-header">
      <h2 class="section-title">{{ t('dashboard.hotKnowledgeBases') }}</h2>
      <button type="button" class="view-more-btn" @click="handleViewMore">
        {{ t('common.viewMore') }}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="i in 6" :key="i" class="loading-card">
        <div class="loading-skeleton"></div>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="#d4d4d4" stroke-width="2" />
        <path d="M24 16V26M24 30V32" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round" />
      </svg>
      <p class="error-text">{{ t('dashboard.hotKnowledgeBasesLoadFailed') }}</p>
      <button type="button" class="retry-btn" @click="fetchHotKnowledgeBases">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="items.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="12" y="14" width="24" height="24" rx="4" stroke="#d4d4d4" stroke-width="2" />
        <path d="M18 22H30M18 28H26" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round" />
      </svg>
      <p class="empty-text">{{ t('dashboard.noHotKnowledgeBases') }}</p>
    </div>

    <div v-else class="kb-grid">
      <KnowledgeBaseCommunityCard v-for="item in items" :key="item.id" :item="item" />
    </div>
  </div>
</template>

<style scoped>
.hot-knowledge-section {
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
  height: 240px;
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

.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 20px;
  }

  .kb-grid {
    grid-template-columns: 1fr;
  }

  .loading-state {
    grid-template-columns: 1fr;
  }
}
</style>
