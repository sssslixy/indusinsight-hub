<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import CreatePluginHeader from '@/components/plugins/create/CreatePluginHeader.vue'
import ToolBasicForm from '@/components/tools/create/ToolBasicForm.vue'
import ToolArtifactForm from '@/components/tools/create/ToolArtifactForm.vue'
import ToolManifestForm from '@/components/tools/create/ToolManifestForm.vue'
import ToolRuntimeForm from '@/components/tools/create/ToolRuntimeForm.vue'
import {
  getToolDetail,
  publishTool,
  saveToolDraft,
  uploadToolIcon,
  addToolView,
  checkFavoriteTool,
  addFavoriteTool,
  cancelFavoriteTool,
  downloadToolArtifact,
  type ToolDraftPublishRequest,
} from '@/api/tool'
import {
  buildSkillManifestSchemasOnly,
  createDefaultManifestFormState,
  hydrateManifestFormFromJson,
} from '@/utils/skills/skillManifestBuilder'
import type {
  ToolArtifactFormState,
  ToolBasicFormState,
  ToolManifestFormState,
  ToolRuntimeFormState,
  ToolSaveIntent,
} from '@/types/tools/toolCreate'
import type { SkillCategoryCode } from '@/constants/skillCategoryCodes'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

type PageMode = 'create' | 'edit'
const mode = computed<PageMode>(() => (route.params?.id || route.query?.id ? 'edit' : 'create'))
const isEditMode = computed(() => mode.value === 'edit')
const fromCommunity = computed(() => route.query?.from === 'community')
const readOnly = computed(() => fromCommunity.value)

const routeToolId = computed<number | null>(() => {
  const raw = route.params?.id ?? route.query?.id
  const idNum = Number(raw)
  return Number.isFinite(idNum) && idNum > 0 ? idNum : null
})

const basicForm = ref<ToolBasicFormState>({
  name: '',
  description: '',
  categoryCode: '',
  isPublic: true,
  icon: 'system-1',
})

const artifactForm = ref<ToolArtifactFormState>({
  pyFile: null,
  entryFunction: 'run',
})

const runtimeForm = ref<ToolRuntimeFormState>({
  timeoutMs: 120000,
  retryTimes: 0,
  requiresGpu: false,
})

const manifestForm = ref<ToolManifestFormState>(createDefaultManifestFormState())

const currentToolId = ref<number | null>(null)
const savingDraft = ref(false)
const publishingTool = ref(false)
const uploadingIcon = ref(false)
const detailLoading = ref(false)
const hasLoadedDetail = ref(false)
const hasArtifactOnServer = ref(false)

const isFavorited = ref(false)
const favoriteLoading = ref(false)
const downloadingToolFile = ref(false)
const lastViewRecordedToolId = ref<number | null>(null)

/** 上传返回 http(s)；内置选图为 system-1…system-4，须原样提交给后端落库 */
function iconUrlForApi(icon: string): string | undefined {
  const t = (icon || '').trim()
  if (!t) return undefined
  if (/^https?:\/\//i.test(t)) return t
  const m = t.match(/^system-([1-4])$/i)
  if (m) return `system-${m[1]}`
  return undefined
}

/**
 * 提交给后端的 iconUrl 必须是 string：FormData 里对 data 做 JSON.stringify 时，
 * undefined 字段会被省略，后端收不到 iconUrl，导致库里为空。
 */
function iconUrlForPayload(): string {
  return iconUrlForApi(basicForm.value.icon) ?? 'system-1'
}

function validateManifestJson(): boolean {
  const labels: Array<[string, string]> = [
    [t('create.page.inputSchema'), manifestForm.value.inputSchemaText],
    [t('create.page.outputSchema'), manifestForm.value.outputSchemaText],
  ]
  for (const [label, text] of labels) {
    const trimmedText = (text || '').trim()
    if (!trimmedText) continue
    try {
      JSON.parse(trimmedText)
    } catch {
      ElMessage({ message: t('create.page.invalidJson', { label }), type: 'warning', duration: 2500 })
      return false
    }
  }
  return true
}

function validateForIntent(intent: ToolSaveIntent): boolean {
  if (!basicForm.value.name.trim()) {
    ElMessage({ message: t('create.page.enterToolName'), type: 'warning', duration: 2500 })
    return false
  }
  if (!basicForm.value.categoryCode) {
    ElMessage({ message: t('create.page.selectCategory'), type: 'warning', duration: 2500 })
    return false
  }
  if (!artifactForm.value.pyFile && !hasArtifactOnServer.value) {
    ElMessage({
      message:
        intent === 'publish'
          ? t('create.page.uploadPyBeforePublish')
          : t('create.page.uploadPyBeforeDraft'),
      type: 'warning',
      duration: 2500,
    })
    return false
  }
  if (!artifactForm.value.entryFunction.trim()) {
    artifactForm.value.entryFunction = 'run'
  }
  if (!validateManifestJson()) return false
  if (intent === 'publish') {
    const timeoutMs = Number(runtimeForm.value.timeoutMs)
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      ElMessage({ message: t('create.page.timeoutMustBePositive'), type: 'warning', duration: 2500 })
      return false
    }
    const r = Number(runtimeForm.value.retryTimes)
    if (!Number.isFinite(r) || !Number.isInteger(r) || r < 0) {
      ElMessage({ message: t('create.page.retryMustBeNonNegativeInteger'), type: 'warning', duration: 2500 })
      return false
    }
  }
  return true
}

function buildPayload(): ToolDraftPublishRequest | null {
  if (!validateForIntent('draft')) return null
  const toolMetadata = JSON.stringify(buildSkillManifestSchemasOnly(manifestForm.value))
  return {
    toolId: currentToolId.value,
    name: basicForm.value.name.trim(),
    description: basicForm.value.description.trim() || undefined,
    categoryCode: basicForm.value.categoryCode as string,
    isPublic: basicForm.value.isPublic ? 1 : 0,
    iconUrl: iconUrlForPayload(),
    entryFunction: artifactForm.value.entryFunction.trim(),
    fileName: artifactForm.value.pyFile?.name?.trim() || undefined,
    timeoutMs: runtimeForm.value.timeoutMs,
    retryTimes: runtimeForm.value.retryTimes,
    requiresGpu: runtimeForm.value.requiresGpu,
    toolMetadata,
  }
}

function buildPayloadForPublish(): ToolDraftPublishRequest | null {
  if (!validateForIntent('publish')) return null
  const toolMetadata = JSON.stringify(buildSkillManifestSchemasOnly(manifestForm.value))
  return {
    toolId: currentToolId.value,
    name: basicForm.value.name.trim(),
    description: basicForm.value.description.trim() || undefined,
    categoryCode: basicForm.value.categoryCode as string,
    isPublic: basicForm.value.isPublic ? 1 : 0,
    iconUrl: iconUrlForPayload(),
    entryFunction: artifactForm.value.entryFunction.trim(),
    fileName: artifactForm.value.pyFile?.name?.trim() || undefined,
    timeoutMs: runtimeForm.value.timeoutMs,
    retryTimes: runtimeForm.value.retryTimes,
    requiresGpu: runtimeForm.value.requiresGpu,
    toolMetadata,
  }
}

async function handleSaveDraft() {
  if (savingDraft.value || readOnly.value) return
  const payload = buildPayload()
  if (!payload) return
  savingDraft.value = true
  try {
    const res = await saveToolDraft(payload, artifactForm.value.pyFile)
    const pid = res?.data?.toolId
    if (typeof pid === 'number' && pid > 0) {
      currentToolId.value = pid
      hasLoadedDetail.value = true
      hasArtifactOnServer.value = true
      if (!route.params?.id && !route.query?.id) {
        router.replace({ query: { ...route.query, id: String(pid) } })
      }
      await loadToolDetailData(pid)
    }
    ElMessage({ message: res?.message || t('create.page.draftSaved'), type: 'success', duration: 2000 })
  } catch (e: any) {
    const msg = e?.message || t('create.page.saveFailed')
    ElMessage({ message: msg, type: 'error', duration: msg.length > 80 ? 6000 : 3500 })
  } finally {
    savingDraft.value = false
  }
}

function handlePublish() {
  if (publishingTool.value || readOnly.value) return
  const payload = buildPayloadForPublish()
  if (!payload) return
  publishingTool.value = true
  publishTool(payload, artifactForm.value.pyFile)
    .then((res) => {
      const pid = res?.data?.toolId
      if (typeof pid === 'number' && pid > 0) {
        currentToolId.value = pid
        hasLoadedDetail.value = true
        if (!route.params?.id && !route.query?.id) {
          router.replace({ query: { ...route.query, id: String(pid) } })
        }
      }
      ElMessage({ message: res?.message || t('create.page.published'), type: 'success', duration: 2000 })
      router.push('/my/tools')
    })
    .catch((e: any) => {
      const msg = e?.message || t('create.page.publishFailed')
      ElMessage({ message: msg, type: 'error', duration: msg.length > 80 ? 6000 : 3500 })
    })
    .finally(() => {
      publishingTool.value = false
    })
}

async function handleUploadIcon(file: File) {
  if (uploadingIcon.value || readOnly.value) return
  uploadingIcon.value = true
  try {
    const res = await uploadToolIcon(file)
    const url = res?.data
    if (!url) throw new Error(t('create.page.iconUrlMissing'))
    basicForm.value.icon = url
  } catch (e: any) {
    ElMessage({ message: e?.message || t('create.page.uploadIconFailed'), type: 'error', duration: 3000 })
  } finally {
    uploadingIcon.value = false
  }
}

const loadToolDetailData = async (id: number) => {
  if (detailLoading.value) return
  detailLoading.value = true
  try {
    const res = await getToolDetail(id)
    const d = res?.data
    if (!d || typeof d.id !== 'number') throw new Error(t('create.page.toolDetailInvalid'))

    currentToolId.value = d.id
    hasArtifactOnServer.value = Boolean(d.minioObjectKey && String(d.minioObjectKey).trim())

    basicForm.value.name = d.name || ''
    basicForm.value.description = d.description || ''
    basicForm.value.categoryCode = (d.categoryCode || '') as SkillCategoryCode | ''
    basicForm.value.isPublic = d.isPublic !== false
    {
      const raw = (d.iconUrl || '').trim()
      if (raw && (/^https?:\/\//i.test(raw) || /^system-[1-4]$/i.test(raw))) {
        basicForm.value.icon = /^system-/i.test(raw) ? raw.toLowerCase() : raw
      } else {
        basicForm.value.icon = 'system-1'
      }
    }

    artifactForm.value.entryFunction = d.entryFunction || 'run'
    artifactForm.value.pyFile = null

    runtimeForm.value.timeoutMs = d.timeoutMs ?? 120000
    runtimeForm.value.retryTimes = d.retryTimes ?? 0
    runtimeForm.value.requiresGpu = Boolean(d.requiresGpu)

    const fileNameFromApi = (d.fileName || '').trim()
    if (fileNameFromApi) {
      serverArtifactName.value = fileNameFromApi
    } else {
      const key = String(d.minioObjectKey || '').trim()
      serverArtifactName.value = key.split('/').filter(Boolean).pop() || ''
    }

    const defaults = createDefaultManifestFormState()
    manifestForm.value = hydrateManifestFormFromJson(d.toolMetadata, defaults)

    hasLoadedDetail.value = true
  } catch (e: any) {
    ElMessage({ message: e?.message || t('create.page.loadFailed'), type: 'error', duration: 3500 })
  } finally {
    detailLoading.value = false
  }
}

async function loadFavoriteStatus() {
  if (!fromCommunity.value) return
  const idNum = routeToolId.value
  if (idNum == null || !Number.isFinite(idNum) || idNum <= 0) return
  try {
    const res = await checkFavoriteTool(idNum)
    isFavorited.value = res?.data === true
  } catch {
    isFavorited.value = false
  }
}

async function handleFavorite() {
  const idNum = routeToolId.value
  if (idNum == null || !Number.isFinite(idNum) || idNum <= 0) return
  try {
    favoriteLoading.value = true
    if (isFavorited.value) {
      await cancelFavoriteTool(idNum)
      isFavorited.value = false
    } else {
      await addFavoriteTool(idNum)
      isFavorited.value = true
    }
  } catch {
    ElMessage({ message: isFavorited.value ? t('create.page.unfavoriteFailed') : t('create.page.favoriteFailed'), type: 'error', duration: 2500 })
  } finally {
    favoriteLoading.value = false
  }
}

async function handleDownloadToolFile() {
  if (!fromCommunity.value || downloadingToolFile.value) return
  const idNum = routeToolId.value
  if (idNum == null || !Number.isFinite(idNum) || idNum <= 0) return
  try {
    downloadingToolFile.value = true
    await downloadToolArtifact(idNum, serverArtifactName.value || undefined)
  } catch (e: any) {
    ElMessage({ message: e?.message || t('create.page.downloadFailed'), type: 'error', duration: 3000 })
  } finally {
    downloadingToolFile.value = false
  }
}

async function recordViewCount() {
  if (!fromCommunity.value) return
  const idNum = routeToolId.value
  if (idNum == null || !Number.isFinite(idNum) || idNum <= 0) return
  if (lastViewRecordedToolId.value === idNum) return
  try {
    await addToolView(idNum)
    lastViewRecordedToolId.value = idNum
  } catch {
    /* ignore */
  }
}

/** 编辑态已有 .py 文件名（未选择新文件时展示） */
const serverArtifactName = ref('')

onMounted(() => {
  if (isEditMode.value) {
    const idNum = routeToolId.value
    if (idNum != null) {
      loadToolDetailData(idNum)
      if (fromCommunity.value) loadFavoriteStatus()
      if (fromCommunity.value) recordViewCount()
    } else {
      ElMessage({ message: t('create.page.toolIdInvalid'), type: 'warning', duration: 2500 })
    }
  }
})

watch(
  () => routeToolId.value,
  (idNum, prevId) => {
    if (!idNum || idNum === prevId) return
    if (!hasLoadedDetail.value || currentToolId.value !== idNum) {
      loadToolDetailData(idNum)
      if (fromCommunity.value) loadFavoriteStatus()
      if (fromCommunity.value) recordViewCount()
    }
  },
)
</script>

<template>
  <div class="tool-create-page">
    <DashboardHeader />
    <main class="page-main">
      <div class="page-container">
        <div class="tool-create-column">
          <CreatePluginHeader
            entity-label="tool"
            :mode="mode"
            :saving-draft="savingDraft"
            :publishing-skill="publishingTool"
            :read-only="readOnly"
            :show-favorite="fromCommunity"
            :is-favorited="isFavorited"
            :favorite-loading="favoriteLoading"
            @save-draft="handleSaveDraft"
            @publish="handlePublish"
            @favorite="handleFavorite"
          />

          <div v-if="isEditMode && !hasLoadedDetail" class="loading-state">
            <span class="loading-spinner" />
            <span>{{ detailLoading ? t('create.page.loadingToolDetail') : t('create.page.preparingLoad') }}</span>
          </div>

          <div v-else class="main-col">
            <ToolBasicForm
              v-model="basicForm"
              :readonly="readOnly"
              :uploading-icon="uploadingIcon"
              @upload-icon="handleUploadIcon"
            />

            <ToolArtifactForm
              v-model="artifactForm"
              :readonly="readOnly"
              :server-file-name="serverArtifactName"
              :download-enabled="fromCommunity && !!serverArtifactName"
              :downloading="downloadingToolFile"
              @download="handleDownloadToolFile"
            />

            <ToolRuntimeForm v-model="runtimeForm" :readonly="readOnly" />

            <ToolManifestForm v-model="manifestForm" :readonly="readOnly" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.tool-create-page {
  min-height: 100vh;
  background: var(--app-color-bg-workbench);
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  padding-top: var(--app-page-top-desktop);
  padding-bottom: 0;
}

.page-container {
  max-width: 1560px;
  margin: 0 auto;
  padding: 32px 36px 32px;
  box-sizing: border-box;
}

.tool-create-column {
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
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
  to {
    transform: rotate(360deg);
  }
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
</style>
