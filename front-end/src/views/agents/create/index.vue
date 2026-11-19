<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AgentModelSelector from '@/components/agents/create/AgentModelSelector.vue'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import {
  CreateAgentHeader,
  AgentBasicInfoCard,
  AgentWorkflowNav,
  AgentConfigPanel,
  AgentPromptEditor,
} from './components'
import type { BasicInfo, NavItem } from './components'
import {
  SKILL_OPTIONS,
  AGENT_DEFINITIONS,
  DEFAULT_PROMPTS,
} from '@/mock/agentCreate'
import type { AgentConfig } from '@/types/modules/agentCreate'
import { getAgentEditDetail, publishAgent, saveAgentDraft, uploadAgentIcon } from '@/api/agent'
import type { AgentBoundKbItem, AgentBoundSkillItem, AgentBoundToolItem } from '@/api/agent'
import {
  buildConfigData,
  createInitialAgentConfigs,
  SHORT_KEY_BY_AGENT_ID,
  validateAgentCreateForm,
} from './hooks/useAgentCreateHelpers'
import { getAvailableModels, matchPersonalModel, type UserLlmModel } from '@/api/llm'
const personalModels = ref<UserLlmModel[]>([])
const assistantFollowsDp = ref(true)
const modelsLoading = ref(false)
const modelsError = ref('')
let modelRequest = 0
const assistantUserModelId = ref('')
const previousModels = ref<Record<string, string>>({})
const MODEL_OPTIONS = computed(() => personalModels.value.map(m => ({ value: m.id, label: `${m.displayName} · ${m.connectionName}`, provider: m.providerCode, description: m.modelCode })))
async function refreshModels() {
  const request = ++modelRequest
  modelsLoading.value = true
  try {
    const result = await getAvailableModels()
    if (request !== modelRequest) return
    personalModels.value = result.data || []; modelsError.value = ''
  } catch { if (request === modelRequest) modelsError.value = t('llm.selection.loadFailed') }
  finally { if (request === modelRequest) modelsLoading.value = false }
}

const agentId = ref<number | null>(null)
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

type PageMode = 'create' | 'edit'
const mode = computed<PageMode>(() => (route.params?.id ? 'edit' : 'create'))
const isEditMode = computed(() => mode.value === 'edit')

const detailLoading = ref(false)
const hasLoadedDetail = ref(false)

const basicInfo = ref<BasicInfo>({
  name: '',
  description: '',
  icon: 'system-1',
  isPublic: true,
  releaseNote: '',
})

const agentConfigs = ref<Record<string, AgentConfig>>(
  createInitialAgentConfigs(AGENT_DEFINITIONS, DEFAULT_PROMPTS),
)

const effectiveAssistant = computed(() => assistantFollowsDp.value ? agentConfigs.value['data-processor']?.model || '' : assistantUserModelId.value)
const assistantLabel = computed(() => MODEL_OPTIONS.value.find(m => m.value === effectiveAssistant.value)?.label || t('llm.selection.unselected'))
function validateModels() {
  const ids = [...Object.values(agentConfigs.value).map(c => c.model), effectiveAssistant.value]
  if (ids.some(id => !personalModels.value.some(m => m.id === id))) {
    ElMessage.warning(t('llm.selection.invalidSelection')); return false
  }
  return true
}

const activeAgentId = ref(AGENT_DEFINITIONS[0]!.id)

const activeAgent = computed(
  () => AGENT_DEFINITIONS.find((d) => d.id === activeAgentId.value)!,
)

const activeConfig = computed(() => agentConfigs.value[activeAgentId.value]!)

const updateActiveConfig = (val: AgentConfig) => {
  agentConfigs.value[activeAgentId.value] = val
}

/** 中间栏编辑当前阶段系统提示词（与智能体配置共用同一 AgentConfig） */
const patchActiveSystemPrompt = (systemPrompt: string) => {
  const id = activeAgentId.value
  const cur = agentConfigs.value[id]
  if (!cur) return
  agentConfigs.value[id] = { ...cur, systemPrompt }
}

const navItems = computed<NavItem[]>(() =>
  AGENT_DEFINITIONS.map((def) => ({
    ...def,
    isConfigured:
      !!agentConfigs.value[def.id]?.model &&
      !!agentConfigs.value[def.id]?.systemPrompt.trim(),
  })),
)

const savingDraft = ref(false)
const publishing = ref(false)
const uploadingIcon = ref(false)


const loadAgentDetail = async (id: number) => {
  if (detailLoading.value) return
  detailLoading.value = true
  try {
    const res = await getAgentEditDetail(id)
    const d = res?.data
    if (!d || typeof d.id !== 'number') {
      throw new Error(t('agentCreate.page.loadDetailInvalid'))
    }

    agentId.value = d.id
    basicInfo.value = {
      ...basicInfo.value,
      name: d.agentName || '',
      description: d.agentDescription || '',
      icon: d.agentIcon || basicInfo.value.icon,
      isPublic: (d.isPublic || 0) === 1,
      // 当前后端草稿保存逻辑会将 configData 收敛为 dp/fe/ms/hd/ra，不包含 releaseNote
      releaseNote: basicInfo.value.releaseNote || '',
    }

    const compact = (d.stageConfigs || d.configData || {}) as Record<string, unknown>
    const boundMap = (d.boundSkills || d.stageBoundSkills || {}) as Record<string, AgentBoundSkillItem[]>
    const boundToolsMap = (d.boundTools || {}) as Record<string, AgentBoundToolItem[]>
    const boundKbMap = (d.boundKnowledgeBases || {}) as Record<string, AgentBoundKbItem[]>

    for (const def of AGENT_DEFINITIONS) {
      const shortKey = SHORT_KEY_BY_AGENT_ID[def.id]
      const cfg = shortKey ? (compact?.[shortKey] as Record<string, unknown> | undefined) : undefined
      if (!cfg) continue

      previousModels.value[def.id] = String(cfg.model || '')
      const base = agentConfigs.value[def.id]
      const selectedRaw = Array.isArray(cfg.selectedSkillIds) ? cfg.selectedSkillIds : []
      const selected = selectedRaw.map((x: unknown) => String(x))
      const selectedToolRaw = Array.isArray(cfg.selectedToolIds) ? cfg.selectedToolIds : []
      const selectedTools = selectedToolRaw.map((x: unknown) => String(x))
      const selectedKbRaw = Array.isArray(cfg.selectedKbIds) ? cfg.selectedKbIds : []
      const selectedKbIds = selectedKbRaw.map((x: unknown) => String(x))

      const stageMeta: Record<string, { name: string; icon?: string }> = {}
      const boundList = shortKey ? (boundMap?.[shortKey] || []) : []
      for (const s of boundList) {
        const sid = String(s?.skillId || '')
        if (!sid) continue
        stageMeta[sid] = { name: s?.skillName || t('agentCreate.page.skillFallback', { id: sid }), icon: '' }
      }
      for (const sid of selected) {
        if (!stageMeta[sid]) {
          stageMeta[sid] =
            base?.selectedSkillMeta?.[sid] ||
            base?.selectedPluginMeta?.[sid] ||
            { name: t('agentCreate.page.skillFallback', { id: sid }), icon: '' }
        }
      }

      const toolMeta: Record<string, { name: string; icon?: string }> = {}
      const boundToolList = shortKey ? boundToolsMap?.[shortKey] || [] : []
      for (const toolItem of boundToolList) {
        const tid = String(toolItem?.toolId || '')
        if (!tid) continue
        toolMeta[tid] = { name: toolItem?.toolName || t('agentCreate.page.toolFallback', { id: tid }), icon: '' }
      }
      for (const tid of selectedTools) {
        if (!toolMeta[tid]) {
          toolMeta[tid] = base?.selectedToolMeta?.[tid] || { name: t('agentCreate.page.toolFallback', { id: tid }), icon: '' }
        }
      }

      const kbMeta: Record<string, { name: string; icon?: string }> = {}
      const boundKbList = shortKey ? boundKbMap?.[shortKey] || [] : []
      for (const k of boundKbList) {
        const kid = String(k?.kbId || '')
        if (!kid) continue
        kbMeta[kid] = { name: k?.kbName || t('agentCreate.page.kbFallback', { id: kid }), icon: '' }
      }
      for (const kid of selectedKbIds) {
        if (!kbMeta[kid]) {
          kbMeta[kid] = base?.selectedKbMeta?.[kid] || { name: t('agentCreate.page.kbFallback', { id: kid }), icon: '' }
        }
      }

      const gapRaw = cfg.allowSkillGapActions ?? (cfg as { allow_skill_gap_actions?: unknown }).allow_skill_gap_actions
      const allowSkillGapActions =
        gapRaw === true ||
        gapRaw === 1 ||
        (typeof gapRaw === 'string' && gapRaw.trim() === '1') ||
        (typeof gapRaw === 'string' && gapRaw.toLowerCase() === 'true')

      agentConfigs.value[def.id] = {
        id: def.id,
        name: def.name,
        model: d.personalLlmBindings?.[shortKey || ''] || matchPersonalModel(personalModels.value, String(cfg.model || ''), String(cfg.providerCode || '')),
        systemPrompt: typeof cfg.systemPrompt === 'string' ? cfg.systemPrompt : (base?.systemPrompt || ''),
        selectedSkills: selected,
        selectedTools,
        selectedKbIds,
        selectedSkillMeta: { ...base?.selectedSkillMeta, ...base?.selectedPluginMeta, ...stageMeta },
        selectedToolMeta: { ...base?.selectedToolMeta, ...toolMeta },
        selectedKbMeta: { ...base?.selectedKbMeta, ...kbMeta },
        isAutoGenerateSkill: false,
        lockSkillScope: !!cfg.lockSkillScope,
        selectedPlugins: selected,
        selectedPluginMeta: { ...base?.selectedPluginMeta, ...stageMeta },
        autoGeneratePlugin: false,
        useOnlySelectedPlugins: !!cfg.lockSkillScope,
        allowSkillGapActions,
      } satisfies AgentConfig
    }

    const assistant = compact.assistant as { model?: string; providerCode?: string } | undefined
    assistantUserModelId.value = d.personalLlmBindings?.assistant || matchPersonalModel(personalModels.value, assistant?.model || '', assistant?.providerCode)
    assistantFollowsDp.value = !!assistantUserModelId.value && assistantUserModelId.value === agentConfigs.value['data-processor']?.model
    hasLoadedDetail.value = true
  } catch (e: any) {
    ElMessage({ message: e?.message || t('agentCreate.page.loadDetailFailed'), type: 'error', duration: 3500 })
  } finally {
    detailLoading.value = false
  }
}

const handleSaveDraft = async () => {
  if (savingDraft.value) return
  if (!basicInfo.value.name.trim()) {
    ElMessage({ message: t('agentCreate.page.fillNameBeforeDraft'), type: 'warning', duration: 2500 })
    return
  }
  const draftErr = validateAgentCreateForm(basicInfo.value, agentConfigs.value, AGENT_DEFINITIONS, t)
  if (draftErr) {
    ElMessage({ message: draftErr, type: 'warning', duration: 4200 })
    return
  }

  if (!validateModels()) return
  const payload = {
    agentId: agentId.value || undefined,
    agentName: basicInfo.value.name.trim(),
    agentDescription: basicInfo.value.description?.trim() || '',
    agentIcon: basicInfo.value.icon,
    isPublic: basicInfo.value.isPublic ? 1 : 0,
    publishRemark: basicInfo.value.releaseNote?.trim() || '',
    configData: buildConfigData(
      basicInfo.value,
      activeAgentId.value,
      agentConfigs.value,
      AGENT_DEFINITIONS,
      effectiveAssistant.value || undefined,
    ),
  }

  savingDraft.value = true
  try {
    const res = await saveAgentDraft(payload)
    if (!agentId.value && res.data.agentId) {
      agentId.value = res.data.agentId
    }
    ElMessage({
      message: res.data.message || t('agentCreate.page.draftSaved'),
      type: 'success',
      duration: 2000,
    })
    router.back()
  } catch (error: any) {
    const message = error?.message || t('agentCreate.page.draftSaveFailed')
    ElMessage({ message, type: 'error', duration: 3000 })
  } finally {
    savingDraft.value = false
  }
}

const handlePublish = async () => {
  if (publishing.value) return
  const error = validateAgentCreateForm(basicInfo.value, agentConfigs.value, AGENT_DEFINITIONS, t)
  if (error) {
    ElMessage({ message: error, type: 'warning', duration: 3000 })
    return
  }

  if (!validateModels()) return
  const payload = {
    agentId: agentId.value || undefined,
    agentName: basicInfo.value.name.trim(),
    agentDescription: basicInfo.value.description?.trim() || '',
    agentIcon: basicInfo.value.icon,
    isPublic: basicInfo.value.isPublic ? 1 : 0,
    publishRemark: basicInfo.value.releaseNote?.trim() || '',
    configData: buildConfigData(
      basicInfo.value,
      activeAgentId.value,
      agentConfigs.value,
      AGENT_DEFINITIONS,
      effectiveAssistant.value || undefined,
    ),
  }

  publishing.value = true
  try {
    const res = await publishAgent(payload)
    const data = res?.data
    if (data?.agentId) {
      agentId.value = data.agentId
    }
    ElMessage({
      message: res?.message || t('agentCreate.page.publishSuccess'),
      type: 'success',
      duration: 2000,
    })
    // 发布成功后返回上级界面（如「我的智能体」或进入本页的来源）
    router.back()
  } catch (e: any) {
    ElMessage({
      message: e?.message || t('agentCreate.page.publishFailed'),
      type: 'error',
      duration: 3000,
    })
  } finally {
    publishing.value = false
  }
}

const handleUploadIcon = async (file: File) => {
  if (uploadingIcon.value) return
  uploadingIcon.value = true
  try {
    const res = await uploadAgentIcon(file)
    const iconUrl = res?.data || ''
    if (iconUrl) {
      basicInfo.value = { ...basicInfo.value, icon: iconUrl }
    }
    ElMessage({
      message: res?.message || t('agentCreate.page.iconUpdated'),
      type: 'success',
      duration: 2000,
    })
  } catch (e: any) {
    ElMessage({
      message: e?.message || t('agentCreate.page.iconUploadFailed'),
      type: 'error',
      duration: 3000,
    })
  } finally {
    uploadingIcon.value = false
  }
}

// 右侧对话区与「智能体流程」下方对齐：用左侧高度限制右侧最大高度
const workspaceSidebarRef = ref<HTMLElement | null>(null)
const workspaceConfigRef = ref<HTMLElement | null>(null)
const workspacePromptRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null
let resizeListener: (() => void) | null = null

function syncChatHeightToSidebar() {
  nextTick(() => {
    const sidebar = workspaceSidebarRef.value
    if (!sidebar) return
    const h = sidebar.offsetHeight
    const promptCol = workspacePromptRef.value
    const config = workspaceConfigRef.value
    if (promptCol) promptCol.style.maxHeight = `${h}px`
    if (config) config.style.maxHeight = `${h}px`
  })
}

watch(
  () => hasLoadedDetail.value,
  () => {
    syncChatHeightToSidebar()
  },
  { immediate: true }
)

// 本页挂载时预留滚动条占位，避免保存草稿提示/焦点等导致滚动条显隐时整页宽度抖动
onMounted(async () => {
  window.addEventListener('focus', refreshModels)
  await refreshModels()
  document.documentElement.style.setProperty('scrollbar-gutter', 'stable')
  resizeListener = () => syncChatHeightToSidebar()
  window.addEventListener('resize', resizeListener)
  resizeObserver = new ResizeObserver(() => syncChatHeightToSidebar())
  nextTick(() => {
    syncChatHeightToSidebar()
    if (workspaceSidebarRef.value) resizeObserver?.observe(workspaceSidebarRef.value)
  })
  if (isEditMode.value) {
    const idNum = Number(route.params?.id)
    if (Number.isFinite(idNum) && idNum > 0) {
      // edit 模式：优先加载详情，避免默认模板覆盖/闪烁
      loadAgentDetail(idNum)
    } else {
      ElMessage({ message: t('agentCreate.page.invalidAgentId'), type: 'warning', duration: 2500 })
    }
  }
})
onUnmounted(() => {
  modelRequest++
  window.removeEventListener('focus', refreshModels)
  document.documentElement.style.removeProperty('scrollbar-gutter')
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeListener) window.removeEventListener('resize', resizeListener)
  resizeListener = null
})
</script>

<template>
  <div class="create-agent-page">
    <DashboardHeader />
    <main class="page-main">
      <div class="page-container">
        <!-- 顶部标题与操作按钮 -->
        <CreateAgentHeader
          :mode="mode"
          :saving-draft="savingDraft"
          :publishing="publishing"
          @save-draft="handleSaveDraft"
          @publish="handlePublish"
        />

        <div v-if="isEditMode && !hasLoadedDetail" class="loading-state">
          <span class="loading-spinner"></span>
          <span>{{ detailLoading ? t('agentCreate.page.loadingDetail') : t('agentCreate.page.preparingLoad') }}</span>
        </div>

        <!-- 三栏工作区：左基础配置+流程导航 / 中系统提示词 / 右智能体配置 -->
        <div v-else class="workspace">
          <!-- 左侧：基础配置 + 智能体流程 -->
          <section ref="workspaceSidebarRef" class="workspace__sidebar">
            <div class="sidebar-card sidebar-card--basic">
              <header class="module-header">
                <h2 class="module-header__title">{{ t('agentCreate.page.basicConfig') }}</h2>
                <p class="module-header__subtitle">{{ t('agentCreate.page.basicConfigSubtitle') }}</p>
              </header>
              <AgentBasicInfoCard
                v-model="basicInfo"
                :uploading-icon="uploadingIcon"
                :recover-agent-id="agentId"
                @upload-icon="handleUploadIcon"
              />
            </div>

            <div class="assistant-card">
              <h2>{{ t('llm.selection.assistant') }}</h2>
              <label class="follow-dp"><input v-model="assistantFollowsDp" type="checkbox" />{{ t('llm.selection.followDp') }}</label>
              <p v-if="assistantFollowsDp" class="assistant-summary">{{ assistantLabel }}</p>
              <AgentModelSelector v-else v-model="assistantUserModelId" :options="MODEL_OPTIONS" :loading="modelsLoading" :error="modelsError" @refresh="refreshModels" />
            </div>
            <div class="sidebar-card sidebar-card--nav">
              <header class="module-header">
                <h2 class="module-header__title">{{ t('agentCreate.page.workflow') }}</h2>
                <p class="module-header__subtitle">{{ t('agentCreate.page.workflowSubtitle') }}</p>
              </header>
              <AgentWorkflowNav
                :items="navItems"
                :active-id="activeAgentId"
                @select="activeAgentId = $event"
              />
            </div>
          </section>

          <!-- 中间：当前阶段系统提示词（高度与左侧一致，内部滚动） -->
          <section ref="workspacePromptRef" class="workspace__prompt">
            <header class="module-header">
              <h2 class="module-header__title">{{ t('agentCreate.page.systemPrompt') }}</h2>
              <p class="module-header__subtitle">
                {{ t('agentCreate.page.systemPromptSubtitle') }}
              </p>
            </header>
            <div class="workspace__prompt-body">
              <AgentPromptEditor
                :model-value="activeConfig.systemPrompt"
                :default-prompt="DEFAULT_PROMPTS[activeAgent.id] || ''"
                :agent-name="activeAgent.name"
                @update:model-value="patchActiveSystemPrompt"
              />
            </div>
          </section>

          <!-- 右侧：当前子智能体核心配置 -->
          <section ref="workspaceConfigRef" class="workspace__config">
            <header class="module-header">
              <h2 class="module-header__title">{{ t('agentCreate.page.agentConfig') }}</h2>
              <p class="module-header__subtitle">{{ t('agentCreate.page.agentConfigSubtitle') }}</p>
            </header>
            <div class="workspace__config-body">
              <AgentConfigPanel
                :config="activeConfig"
                :agent-id="activeAgent.id"
                :agent-name="activeAgent.name"
                :model-options="MODEL_OPTIONS"
                :models-loading="modelsLoading" :models-error="modelsError" :previous-model="previousModels[activeAgentId]" @refresh-models="refreshModels"
                :skill-options="SKILL_OPTIONS"
                @update:config="updateActiveConfig"
              />
            </div>
          </section>
        </div>
      </div>
    </main>

  </div>
</template>

<style scoped>
.assistant-card { padding: 16px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; min-width:0; }
.assistant-card h2 { font-size:14px; margin:0 0 12px; }
.follow-dp { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#525252; margin-bottom:12px; }
.follow-dp input { accent-color:#111827; }
.assistant-summary { font-size:12px; color:#737373; overflow-wrap:anywhere; margin:0; }


.create-agent-page {
  min-height: 100vh;
  background: var(--app-color-bg-workbench);
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  padding-top: 90px;
  padding-bottom: 0;
}

.page-container {
  max-width: 1560px;
  margin: 0 auto;
  padding: 24px 36px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.7);
  color: #6b7280;
  font-size: 14px;
}
.loading-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-top-color: rgba(0, 0, 0, 0.5);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 三栏工作区：左栏固定宽 / 中间系统提示词（较宽） / 右侧智能体配置 */
.workspace {
  display: grid;
  grid-template-columns: 280px minmax(380px, 1.6fr) minmax(320px, 1fr);
  gap: 16px;
  align-items: stretch;
}

.workspace__sidebar,
.workspace__config,
.workspace__prompt {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.workspace__prompt-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.workspace__prompt-body :deep(.prompt-editor) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.workspace__prompt-body :deep(.editor-card) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.workspace__prompt-body :deep(.prompt-textarea) {
  flex: 1;
  min-height: 200px;
}

.workspace__config-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-card {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-card--basic {
  flex-shrink: 0;
}

/* 与中间「系统提示词」同高：流程卡片在侧栏内占满网格行剩余高度 */
.sidebar-card--nav {
  flex: 1;
  min-height: 0;
}

/* 左右三栏统一模块头部：同一结构、同一套样式，保证标题/副说明间距严格对齐 */
.module-header {
  flex-shrink: 0;
  min-height: 52px;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.module-header__title {
  margin: 0 0 4px;
  padding: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.25;
  color: #111827;
}

.module-header__subtitle {
  margin: 0;
  padding: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: #6b7280;
}

.center-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 1280px) {
  .workspace {
    grid-template-columns: 250px minmax(340px, 1.5fr) minmax(300px, 1fr);
  }
}

@media (max-width: 1024px) {
  .workspace {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }
  /* 第三块「智能体配置」独占一行（原为提示词跨列） */
  .workspace__config {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .page-main { padding-top:76px; }
  .page-container { padding: 16px 16px 0; gap: 12px; }
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
