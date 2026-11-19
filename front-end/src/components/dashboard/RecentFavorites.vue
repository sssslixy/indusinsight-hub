<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getRecentFavoriteAgents,
  getRecentFavoritePlugins,
  getRecentFavoriteKnowledgeBases,
} from '@/api/dashboard'
import type {
  RecentFavoriteAgent,
  RecentFavoritePlugin,
  RecentFavoriteKnowledgeBase,
} from '@/api/dashboard'

const router = useRouter()
const { t } = useI18n()

interface FavoriteItem {
  id: number
  name: string
  description: string
  favoriteTime: string
}

const recentAgents = ref<FavoriteItem[]>([])
const recentPlugins = ref<FavoriteItem[]>([])
const recentKbs = ref<FavoriteItem[]>([])
const loadingAgents = ref(false)
const loadingPlugins = ref(false)
const loadingKbs = ref(false)

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    return dateStr
  }
}

const fetchRecentAgents = async () => {
  loadingAgents.value = true
  try {
    const response = await getRecentFavoriteAgents(3)
    if (response.data) {
      recentAgents.value = response.data.map((item: RecentFavoriteAgent) => ({
        id: item.id,
        name: item.agentName,
        description: item.agentDescription,
        favoriteTime: formatDate(item.favoriteTime)
      }))
    }
  } catch (error) {
    console.error('Failed to fetch recently favorited agents:', error)
  } finally {
    loadingAgents.value = false
  }
}

const fetchRecentPlugins = async () => {
  loadingPlugins.value = true
  try {
    const response = await getRecentFavoritePlugins(3)
    if (response.data) {
      recentPlugins.value = response.data.map((item: RecentFavoritePlugin) => ({
        id: item.id,
        name: item.pluginName,
        description: item.pluginDescription,
        favoriteTime: formatDate(item.favoriteTime)
      }))
    }
  } catch (error) {
    console.error('Failed to fetch recently favorited skills:', error)
  } finally {
    loadingPlugins.value = false
  }
}

const fetchRecentKbs = async () => {
  loadingKbs.value = true
  try {
    const response = await getRecentFavoriteKnowledgeBases(3)
    if (response.data) {
      recentKbs.value = response.data.map((item: RecentFavoriteKnowledgeBase) => ({
        id: item.id,
        name: item.kbName,
        description: item.kbDescription || '',
        favoriteTime: formatDate(item.favoriteTime),
      }))
    }
  } catch (error) {
    console.error('Failed to fetch recently favorited knowledge bases:', error)
  } finally {
    loadingKbs.value = false
  }
}

const handleViewAgent = (id: number) => {
  void router.push({
    name: 'agent-use',
    params: { id: String(id) },
    query: { from: 'community' },
  })
}

const handleViewPlugin = (id: number) => {
  router.push({ path: `/my/skills/${id}/edit`, query: { from: 'community' } })
}

const handleViewKb = () => {
  router.push('/community/knowledge')
}

const handleViewAllAgents = () => {
  router.push('/my/favorites?tab=agents')
}

const handleViewAllPlugins = () => {
  router.push('/my/favorites?tab=plugins')
}

const handleViewAllKbs = () => {
  router.push('/my/favorites?tab=knowledge-bases')
}

onMounted(() => {
  fetchRecentAgents()
  fetchRecentPlugins()
  fetchRecentKbs()
})
</script>

<template>
  <div class="recent-favorites">
    <div class="favorites-section">
      <div class="section-header">
        <h3 class="section-title">{{ t('dashboard.recentFavoriteAgents') }}</h3>
        <button class="view-all-btn" @click="handleViewAllAgents">
          {{ t('common.all') }}
        </button>
      </div>

      <div v-if="loadingAgents" class="loading-state">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="recentAgents.length === 0" class="empty-state">
        {{ t('dashboard.noFavoriteAgents') }}
      </div>

      <div v-else class="favorites-list">
        <div
          v-for="item in recentAgents"
          :key="item.id"
          class="favorite-item"
          @click="handleViewAgent(item.id)"
        >
          <div class="item-info">
            <h4 class="item-name">{{ item.name }}</h4>
            <p class="item-description">{{ item.description }}</p>
          </div>
          <span class="item-time">{{ item.favoriteTime }}</span>
        </div>
      </div>
    </div>

    <div class="favorites-section">
      <div class="section-header">
        <h3 class="section-title">{{ t('dashboard.recentFavoriteSkills') }}</h3>
        <button class="view-all-btn" @click="handleViewAllPlugins">
          {{ t('common.all') }}
        </button>
      </div>

      <div v-if="loadingPlugins" class="loading-state">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="recentPlugins.length === 0" class="empty-state">
        {{ t('dashboard.noFavoriteSkills') }}
      </div>

      <div v-else class="favorites-list">
        <div
          v-for="item in recentPlugins"
          :key="item.id"
          class="favorite-item"
          @click="handleViewPlugin(item.id)"
        >
          <div class="item-info">
            <h4 class="item-name">{{ item.name }}</h4>
            <p class="item-description">{{ item.description }}</p>
          </div>
          <span class="item-time">{{ item.favoriteTime }}</span>
        </div>
      </div>
    </div>

    <div class="favorites-section">
      <div class="section-header">
        <h3 class="section-title">{{ t('dashboard.recentFavoriteKnowledgeBases') }}</h3>
        <button class="view-all-btn" type="button" @click="handleViewAllKbs">{{ t('common.all') }}</button>
      </div>

      <div v-if="loadingKbs" class="loading-state">{{ t('common.loading') }}</div>

      <div v-else-if="recentKbs.length === 0" class="empty-state">{{ t('dashboard.noFavoriteKnowledgeBases') }}</div>

      <div v-else class="favorites-list">
        <div
          v-for="item in recentKbs"
          :key="item.id"
          class="favorite-item"
          @click="handleViewKb"
        >
          <div class="item-info">
            <h4 class="item-name">{{ item.name }}</h4>
            <p class="item-description">{{ item.description }}</p>
          </div>
          <span class="item-time">{{ item.favoriteTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-favorites {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.favorites-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.favorites-section:not(:last-child) {
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.view-all-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #737373;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.12);
  color: #1a1a1a;
}

.loading-state,
.empty-state {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: #a3a3a3;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favorite-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.favorite-item:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-description {
  font-size: 12px;
  color: #737373;
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 11px;
  color: #a3a3a3;
}
</style>
