<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import MyAgentCard from '@/components/my-agents/MyAgentCard.vue'
import MySkillCard from '@/components/my-skills/MySkillCard.vue'
import MyToolCard from '@/components/my-tools/MyToolCard.vue'
import MyAgentDeleteDialog from '@/components/my-agents/DeleteAgentDialog.vue'
import MyPluginDeleteDialog from '@/components/my-plugins/DeletePluginDialog.vue'
import FavoriteAgentCardList from '@/components/my-favorites/FavoriteAgentCardList.vue'
import FavoritePluginCardList from '@/components/my-favorites/FavoritePluginCardList.vue'
import FavoriteToolCardList from '@/components/my-favorites/FavoriteToolCardList.vue'
import FavoriteKnowledgeBaseCardList from '@/components/my-favorites/FavoriteKnowledgeBaseCardList.vue'
import KnowledgeBaseCard from '@/components/knowledge-base/KnowledgeBaseCard.vue'
import DeleteKnowledgeBaseDialog from '@/components/knowledge-base/DeleteKnowledgeBaseDialog.vue'
import CancelFavoriteDialog from '@/components/my-favorites/CancelFavoriteDialog.vue'
import {
  getMyAgents,
  getMyFavoriteAgents,
  getMyFavoritePlugins,
  getFavoriteTools,
  getFavoriteKnowledgeBases,
  deleteMyAgent,
  cancelFavoriteAgent,
  cancelFavoritePlugin,
  cancelMyFavoriteTool,
  cancelMyFavoriteKnowledgeBase,
} from '@/api/myContent'
import type {
  MyAgentItem,
  FavoriteAgentItem,
  FavoritePluginItem,
  FavoriteToolItem,
  FavoriteKnowledgeBaseItem,
} from '@/api/myContent'
import { getMySkillList, deleteSkill, type SkillListItem } from '@/api/skill'
import { getMyToolList, deleteTool, type ToolListItem } from '@/api/tool'
import { deleteKnowledgeBase, getMyKnowledgeBaseList, type MyKnowledgeBaseItem } from '@/api/knowledgeBase'

const router = useRouter()
const { t } = useI18n()

type TabType =
  | 'my-agents'
  | 'my-plugins'
  | 'my-tools'
  | 'my-knowledge-bases'
  | 'favorite-agents'
  | 'favorite-plugins'
  | 'favorite-tools'
  | 'favorite-kbs'

const tabs: Array<{ key: TabType; labelKey: string }> = [
  { key: 'my-agents', labelKey: 'profile.myAgents' },
  { key: 'my-plugins', labelKey: 'profile.mySkills' },
  { key: 'my-tools', labelKey: 'dashboard.myTools' },
  { key: 'my-knowledge-bases', labelKey: 'profile.myKnowledgeBase' },
  { key: 'favorite-agents', labelKey: 'profile.favoriteAgents' },
  { key: 'favorite-plugins', labelKey: 'profile.favoriteSkills' },
  { key: 'favorite-tools', labelKey: 'dashboard.favoriteTools' },
  { key: 'favorite-kbs', labelKey: 'profile.favoriteKnowledgeBase' },
]

const activeTab = ref<TabType>('my-agents')

const myAgents = ref<MyAgentItem[]>([])
const mySkills = ref<SkillListItem[]>([])
const myTools = ref<ToolListItem[]>([])
const myKnowledgeBases = ref<MyKnowledgeBaseItem[]>([])
const favoriteAgents = ref<FavoriteAgentItem[]>([])
const favoritePlugins = ref<FavoritePluginItem[]>([])
const favoriteTools = ref<FavoriteToolItem[]>([])
const favoriteKbs = ref<FavoriteKnowledgeBaseItem[]>([])

const loadingMyAgents = ref(false)
const loadingMyPlugins = ref(false)
const loadingMyTools = ref(false)
const loadingMyKbs = ref(false)
const loadingFavoriteAgents = ref(false)
const loadingFavoritePlugins = ref(false)
const loadingFavoriteTools = ref(false)
const loadingFavoriteKbs = ref(false)

const deleteAgentDialogVisible = ref(false)
const pendingAgentDeleteId = ref<number | null>(null)
const pendingAgentDeleteName = ref('')

const deletePluginDialogVisible = ref(false)
const pendingPluginDeleteId = ref<number | null>(null)
const pendingPluginDeleteName = ref('')

const deleteToolDialogVisible = ref(false)
const pendingToolDeleteId = ref<number | null>(null)
const pendingToolDeleteName = ref('')

const deleteKbDialogVisible = ref(false)
const pendingKbDeleteId = ref<number | null>(null)
const pendingKbDeleteName = ref('')
const deleteKbLoading = ref(false)

const favoriteDialogVisible = ref(false)
const pendingFavoriteId = ref<number | null>(null)
const pendingFavoriteName = ref('')
const pendingFavoriteType = ref<'agent' | 'plugin' | 'tool' | 'knowledge-base'>('agent')

const fetchMyAgents = async () => {
  loadingMyAgents.value = true
  try {
    const response = await getMyAgents({ pageNum: 1, pageSize: 6 })
    myAgents.value = response.data?.list?.slice(0, 6) || []
  } catch (error) {
    console.error('Failed to fetch my agents:', error)
  } finally {
    loadingMyAgents.value = false
  }
}

const fetchMySkills = async () => {
  loadingMyPlugins.value = true
  try {
    const response = await getMySkillList({ pageNum: 1, pageSize: 6 })
    mySkills.value = response.data?.list?.slice(0, 6) || []
  } catch (error) {
    console.error('Failed to fetch my skills:', error)
  } finally {
    loadingMyPlugins.value = false
  }
}

const fetchMyTools = async () => {
  loadingMyTools.value = true
  try {
    const response = await getMyToolList({ pageNum: 1, pageSize: 6 })
    myTools.value = response.data?.list?.slice(0, 6) || []
  } catch (error) {
    console.error('Failed to fetch my tools:', error)
  } finally {
    loadingMyTools.value = false
  }
}

const fetchMyKnowledgeBases = async () => {
  loadingMyKbs.value = true
  try {
    const response = await getMyKnowledgeBaseList({
      scope: 'all',
      pageNum: 1,
      pageSize: 6,
      sortBy: 'createdAtDesc',
    })
    myKnowledgeBases.value = response.data?.list?.slice(0, 6) || []
  } catch (error) {
    console.error('Failed to fetch my knowledge bases:', error)
  } finally {
    loadingMyKbs.value = false
  }
}

const fetchFavoriteAgents = async () => {
  loadingFavoriteAgents.value = true
  try {
    const response = await getMyFavoriteAgents({ pageNum: 1, pageSize: 6 })
    favoriteAgents.value = response.data?.list?.slice(0, 6) || []
  } catch (error) {
    console.error('Failed to fetch favorite agents:', error)
  } finally {
    loadingFavoriteAgents.value = false
  }
}

const fetchFavoritePlugins = async () => {
  loadingFavoritePlugins.value = true
  try {
    const response = await getMyFavoritePlugins({ pageNum: 1, pageSize: 6 })
    favoritePlugins.value = response.data?.list?.slice(0, 6) || []
  } catch (error) {
    console.error('Failed to fetch favorite skills:', error)
  } finally {
    loadingFavoritePlugins.value = false
  }
}

const fetchFavoriteTools = async () => {
  loadingFavoriteTools.value = true
  try {
    const response = await getFavoriteTools({ pageNum: 1, pageSize: 6 })
    favoriteTools.value = response.data?.list?.slice(0, 6) || []
  } catch (error) {
    console.error('Failed to fetch favorite tools:', error)
  } finally {
    loadingFavoriteTools.value = false
  }
}

const fetchFavoriteKbs = async () => {
  loadingFavoriteKbs.value = true
  try {
    const response = await getFavoriteKnowledgeBases({ pageNum: 1, pageSize: 6 })
    favoriteKbs.value = response.data?.list?.slice(0, 6) || []
  } catch (error) {
    console.error('Failed to fetch favorite knowledge bases:', error)
  } finally {
    loadingFavoriteKbs.value = false
  }
}

const switchTab = (tab: TabType) => {
  activeTab.value = tab
}

watch(activeTab, (newTab) => {
  if (newTab === 'my-agents' && myAgents.value.length === 0) {
    fetchMyAgents()
  } else if (newTab === 'my-plugins' && mySkills.value.length === 0) {
    fetchMySkills()
  } else if (newTab === 'my-tools' && myTools.value.length === 0) {
    fetchMyTools()
  } else if (newTab === 'my-knowledge-bases' && myKnowledgeBases.value.length === 0) {
    fetchMyKnowledgeBases()
  } else if (newTab === 'favorite-agents' && favoriteAgents.value.length === 0) {
    fetchFavoriteAgents()
  } else if (newTab === 'favorite-plugins' && favoritePlugins.value.length === 0) {
    fetchFavoritePlugins()
  } else if (newTab === 'favorite-tools' && favoriteTools.value.length === 0) {
    fetchFavoriteTools()
  } else if (newTab === 'favorite-kbs' && favoriteKbs.value.length === 0) {
    fetchFavoriteKbs()
  }
})

onMounted(() => {
  fetchMyAgents()
})

const handleDeleteAgentRequest = (id: number) => {
  const agent = myAgents.value.find((item) => item.id === id)
  if (!agent) return
  pendingAgentDeleteId.value = id
  pendingAgentDeleteName.value = agent.agentName
  deleteAgentDialogVisible.value = true
}

const handleDeleteAgentConfirm = async () => {
  if (pendingAgentDeleteId.value == null) return
  try {
    await deleteMyAgent(pendingAgentDeleteId.value)
    deleteAgentDialogVisible.value = false
    pendingAgentDeleteId.value = null
    pendingAgentDeleteName.value = ''
    await fetchMyAgents()
    ElMessage({
      message: t('common.deleteSuccess'),
      type: 'info',
      customClass: 'app-message-light-blue',
      duration: 2500,
    })
  } catch (error: any) {
    ElMessage({ message: error?.message || t('common.deleteFailedRetry'), type: 'error', duration: 3000 })
  }
}

const handleDeleteAgentCancel = () => {
  deleteAgentDialogVisible.value = false
  pendingAgentDeleteId.value = null
  pendingAgentDeleteName.value = ''
}

const handleDeletePluginRequest = (id: number) => {
  const skill = mySkills.value.find((item) => item.id === id)
  if (!skill) return
  pendingPluginDeleteId.value = id
  pendingPluginDeleteName.value = skill.name || ''
  deletePluginDialogVisible.value = true
}

const handleDeletePluginConfirm = async () => {
  if (pendingPluginDeleteId.value == null) return
  try {
    await deleteSkill(pendingPluginDeleteId.value)
    deletePluginDialogVisible.value = false
    pendingPluginDeleteId.value = null
    pendingPluginDeleteName.value = ''
    await fetchMySkills()
    ElMessage({
      message: t('common.deleteSuccess'),
      type: 'info',
      customClass: 'app-message-light-blue',
      duration: 2500,
    })
  } catch (error: any) {
    ElMessage({ message: error?.message || t('common.deleteFailedRetry'), type: 'error', duration: 3000 })
  }
}

const handleDeletePluginCancel = () => {
  deletePluginDialogVisible.value = false
  pendingPluginDeleteId.value = null
  pendingPluginDeleteName.value = ''
}

const handleDeleteToolRequest = (id: number) => {
  const tool = myTools.value.find((item) => item.id === id)
  if (!tool) return
  pendingToolDeleteId.value = id
  pendingToolDeleteName.value = tool.name || ''
  deleteToolDialogVisible.value = true
}

const handleDeleteToolConfirm = async () => {
  if (pendingToolDeleteId.value == null) return
  try {
    await deleteTool(pendingToolDeleteId.value)
    deleteToolDialogVisible.value = false
    pendingToolDeleteId.value = null
    pendingToolDeleteName.value = ''
    await fetchMyTools()
    ElMessage({
      message: t('common.deleteSuccess'),
      type: 'info',
      customClass: 'app-message-light-blue',
      duration: 2500,
    })
  } catch (error: any) {
    ElMessage({ message: error?.message || t('common.deleteFailedRetry'), type: 'error', duration: 3000 })
  }
}

const handleDeleteToolCancel = () => {
  deleteToolDialogVisible.value = false
  pendingToolDeleteId.value = null
  pendingToolDeleteName.value = ''
}

const handleKbDeleteRequest = (id: number) => {
  const item = myKnowledgeBases.value.find((knowledgeBase) => knowledgeBase.id === id)
  if (!item) return
  pendingKbDeleteId.value = id
  pendingKbDeleteName.value = item.name
  deleteKbDialogVisible.value = true
}

const handleKbDeleteConfirm = async () => {
  if (pendingKbDeleteId.value == null) return
  deleteKbLoading.value = true
  try {
    await deleteKnowledgeBase(pendingKbDeleteId.value)
    deleteKbDialogVisible.value = false
    pendingKbDeleteId.value = null
    pendingKbDeleteName.value = ''
    await fetchMyKnowledgeBases()
    ElMessage({
      message: t('common.deleteSuccess'),
      type: 'info',
      customClass: 'app-message-light-blue',
      duration: 2500,
    })
  } catch (error: any) {
    ElMessage({ message: error?.message || t('common.deleteFailedRetry'), type: 'error', duration: 3000 })
  } finally {
    deleteKbLoading.value = false
  }
}

const handleKbDeleteCancel = () => {
  deleteKbDialogVisible.value = false
  pendingKbDeleteId.value = null
  pendingKbDeleteName.value = ''
}

const handleCancelFavoriteAgent = (id: number) => {
  const item = favoriteAgents.value.find((agent) => agent.id === id)
  if (!item) return
  pendingFavoriteId.value = id
  pendingFavoriteName.value = item.agentName
  pendingFavoriteType.value = 'agent'
  favoriteDialogVisible.value = true
}

const handleCancelFavoritePlugin = (id: number) => {
  const item = favoritePlugins.value.find((plugin) => plugin.id === id)
  if (!item) return
  pendingFavoriteId.value = id
  pendingFavoriteName.value = item.pluginName
  pendingFavoriteType.value = 'plugin'
  favoriteDialogVisible.value = true
}

const handleCancelFavoriteTool = (id: number) => {
  const item = favoriteTools.value.find((tool) => tool.id === id)
  if (!item) return
  pendingFavoriteId.value = id
  pendingFavoriteName.value = item.toolName
  pendingFavoriteType.value = 'tool'
  favoriteDialogVisible.value = true
}

const handleCancelFavoriteKb = (id: number) => {
  const item = favoriteKbs.value.find((knowledgeBase) => knowledgeBase.id === id)
  if (!item) return
  pendingFavoriteId.value = id
  pendingFavoriteName.value = item.kbName
  pendingFavoriteType.value = 'knowledge-base'
  favoriteDialogVisible.value = true
}

const handleFavoriteDialogConfirm = async () => {
  if (pendingFavoriteId.value == null) return
  try {
    const id = pendingFavoriteId.value
    const type = pendingFavoriteType.value
    if (type === 'agent') {
      await cancelFavoriteAgent(id)
      await fetchFavoriteAgents()
    } else if (type === 'plugin') {
      await cancelFavoritePlugin(id)
      await fetchFavoritePlugins()
    } else if (type === 'tool') {
      await cancelMyFavoriteTool(id)
      await fetchFavoriteTools()
    } else {
      await cancelMyFavoriteKnowledgeBase(id)
      await fetchFavoriteKbs()
    }
    favoriteDialogVisible.value = false
    pendingFavoriteId.value = null
    pendingFavoriteName.value = ''
    ElMessage({
      message: t('common.unfavoriteSuccess'),
      type: 'info',
      customClass: 'app-message-light-blue',
      duration: 2000,
    })
  } catch (error: any) {
    ElMessage({ message: error?.message || t('common.unfavoriteFailedRetry'), type: 'error', duration: 3000 })
  }
}

const handleFavoriteDialogCancel = () => {
  favoriteDialogVisible.value = false
  pendingFavoriteId.value = null
  pendingFavoriteName.value = ''
}
</script>

<template>
  <div class="my-content-tabs">
    <div class="tabs-header">
      <h2 class="tabs-title">{{ t('dashboard.myContent') }}</h2>
      <div class="tabs-nav">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>
    </div>

    <div class="tabs-content">
      <div v-if="activeTab === 'my-agents'">
        <div v-if="loadingMyAgents" class="loading-state">{{ t('common.loading') }}</div>
        <div v-else-if="myAgents.length === 0" class="empty-state">{{ t('dashboard.noAgents') }}</div>
        <div v-else class="content-grid">
          <MyAgentCard
            v-for="item in myAgents"
            :key="item.id"
            :agent="item"
            @delete="handleDeleteAgentRequest"
          />
        </div>
      </div>

      <div v-if="activeTab === 'my-plugins'">
        <div v-if="loadingMyPlugins" class="loading-state">{{ t('common.loading') }}</div>
        <div v-else-if="mySkills.length === 0" class="empty-state">{{ t('dashboard.noSkills') }}</div>
        <div v-else class="content-grid">
          <MySkillCard
            v-for="item in mySkills"
            :key="item.id"
            :skill="item"
            @delete="handleDeletePluginRequest"
          />
        </div>
      </div>

      <div v-if="activeTab === 'my-tools'">
        <div v-if="loadingMyTools" class="loading-state">{{ t('common.loading') }}</div>
        <div v-else-if="myTools.length === 0" class="empty-state">{{ t('dashboard.noTools') }}</div>
        <div v-else class="content-grid">
          <MyToolCard
            v-for="item in myTools"
            :key="item.id"
            :tool="item"
            @delete="handleDeleteToolRequest"
          />
        </div>
      </div>

      <div v-if="activeTab === 'my-knowledge-bases'">
        <div v-if="loadingMyKbs" class="loading-state">{{ t('common.loading') }}</div>
        <div v-else-if="myKnowledgeBases.length === 0" class="empty-state">{{ t('dashboard.noKnowledgeBases') }}</div>
        <div v-else class="content-grid">
          <KnowledgeBaseCard
            v-for="item in myKnowledgeBases"
            :key="item.id"
            :item="item"
            :delete-loading="deleteKbLoading && pendingKbDeleteId === item.id"
            :delete-disabled="deleteKbLoading || deleteKbDialogVisible"
            @edit="(id) => router.push(`/my/knowledge/${id}/edit`)"
            @manage-docs="(id) => router.push(`/my/knowledge/${id}/documents`)"
            @delete="handleKbDeleteRequest"
          />
        </div>
      </div>

      <div v-if="activeTab === 'favorite-agents'">
        <div v-if="loadingFavoriteAgents" class="loading-state">{{ t('common.loading') }}</div>
        <div v-else-if="favoriteAgents.length === 0" class="empty-state">{{ t('dashboard.noFavoriteAgents') }}</div>
        <div v-else>
          <FavoriteAgentCardList
            :agents="favoriteAgents"
            @cancel-favorite="handleCancelFavoriteAgent"
          />
        </div>
      </div>

      <div v-if="activeTab === 'favorite-plugins'">
        <div v-if="loadingFavoritePlugins" class="loading-state">{{ t('common.loading') }}</div>
        <div v-else-if="favoritePlugins.length === 0" class="empty-state">{{ t('dashboard.noFavoriteSkills') }}</div>
        <div v-else>
          <FavoritePluginCardList
            :plugins="favoritePlugins"
            @cancel-favorite="handleCancelFavoritePlugin"
          />
        </div>
      </div>

      <div v-if="activeTab === 'favorite-tools'">
        <div v-if="loadingFavoriteTools" class="loading-state">{{ t('common.loading') }}</div>
        <div v-else-if="favoriteTools.length === 0" class="empty-state">{{ t('dashboard.noFavoriteTools') }}</div>
        <div v-else>
          <FavoriteToolCardList :tools="favoriteTools" @cancel-favorite="handleCancelFavoriteTool" />
        </div>
      </div>

      <div v-if="activeTab === 'favorite-kbs'">
        <div v-if="loadingFavoriteKbs" class="loading-state">{{ t('common.loading') }}</div>
        <div v-else-if="favoriteKbs.length === 0" class="empty-state">{{ t('dashboard.noFavoriteKnowledgeBases') }}</div>
        <div v-else>
          <FavoriteKnowledgeBaseCardList
            :items="favoriteKbs"
            @cancel-favorite="handleCancelFavoriteKb"
          />
        </div>
      </div>
    </div>

    <MyAgentDeleteDialog
      :visible="deleteAgentDialogVisible"
      :agent-name="pendingAgentDeleteName"
      @confirm="handleDeleteAgentConfirm"
      @cancel="handleDeleteAgentCancel"
    />

    <MyPluginDeleteDialog
      :visible="deletePluginDialogVisible"
      :plugin-name="pendingPluginDeleteName"
      @confirm="handleDeletePluginConfirm"
      @cancel="handleDeletePluginCancel"
    />

    <MyPluginDeleteDialog
      :visible="deleteToolDialogVisible"
      :plugin-name="pendingToolDeleteName"
      entity-label="tool"
      @confirm="handleDeleteToolConfirm"
      @cancel="handleDeleteToolCancel"
    />

    <DeleteKnowledgeBaseDialog
      :visible="deleteKbDialogVisible"
      :knowledge-base-name="pendingKbDeleteName"
      :confirm-loading="deleteKbLoading"
      @confirm="handleKbDeleteConfirm"
      @cancel="handleKbDeleteCancel"
    />

    <CancelFavoriteDialog
      :visible="favoriteDialogVisible"
      :item-name="pendingFavoriteName"
      :item-type="pendingFavoriteType"
      @confirm="handleFavoriteDialogConfirm"
      @cancel="handleFavoriteDialogCancel"
    />
  </div>
</template>

<style scoped>
.my-content-tabs {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.tabs-header {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tabs-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.01em;
}

.tabs-nav {
  display: flex;
  gap: 12px;
  padding: 6px;
  background: #f5f5f5;
  border-radius: 10px;
  overflow-x: auto;
}

.tab-btn {
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  color: #737373;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #525252;
}

.tab-btn.active {
  background: #ffffff;
  color: #1a1a1a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.tabs-content {
  min-height: 400px;
}

.my-content-tabs :deep(.agent-card),
.my-content-tabs :deep(.plugin-card) {
  background: #ffffff;
}

.my-content-tabs :deep(.card-grid) {
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.loading-state,
.empty-state {
  padding: 80px 24px;
  text-align: center;
  font-size: 14px;
  color: #a3a3a3;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .tabs-title {
    font-size: 20px;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .my-content-tabs :deep(.card-grid) {
    grid-template-columns: 1fr;
  }

  .tab-btn {
    padding: 10px 18px;
    font-size: 13px;
  }
}
</style>
