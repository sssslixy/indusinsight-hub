<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import {
  MyFavoritesHeader,
  MyFavoritesStats,
  MyFavoritesTabs,
  MyFavoritesFilterBar,
  FavoriteAgentCardList,
  FavoritePluginCardList,
  FavoriteKnowledgeBaseCardList,
  MyFavoritesPagination,
  CancelFavoriteDialog,
  type FavoriteTab,
  type FavoriteFilterParams,
} from './components'
import {
  getFavoriteStats,
  getFavoriteAgents,
  getFavoritePlugins,
  getFavoriteKnowledgeBases,
  cancelFavoriteAgent,
  cancelFavoritePlugin,
  cancelMyFavoriteKnowledgeBase,
} from '@/api/myContent'
import type {
  FavoriteStatsItem,
  FavoriteAgentItem,
  FavoritePluginItem,
  FavoriteKnowledgeBaseItem,
} from '@/api/myContent'

const router = useRouter()
const route  = useRoute()
const { t } = useI18n()
const PAGE_SIZE = 6

const stats = ref<FavoriteStatsItem | null>(null)

const statsItems = computed(() => {
  const s = stats.value
  const fmt = (n: number | null | undefined) => {
    const num = n || 0
    return num >= 1000 ? (num / 1000).toFixed(1) + 'K' : String(num)
  }
  return [
    { label: t('myContentPage.favoriteTotal'), value: s != null ? fmt(s.totalCount) : '--', iconKey: 'total' as const },
    { label: t('myContentPage.favoriteAgents'), value: s != null ? fmt(s.favoriteAgentCount) : '--', iconKey: 'favoriteAgents' as const },
    { label: t('myContentPage.favoriteSkills'), value: s != null ? fmt(s.favoritePluginCount) : '--', iconKey: 'favoritePlugins' as const },
    { label: t('myContentPage.favoriteKnowledgeBases'), value: s != null ? fmt(s.favoriteKnowledgeBaseCount ?? 0) : '--', iconKey: 'favoriteKbs' as const },
    { label: t('myContentPage.addedLast7Days'), value: s != null ? fmt(s.recentAddedCount7d) : '--', iconKey: 'recent7d' as const },
  ]
})

async function fetchStats() {
  try {
    const res = await getFavoriteStats()
    stats.value = res.data
  } catch {
    stats.value = null
  }
}

const activeTab = ref<FavoriteTab>('agents')

const handleTabChange = (tab: FavoriteTab) => {
  activeTab.value = tab
  if (tab === 'agents') {
    agentKeyword.value = ''
    agentSort.value = 'favorited'
    agentPage.value = 1
    fetchAgents()
  } else if (tab === 'plugins') {
    pluginKeyword.value = ''
    pluginSort.value = 'favorited'
    pluginPage.value = 1
    fetchPlugins()
  } else {
    kbKeyword.value = ''
    kbSort.value = 'favorited'
    kbPage.value = 1
    fetchKnowledgeBases()
  }
}

const agentKeyword    = ref('')
const agentSort       = ref('favorited')
const agentPage       = ref(1)
const agents          = ref<FavoriteAgentItem[]>([])
const agentTotal      = ref(0)
const agentTotalPages = ref(1)
const agentBootstrapping = ref(true)
const agentRefreshing    = ref(false)
const agentError      = ref('')

async function fetchAgents() {
  const overlayOnly = !agentBootstrapping.value
  if (overlayOnly) agentRefreshing.value = true
  agentError.value   = ''
  try {
    const params: Record<string, any> = {
      pageNum:  agentPage.value,
      pageSize: PAGE_SIZE,
      sortBy:   agentSort.value,
    }
    if (agentKeyword.value.trim()) params.keyword = agentKeyword.value.trim()
    const res = await getFavoriteAgents(params)
    agents.value          = res.data.list
    agentTotal.value      = res.data.total
    agentTotalPages.value = res.data.totalPages
  } catch (e: any) {
    agentError.value      = e?.message || t('myContentPage.loadFailed')
    agents.value          = []
    agentTotal.value      = 0
    agentTotalPages.value = 1
  } finally {
    agentRefreshing.value = false
    agentBootstrapping.value = false
  }
}

const pluginKeyword    = ref('')
const pluginSort       = ref('favorited')
const pluginPage       = ref(1)
const plugins          = ref<FavoritePluginItem[]>([])
const pluginTotal      = ref(0)
const pluginTotalPages = ref(1)
const pluginBootstrapping = ref(true)
const pluginRefreshing    = ref(false)
const pluginError      = ref('')

async function fetchPlugins() {
  const overlayOnly = !pluginBootstrapping.value
  if (overlayOnly) pluginRefreshing.value = true
  pluginError.value = ''
  try {
    const params: Record<string, any> = {
      pageNum: pluginPage.value,
      pageSize: PAGE_SIZE,
      sortBy: pluginSort.value,
    }
    if (pluginKeyword.value.trim()) params.keyword = pluginKeyword.value.trim()
    const res = await getFavoritePlugins(params)
    plugins.value = res.data.list
    pluginTotal.value = res.data.total
    pluginTotalPages.value = res.data.totalPages
  } catch (e: any) {
    pluginError.value = e?.message || t('myContentPage.loadFailed')
    plugins.value = []
    pluginTotal.value = 0
    pluginTotalPages.value = 1
  } finally {
    pluginRefreshing.value = false
    pluginBootstrapping.value = false
  }
}

const kbKeyword = ref('')
const kbSort = ref('favorited')
const kbPage = ref(1)
const knowledgeBases = ref<FavoriteKnowledgeBaseItem[]>([])
const kbTotal = ref(0)
const kbTotalPages = ref(1)
const kbBootstrapping = ref(true)
const kbRefreshing    = ref(false)
const kbError = ref('')

async function fetchKnowledgeBases() {
  const overlayOnly = !kbBootstrapping.value
  if (overlayOnly) kbRefreshing.value = true
  kbError.value = ''
  try {
    const params: Record<string, any> = {
      pageNum: kbPage.value,
      pageSize: PAGE_SIZE,
      sortBy: kbSort.value,
    }
    if (kbKeyword.value.trim()) params.keyword = kbKeyword.value.trim()
    const res = await getFavoriteKnowledgeBases(params)
    knowledgeBases.value = res.data.list
    kbTotal.value = res.data.total
    kbTotalPages.value = res.data.totalPages
  } catch (e: any) {
    kbError.value = e?.message || t('myContentPage.loadFailed')
    knowledgeBases.value = []
    kbTotal.value = 0
    kbTotalPages.value = 1
  } finally {
    kbRefreshing.value = false
    kbBootstrapping.value = false
  }
}

onMounted(() => {
  const tabParam = route.query.tab
  fetchStats()
  if (tabParam === 'plugins') {
    activeTab.value = 'plugins'
    fetchPlugins()
  } else if (tabParam === 'tools') {
    void router.replace({ query: { ...route.query, tab: 'agents' } })
    activeTab.value = 'agents'
    fetchAgents()
  } else if (tabParam === 'knowledge-bases') {
    activeTab.value = 'knowledge-bases'
    fetchKnowledgeBases()
  } else {
    activeTab.value = 'agents'
    fetchAgents()
  }
})

const favoriteSortToBackend = (
  sort: string,
): 'favorited' | 'favorite' | 'latest' => {
  const map: Record<string, 'favorited' | 'favorite' | 'latest'> = {
    favoritedAt_desc: 'favorited',
    favoriteCount_desc: 'favorite',
    publishTime_desc: 'latest',
    favorited: 'favorited',
    favorite: 'favorite',
    latest: 'latest',
  }
  return map[sort] ?? 'favorited'
}

const handleSearch = (params: FavoriteFilterParams) => {
  const backendSort = favoriteSortToBackend(params.sort)
  if (activeTab.value === 'agents') {
    agentKeyword.value = params.keyword
    agentSort.value = backendSort
    agentPage.value = 1
    fetchAgents()
  } else if (activeTab.value === 'plugins') {
    pluginKeyword.value = params.keyword
    pluginSort.value = backendSort
    pluginPage.value = 1
    fetchPlugins()
  } else {
    kbKeyword.value = params.keyword
    kbSort.value = backendSort
    kbPage.value = 1
    fetchKnowledgeBases()
  }
}

const handleReset = () => {
  if (activeTab.value === 'agents') {
    agentKeyword.value = ''
    agentSort.value = 'favorited'
    agentPage.value = 1
    fetchAgents()
  } else if (activeTab.value === 'plugins') {
    pluginKeyword.value = ''
    pluginSort.value = 'favorited'
    pluginPage.value = 1
    fetchPlugins()
  } else {
    kbKeyword.value = ''
    kbSort.value = 'favorited'
    kbPage.value = 1
    fetchKnowledgeBases()
  }
  fetchStats()
}

const handleAgentPageChange = (page: number) => {
  agentPage.value = page
  fetchAgents()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handlePluginPageChange = (page: number) => {
  pluginPage.value = page
  fetchPlugins()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleKbPageChange = (page: number) => {
  kbPage.value = page
  fetchKnowledgeBases()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const dialogVisible  = ref(false)
const pendingId      = ref<number | null>(null)
const pendingName    = ref('')
const pendingType = ref<'agent' | 'plugin' | 'knowledge-base'>('agent')
const cancelLoading  = ref(false)
const cancelError    = ref('')

const handleCancelFavoriteAgent = (id: number) => {
  const item = agents.value.find(a => a.id === id)
  if (!item) return
  pendingId.value     = id
  pendingName.value   = item.agentName
  pendingType.value   = 'agent'
  cancelError.value   = ''
  dialogVisible.value = true
}

const handleCancelFavoritePlugin = (id: number) => {
  const item = plugins.value.find(p => p.id === id)
  if (!item) return
  pendingId.value = id
  pendingName.value = item.pluginName
  pendingType.value = 'plugin'
  cancelError.value = ''
  dialogVisible.value = true
}

const handleCancelFavoriteKnowledgeBase = (id: number) => {
  const item = knowledgeBases.value.find((k) => k.id === id)
  if (!item) return
  pendingId.value = id
  pendingName.value = item.kbName
  pendingType.value = 'knowledge-base'
  cancelError.value = ''
  dialogVisible.value = true
}

const handleDialogConfirm = async () => {
  if (pendingId.value === null) return
  cancelLoading.value = true
  cancelError.value = ''
  try {
    if (pendingType.value === 'agent') {
      await cancelFavoriteAgent(pendingId.value)
      if (agents.value.length === 1 && agentPage.value > 1) agentPage.value -= 1
      await Promise.all([fetchStats(), fetchAgents()])
    } else if (pendingType.value === 'plugin') {
      await cancelFavoritePlugin(pendingId.value)
      if (plugins.value.length === 1 && pluginPage.value > 1) pluginPage.value -= 1
      await Promise.all([fetchStats(), fetchPlugins()])
    } else {
      await cancelMyFavoriteKnowledgeBase(pendingId.value)
      if (knowledgeBases.value.length === 1 && kbPage.value > 1) kbPage.value -= 1
      await Promise.all([fetchStats(), fetchKnowledgeBases()])
    }
    dialogVisible.value = false
    pendingId.value = null
    pendingName.value = ''
  } catch (e: any) {
    cancelError.value = e?.message || t('common.unfavoriteFailedRetry')
  } finally {
    cancelLoading.value = false
  }
}

const handleDialogCancel = () => {
  dialogVisible.value = false
  pendingId.value     = null
  pendingName.value   = ''
  cancelError.value   = ''
}

const agentIsFiltered = computed(() => agentKeyword.value.trim() !== '')
const pluginIsFiltered = computed(() => pluginKeyword.value.trim() !== '')
const kbIsFiltered = computed(() => kbKeyword.value.trim() !== '')
</script>


<template>
  <div class="my-favorites-page">
    <DashboardHeader />

    <main class="page-main">
      <div class="page-container">
        <MyFavoritesHeader />
        <MyFavoritesStats :stats="statsItems" />
        <MyFavoritesTabs :active-tab="activeTab" @tab-change="handleTabChange" />
        <MyFavoritesFilterBar :active-tab="activeTab" @search="handleSearch" @reset="handleReset" />

        <template v-if="activeTab === 'agents'">
          <div v-if="agentBootstrapping" class="loading-state">
            <span class="loading-spinner"></span>
            <span>{{ t('common.loading') }}</span>
          </div>
          <div v-else class="list-section-main">
            <div v-if="agentRefreshing" class="list-refresh-overlay" aria-busy="true" aria-live="polite">
              <span class="loading-spinner loading-spinner--sm"></span>
              <span>{{ t('common.loading') }}</span>
            </div>
            <div v-if="agentError" class="error-state">
              <p class="error-text">{{ agentError }}</p>
              <button class="retry-btn" type="button" @click="fetchAgents">{{ t('myContentPage.reload') }}</button>
            </div>
            <template v-else-if="agents.length > 0">
              <FavoriteAgentCardList :agents="agents" @cancel-favorite="handleCancelFavoriteAgent" />
              <MyFavoritesPagination
                v-if="agentTotal > PAGE_SIZE"
                :current-page="agentPage"
                :total-pages="agentTotalPages"
                :total-count="agentTotal"
                :page-size="PAGE_SIZE"
                @page-change="handleAgentPageChange"
              />
            </template>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <rect x="8" y="14" width="40" height="34" rx="5" stroke="#d4d4d4" stroke-width="2"/>
                  <circle cx="22" cy="30" r="5" stroke="#d4d4d4" stroke-width="2"/>
                  <circle cx="34" cy="30" r="5" stroke="#d4d4d4" stroke-width="2"/>
                  <path d="M24 33C24 33 25.8 34.5 28 34.5C30.2 34.5 32 33 32 33" stroke="#d4d4d4" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M14 14V11C14 9.9 14.9 9 16 9H40C41.1 9 42 9.9 42 11V14" stroke="#d4d4d4" stroke-width="2"/>
                </svg>
              </div>
              <p class="empty-title">{{ agentIsFiltered ? t('myContentPage.noMatchingAgents') : t('myContentPage.noFavoriteAgents') }}</p>
              <p class="empty-sub">{{ agentIsFiltered ? t('myContentPage.adjustSearchOrSort') : t('myContentPage.discoverAgents') }}</p>
              <button v-if="!agentIsFiltered" class="empty-action-btn" @click="router.push('/community/agents')">{{ t('myContentPage.goAgentCommunity') }}</button>
              <button v-else class="empty-reset-btn" type="button" @click="handleReset">{{ t('myContentPage.clearFilters') }}</button>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'plugins'">
          <div v-if="pluginBootstrapping" class="loading-state">
            <span class="loading-spinner"></span>
            <span>{{ t('common.loading') }}</span>
          </div>
          <div v-else class="list-section-main">
            <div v-if="pluginRefreshing" class="list-refresh-overlay" aria-busy="true" aria-live="polite">
              <span class="loading-spinner loading-spinner--sm"></span>
              <span>{{ t('common.loading') }}</span>
            </div>
            <div v-if="pluginError" class="error-state">
              <p class="error-text">{{ pluginError }}</p>
              <button class="retry-btn" type="button" @click="fetchPlugins">{{ t('myContentPage.reload') }}</button>
            </div>
            <template v-else-if="plugins.length > 0">
              <FavoritePluginCardList :plugins="plugins" @cancel-favorite="handleCancelFavoritePlugin" />
              <MyFavoritesPagination
                v-if="pluginTotal > PAGE_SIZE"
                :current-page="pluginPage"
                :total-pages="pluginTotalPages"
                :total-count="pluginTotal"
                :page-size="PAGE_SIZE"
                @page-change="handlePluginPageChange"
              />
            </template>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <rect x="16" y="22" width="24" height="20" rx="4" stroke="#d4d4d4" stroke-width="2"/>
                  <path d="M22 22V18C22 16.9 22.9 16 24 16H32C33.1 16 34 16.9 34 18V22" stroke="#d4d4d4" stroke-width="2"/>
                  <circle cx="23" cy="32" r="2" fill="#d4d4d4"/>
                  <circle cx="33" cy="32" r="2" fill="#d4d4d4"/>
                  <path d="M28 35V39M24 39H32" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <p class="empty-title">{{ pluginIsFiltered ? t('community.noSearchSkills') : t('myContentPage.noFavoriteSkills') }}</p>
              <p class="empty-sub">{{ pluginIsFiltered ? t('myContentPage.adjustSearchOrSort') : t('myContentPage.discoverSkills') }}</p>
              <button v-if="!pluginIsFiltered" class="empty-action-btn" @click="router.push('/community/skills')">{{ t('myContentPage.goSkillCommunity') }}</button>
              <button v-else class="empty-reset-btn" type="button" @click="handleReset">{{ t('myContentPage.clearFilters') }}</button>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'knowledge-bases'">
          <div v-if="kbBootstrapping" class="loading-state">
            <span class="loading-spinner"></span>
            <span>{{ t('common.loading') }}</span>
          </div>
          <div v-else class="list-section-main">
            <div v-if="kbRefreshing" class="list-refresh-overlay" aria-busy="true" aria-live="polite">
              <span class="loading-spinner loading-spinner--sm"></span>
              <span>{{ t('common.loading') }}</span>
            </div>
            <div v-if="kbError" class="error-state">
              <p class="error-text">{{ kbError }}</p>
              <button class="retry-btn" type="button" @click="fetchKnowledgeBases">{{ t('myContentPage.reload') }}</button>
            </div>
            <template v-else-if="knowledgeBases.length > 0">
              <FavoriteKnowledgeBaseCardList
                :items="knowledgeBases"
                @cancel-favorite="handleCancelFavoriteKnowledgeBase"
              />
              <MyFavoritesPagination
                v-if="kbTotal > PAGE_SIZE"
                :current-page="kbPage"
                :total-pages="kbTotalPages"
                :total-count="kbTotal"
                :page-size="PAGE_SIZE"
                @page-change="handleKbPageChange"
              />
            </template>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <rect x="14" y="16" width="28" height="28" rx="4" stroke="#d4d4d4" stroke-width="2" />
                  <path d="M20 24H36M20 30H32" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <p class="empty-title">{{ kbIsFiltered ? t('community.noSearchKnowledgeBases') : t('myContentPage.noFavoriteKnowledgeBases') }}</p>
              <p class="empty-sub">
                {{ kbIsFiltered ? t('myContentPage.adjustSearchOrSort') : t('myContentPage.discoverKnowledgeBases') }}
              </p>
              <button v-if="!kbIsFiltered" class="empty-action-btn" @click="router.push('/community/knowledge')">
                {{ t('myContentPage.goKnowledgeCommunity') }}
              </button>
              <button v-else class="empty-reset-btn" type="button" @click="handleReset">{{ t('myContentPage.clearFilters') }}</button>
            </div>
          </div>
        </template>
      </div>
    </main>


    <CancelFavoriteDialog
      :visible="dialogVisible"
      :item-name="pendingName"
      :item-type="pendingType"
      @confirm="handleDialogConfirm"
      @cancel="handleDialogCancel"
    />
    <div v-if="cancelError" class="error-toast">{{ cancelError }}</div>
  </div>
</template>

<style scoped>
.my-favorites-page { min-height: 100vh; background: var(--app-color-bg-page); display: flex; flex-direction: column; }
.page-main { flex: 1; padding-top: var(--app-page-top-desktop); padding-bottom: var(--app-page-bottom-desktop); }
.page-container { max-width: 1100px; margin: 0 auto; padding: 48px 48px 0; display: flex; flex-direction: column; gap: 32px; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 80px 24px; color: var(--app-color-text-secondary); font-size: 14px; }
.loading-spinner { width: 18px; height: 18px; border: 2px solid rgba(0,0,0,0.1); border-top-color: #2d2d2d; border-radius: 50%; animation: spin 0.7s linear infinite; }
.loading-spinner--sm { width: 16px; height: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

.list-section-main {
  position: relative;
  min-height: 280px;
}

.list-refresh-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: rgba(250, 250, 250, 0.88);
  border-radius: 12px;
  font-size: 14px;
  color: var(--app-color-text-secondary);
}
.error-state { display: flex; flex-direction: column; align-items: center; padding: 60px 24px; gap: 12px; }
.error-text { font-size: 14px; color: #dc2626; margin: 0; }
.retry-btn { height: 36px; padding: 0 18px; background: transparent; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; font-size: 13px; color: #525252; cursor: pointer; }
.retry-btn:hover { background: rgba(0,0,0,0.04); border-color: #2d2d2d; color: #1a1a1a; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; background: #fff; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; gap: 12px; }
.empty-icon { margin-bottom: 8px; opacity: 0.7; }
.empty-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0; }
.empty-sub { font-size: 14px; color: var(--app-color-text-secondary); margin: 0; text-align: center; max-width: 360px; line-height: 1.6; }
.empty-action-btn { display: flex; align-items: center; gap: 6px; margin-top: 8px; height: 40px; padding: 0 20px; background: #2d2d2d; border: 1px solid #2d2d2d; border-radius: 8px; font-size: 14px; font-weight: 500; color: #fff; cursor: pointer; transition: all 0.2s ease; }
.empty-action-btn:hover { background: #1a1a1a; border-color: #1a1a1a; }
.empty-reset-btn { display: flex; align-items: center; margin-top: 8px; height: 40px; padding: 0 20px; background: transparent; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; font-size: 14px; font-weight: 500; color: #525252; cursor: pointer; transition: all 0.2s ease; }
.empty-reset-btn:hover { background: rgba(0,0,0,0.04); border-color: #2d2d2d; color: #1a1a1a; }
.error-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: #dc2626; color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 13px; z-index: 9999; pointer-events: none; }
@media (max-width: 768px) { .page-main { padding-top: var(--app-page-top-mobile); padding-bottom: var(--app-page-bottom-mobile); } .page-container { padding: 32px 20px 0; gap: 24px; } }
</style>
