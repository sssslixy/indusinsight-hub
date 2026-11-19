<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MyToolCard from '@/components/my-tools/MyToolCard.vue'
import { getToolCommunityList, type ToolListItem } from '@/api/tool'

const router = useRouter()
const { t } = useI18n()

const tools = ref<ToolListItem[]>([])
const loading = ref(false)
const error = ref(false)

const fetchHotTools = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await getToolCommunityList({
      pageNum: 1,
      pageSize: 6,
      sortBy: 'hot',
    })
    tools.value = res.data?.list || []
  } catch (e) {
    console.error('Failed to fetch hot tools:', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

const handleViewMore = () => {
  router.push('/community/tools')
}

onMounted(() => {
  fetchHotTools()
})
</script>

<template>
  <div class="hot-tool-section">
    <div class="section-header">
      <h2 class="section-title">{{ t('dashboard.hotTools') }}</h2>
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
      <p class="error-text">{{ t('dashboard.hotToolsLoadFailed') }}</p>
      <button type="button" class="retry-btn" @click="fetchHotTools">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="tools.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d="M14.7 18.3L12 16L9.3 18.3C8.52 21.08 6.08 23.2 3 23.62V30C3 30.8 3.8 31.5 4.7 31.5H19.3C20.2 31.5 21 30.8 21 30V23.62C17.92 23.2 15.48 21.08 14.7 18.3Z"
          stroke="#d4d4d4"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <p class="empty-text">{{ t('dashboard.noHotTools') }}</p>
    </div>

    <div v-else class="tool-grid">
      <MyToolCard v-for="tool in tools" :key="tool.id" variant="community" :tool="tool" />
    </div>
  </div>
</template>

<style scoped>
.hot-tool-section {
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
  height: 200px;
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

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 20px;
  }

  .tool-grid {
    grid-template-columns: 1fr;
  }

  .loading-state {
    grid-template-columns: 1fr;
  }
}
</style>
