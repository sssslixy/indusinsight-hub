<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getSkillCommunityList, type SkillListItem } from '@/api/skill'
import { resolvePluginSystemIconSrc } from '@/constants/systemAssetIcons'
import { skillCategoryZhCardLabel } from '@/constants/skillCategoryCodes'

const router = useRouter()
const { t } = useI18n()

type HotSkillItem = {
  id: number
  pluginName: string
  pluginDescription: string
  pluginIcon: string
  pluginCategoryLabel: string
  authorName: string
  favoriteCount: number
  viewCount: number
}

const hotPlugins = ref<HotSkillItem[]>([])
const loading = ref(false)
const error = ref(false)
const imageErrors = ref<Record<number, boolean>>({})

const fetchHotPlugins = async () => {
  loading.value = true
  error.value = false

  try {
    const response = await getSkillCommunityList({
      includeMine: true,
      pageNum: 1,
      pageSize: 6,
      sortBy: 'favorite',
      sortOrder: 'desc',
    })
    hotPlugins.value = (response.data?.list || []).map((item: SkillListItem) => ({
      id: item.id,
      pluginName: item.name,
      pluginDescription: item.description || '',
      pluginIcon: resolvePluginSystemIconSrc(item.iconUrl) ?? '',
      pluginCategoryLabel: t('category.skillType', { category: t(skillCategoryZhCardLabel(item.categoryCode)) }),
      authorName: item.authorName || t('common.unknownAuthor'),
      favoriteCount: item.favoriteCount || 0,
      viewCount: item.viewCount || 0,
    }))
    imageErrors.value = {}
  } catch (err) {
    console.error('Failed to fetch hot skills:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

const handleImageError = (pluginId: number) => {
  imageErrors.value[pluginId] = true
}

const isImageError = (pluginId: number) => {
  return imageErrors.value[pluginId] || false
}

const hasValidIcon = (icon: string | null | undefined) => {
  return icon && icon.trim() !== ''
}

const handleViewMore = () => {
  router.push('/community/skills')
}

const handleViewDetail = (id: number) => {
  router.push({ path: '/skills/create', query: { id: String(id), from: 'community' } })
}

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

onMounted(() => {
  fetchHotPlugins()
})
</script>

<template>
  <div class="hot-plugin-section">
    <div class="section-header">
      <h2 class="section-title">{{ t('dashboard.hotSkills') }}</h2>
      <button class="view-more-btn" @click="handleViewMore">
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
      <p class="error-text">{{ t('dashboard.hotSkillsLoadFailed') }}</p>
      <button class="retry-btn" @click="fetchHotPlugins">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="hotPlugins.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="32" height="32" rx="4" stroke="#d4d4d4" stroke-width="2"/>
        <path d="M16 20H32M16 24H28M16 28H24" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-text">{{ t('dashboard.noHotSkills') }}</p>
    </div>

    <div v-else class="plugin-grid">
      <div
        v-for="plugin in hotPlugins"
        :key="plugin.id"
        class="plugin-card"
        @click="handleViewDetail(plugin.id)"
      >
        <div class="card-header">
          <div class="plugin-icon">
            <img
              v-if="hasValidIcon(plugin.pluginIcon) && !isImageError(plugin.id)"
              :src="plugin.pluginIcon"
              :alt="plugin.pluginName"
              @error="handleImageError(plugin.id)"
              class="icon-image"
            />
            <div v-else class="icon-placeholder">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="10" y="14" width="12" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M13 14V11C13 10.4477 13.4477 10 14 10H18C18.5523 10 19 10.4477 19 11V14" stroke="currentColor" stroke-width="2"/>
                <circle cx="14" cy="18" r="1.5" fill="currentColor"/>
                <circle cx="18" cy="18" r="1.5" fill="currentColor"/>
                <path d="M16 21V24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M12 24H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
          <div class="plugin-info">
            <div class="title-stack">
              <h3 class="plugin-name">{{ plugin.pluginName }}</h3>
              <span class="category-tag">{{ plugin.pluginCategoryLabel }}</span>
            </div>
            <div class="plugin-meta">
              <span class="plugin-author">@{{ plugin.authorName }}</span>
            </div>
          </div>
        </div>

        <p class="plugin-description">{{ plugin.pluginDescription }}</p>

        <div class="card-stats">
          <span class="stat-item">{{ t('common.favorite') }} {{ formatNumber(plugin.favoriteCount) }}</span>
          <span class="stat-item">{{ t('common.views') }} {{ formatNumber(plugin.viewCount) }}</span>
        </div>

        <button class="view-detail-btn">
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
.hot-plugin-section {
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

.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.plugin-card {
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

.plugin-card:hover {
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

.plugin-icon {
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

.icon-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a3a3a3;
}

.plugin-info {
  flex: 1;
  min-width: 0;
}

.title-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
  min-width: 0;
}

.plugin-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-tag {
  align-self: flex-start;
  padding: 3px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  box-sizing: border-box;
}

.plugin-author {
  font-size: 13px;
  color: #737373;
}

.plugin-description {
  font-size: 14px;
  color: #525252;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  /* autoprefixer: ignore next */
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

.plugin-card:hover .view-detail-btn {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 20px;
  }

  .plugin-grid {
    grid-template-columns: 1fr;
  }

  .loading-state {
    grid-template-columns: 1fr;
  }
}
</style>
