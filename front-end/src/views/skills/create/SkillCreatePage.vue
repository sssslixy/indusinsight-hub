<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import CreatePluginHeader from '@/components/plugins/create/CreatePluginHeader.vue'
import SkillBasicForm from '@/components/skills/create/SkillBasicForm.vue'
import SkillArtifactForm from '@/components/skills/create/SkillArtifactForm.vue'
import SkillValidationReport from '@/components/skills/create/SkillValidationReport.vue'
import {
  saveSkillDraft,
  publishSkill,
  validateSkillPackage,
  retrySkillMetadata,
  getSkillDetail,
  addSkillView,
  addFavoriteSkill,
  cancelFavoriteSkill,
  checkFavoriteSkill,
  downloadSkillArtifact,
  uploadSkillIcon,
} from '@/api/skill'
import type { SkillDraftPublishRequest, SkillValidationResponse, SkillValidationReport as ValidationReport } from '@/api/skill'
import type {
  SkillArtifactFormState,
  SkillBasicFormState,
  SkillSaveIntent,
} from '@/types/skills/skillCreate'
import type { SkillCategoryCode } from '@/constants/skillCategoryCodes'
import { buildSkillReferenceCompatibilityFields } from '@/utils/skills/skillReferenceDefaults'
import { getAvailableModels, llmRequestError, type UserLlmModel } from '@/api/llm'
import { useUserStore } from '@/stores/user'
import { hasCurrentSkillReview, skillPublishMinimum, SKILL_METADATA_VERSION } from '@/utils/skills/skillReviewPolicy'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()

type PageMode = 'create' | 'edit'
const mode = computed<PageMode>(() => (route.params?.id || route.query?.id ? 'edit' : 'create'))
const isEditMode = computed(() => mode.value === 'edit')
const fromCommunity = computed(() => route.query?.from === 'community')
const readOnly = computed(() => fromCommunity.value)
const routeSkillId = computed<number | null>(() => {
  const raw = route.params?.id ?? route.query?.id
  const idNum = Number(raw)
  return Number.isFinite(idNum) && idNum > 0 ? idNum : null
})

const emptyBasicForm = (): SkillBasicFormState => ({
  name: '',
  description: '',
  categoryCode: '',
  isPublic: true,
  icon: 'system-1',
})
const basicForm = ref<SkillBasicFormState>(emptyBasicForm())

const artifactForm = ref<SkillArtifactFormState>({
  skillFile: null,
})

const currentSkillId = ref<number | null>(null)
const savingDraft = ref(false)
const publishingSkill = ref(false)
const validatingSkill = ref(false)
const metadataRetrying = ref(false)
const validationResult = ref<SkillValidationResponse | null>(null)
const savedValidation = ref<ValidationReport | null>(null)
const publishedValidation = ref<ValidationReport | null>(null)
const uploadingIcon = ref(false)
const detailLoading = ref(false)
const hasLoadedDetail = ref(false)
const detailNotReady = computed(() => detailLoading.value || (isEditMode.value && !hasLoadedDetail.value))
const isInitializingFromDetail = ref(false)
const busy = computed(() => validatingSkill.value || metadataRetrying.value || savingDraft.value || publishingSkill.value)
const validationUserModelId = ref('')
const personalModels = ref<UserLlmModel[]>([])
const modelsLoading = ref(false)
const modelsError = ref('')
const modelOptions = computed(() => personalModels.value.map(model => ({
  value: model.id,
  label: `${model.displayName} · ${model.connectionName}`,
  provider: model.providerCode,
  description: model.modelCode,
})))
let modelRequest = 0
let validationRequest = 0
let restoreModelSelection = true
let modelsRefreshing = false
let refreshOnReturn = false

function modelPreferenceKey(): string | null {
  const userId = userStore.userInfo?.id
  return userId == null ? null : `skill-validation-model:${userId}`
}

function rememberModelSelection(id: string) {
  const key = modelPreferenceKey()
  if (!key) return
  try {
    if (id) localStorage.setItem(key, id)
    else localStorage.removeItem(key)
  } catch { /* Model choice remains usable when browser storage is unavailable. */ }
}

async function refreshModels(silent = false) {
  if (readOnly.value || busy.value || modelsRefreshing || userStore.userInfo?.id == null) return
  const request = ++modelRequest
  modelsRefreshing = true
  modelsLoading.value = !silent
  try {
    const response = await getAvailableModels()
    if (request !== modelRequest) return
    // A background refresh must not change the selected model during scoring/saving.
    if (busy.value) { refreshOnReturn = true; return }
    personalModels.value = response.data || []
    modelsError.value = ''
    if (restoreModelSelection) {
      const key = modelPreferenceKey()
      let stored = ''
      try { stored = key ? localStorage.getItem(key) || '' : '' } catch { /* Optional preference. */ }
      validationUserModelId.value = personalModels.value.some(model => model.id === stored) ? stored : ''
      if (stored && !validationUserModelId.value) rememberModelSelection('')
      restoreModelSelection = false
    } else if (validationUserModelId.value && !personalModels.value.some(model => model.id === validationUserModelId.value)) {
      const result = validationResult.value
      const hasCompletedReview = result?.passed && result.llmStatus === 'succeeded'
        && result.llmModel?.userModelId === validationUserModelId.value
        && result.validationToken && result.artifactSha256
      // Completed reviews are token-bound snapshots, independent of later model availability.
      if (!hasCompletedReview) {
        validationUserModelId.value = ''
        rememberModelSelection('')
      }
    }
  } catch (error) {
    if (request === modelRequest) modelsError.value = llmRequestError(error)
  } finally {
    if (request === modelRequest) {
      modelsLoading.value = false
      modelsRefreshing = false
    }
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    refreshOnReturn = true
  } else if (refreshOnReturn && !busy.value) {
    refreshOnReturn = false
    void refreshModels(true)
  }
}

watch(busy, value => {
  if (!value && document.visibilityState === 'visible') handleVisibilityChange()
})

function handleModelSelection(id: string) {
  if (busy.value || readOnly.value || modelsLoading.value) return
  if (id && !personalModels.value.some(model => model.id === id)) return
  validationUserModelId.value = id
  restoreModelSelection = false
  rememberModelSelection(id)
}

const isFavorited = ref(false)
const favoriteLoading = ref(false)
const skillAuthorId = ref<number | null>(null)
const authorKnown = computed(() => currentSkillId.value === routeSkillId.value
  && skillAuthorId.value != null && userStore.userInfo?.id != null)
const isMine = computed(() => authorKnown.value
  && String(skillAuthorId.value) === String(userStore.userInfo?.id))
const canFavorite = computed(() => fromCommunity.value && authorKnown.value && !isMine.value)
let favoriteRequest = 0
let detailRequest = 0
const downloadingSkillFile = ref(false)
const lastViewRecordedSkillId = ref<number | null>(null)

/** 详情加载后：是否已有服务端文件（用于草稿/发布校验，不展示存储元数据） */
const hasArtifactOnServer = ref(false)

/** 编辑态：服务端已有 skill 文件时的展示名（优先后端 file_name） */
const serverZipFileName = ref('')
const serverArtifactSizeBytes = ref<number | null>(null)

const validationStatus = computed<'idle' | 'running' | 'passed' | 'failed'>(() => {
  if (validatingSkill.value) return 'running'
  if (!validationResult.value) return 'idle'
  return validationResult.value.passed ? 'passed' : 'failed'
})

const validationPassed = computed(() => {
  const result = validationResult.value
  return Boolean(result?.passed && result.validationToken && result.artifactSha256)
})

const validationRequired = computed(() => {
  return Boolean(artifactForm.value.skillFile || !hasArtifactOnServer.value)
})

const validationSatisfied = computed(() => {
  return !validationRequired.value || validationPassed.value
})

const submitDisabledReason = computed(() => {
  if (detailNotReady.value) return t('create.page.loadingSkillDetail')
  if (validatingSkill.value) return t('create.page.skillSpecRunning')
  if (!artifactForm.value.skillFile && !hasArtifactOnServer.value) return t('create.page.uploadSkillFirst')
  if (validationSatisfied.value) return ''
  return t('create.page.finishSkillSpecFirst')
})

/** 上传返回 http(s)；内置选图为 system-1…system-4 */
function iconUrlForApi(icon: string): string | undefined {
  const t = (icon || '').trim()
  if (!t) return undefined
  if (/^https?:\/\//i.test(t)) return t
  const m = t.match(/^system-([1-4])$/i)
  if (m) return `system-${m[1]}`
  return undefined
}

/** JSON.stringify 会省略 undefined，后端收不到 iconUrl，故必须始终传 string */
function iconUrlForPayload(): string {
  return iconUrlForApi(basicForm.value.icon) ?? 'system-1'
}

function validateForIntent(intent: SkillSaveIntent): boolean {
  if (!basicForm.value.name.trim()) {
    ElMessage({ message: t('create.page.enterSkillName'), type: 'warning', duration: 2500 })
    return false
  }
  if (!basicForm.value.categoryCode) {
    ElMessage({ message: t('create.page.selectCategory'), type: 'warning', duration: 2500 })
    return false
  }
  if (!artifactForm.value.skillFile && !hasArtifactOnServer.value) {
    ElMessage({
      message:
        intent === 'publish'
          ? t('create.page.uploadSkillBeforePublish')
          : t('create.page.uploadSkillBeforeDraft'),
      type: 'warning',
      duration: 2500,
    })
    return false
  }

  const validationRequiredForIntent = validationRequired.value || intent === 'publish'
  if (validationRequiredForIntent && !validationPassed.value) {
    ElMessage({
      message: intent === 'publish' ? t('create.page.finishSkillSpecBeforePublish') : submitDisabledReason.value,
      type: 'warning',
      duration: 3000,
    })
    return false
  }

  if (intent === 'publish') {
    const result = validationResult.value
    const llmScore = result?.llmAnalysis?.score
    if (result?.llmStatus !== 'succeeded' || !validationUserModelId.value || result.llmModel?.userModelId !== validationUserModelId.value || typeof llmScore !== 'number' || !Number.isFinite(llmScore)) {
      ElMessage({ message: t('create.page.finishLlmBeforePublish'), type: 'warning', duration: 3500 })
      return false
    }
    if (!hasCurrentSkillReview(result)) {
      ElMessage({ message: t('skillReview.retest'), type: 'warning' })
      return false
    }
    if (llmScore < skillPublishMinimum(result)) {
      ElMessage({ message: t('create.page.llmScoreTooLow'), type: 'warning', duration: 3500 })
      return false
    }
    if (result.metadataPromptVersion !== SKILL_METADATA_VERSION || result.metadataStatus !== 'succeeded' || !result.generatedName?.trim() || !result.generatedDescription?.trim()) {
      ElMessage({ message: t('create.page.finishMetadataBeforePublish'), type: 'warning', duration: 3500 })
      return false
    }
  }

  return true
}

function buildPayload(intent: SkillSaveIntent): SkillDraftPublishRequest | null {
  if (!validateForIntent(intent)) return null
  const base: SkillDraftPublishRequest = {
    skillId: currentSkillId.value,
    name: basicForm.value.name.trim(),
    description: basicForm.value.description.trim() || undefined,
    categoryCode: basicForm.value.categoryCode,
    visibility: basicForm.value.isPublic ? 1 : 0,
    skillType: 'code',
    iconUrl: iconUrlForPayload(),
    ...buildSkillReferenceCompatibilityFields(),
    validationToken: validationResult.value?.validationToken,
    validationArtifactSha256: validationResult.value?.artifactSha256,
    validationUserModelId: validationUserModelId.value || undefined,
  }
  if (intent === 'draft') {
    return { ...base, targetStatus: 'draft' }
  }
  return base
}

function buildValidationPayload(): SkillDraftPublishRequest {
  return {
    skillId: currentSkillId.value,
    name: basicForm.value.name.trim(),
    description: basicForm.value.description.trim() || undefined,
    categoryCode: basicForm.value.categoryCode || 'other',
    visibility: basicForm.value.isPublic ? 1 : 0,
    skillType: 'code',
    iconUrl: iconUrlForPayload(),
    ...buildSkillReferenceCompatibilityFields(),
    targetStatus: 'draft',
    validationUserModelId: validationUserModelId.value || undefined,
  }
}

async function handleValidateSkillPackage() {
  if (busy.value || readOnly.value || detailNotReady.value || modelsLoading.value) return
  if (!artifactForm.value.skillFile && !hasArtifactOnServer.value) {
    ElMessage({ message: t('create.page.uploadSkillFirst'), type: 'warning', duration: 2500 })
    return
  }
  if (validationUserModelId.value && !personalModels.value.some(model => model.id === validationUserModelId.value)) {
    ElMessage({ message: t('llm.selection.invalidSelection'), type: 'warning', duration: 3000 })
    return
  }
  const request = ++validationRequest
  const file = artifactForm.value.skillFile
  const payload = buildValidationPayload()
  const snapshot = { userId: userStore.userInfo?.id, skillId: currentSkillId.value, modelId: validationUserModelId.value }
  const isCurrent = () => request === validationRequest && !readOnly.value
    && snapshot.userId === userStore.userInfo?.id && snapshot.skillId === currentSkillId.value
    && snapshot.modelId === validationUserModelId.value && file === artifactForm.value.skillFile
  validationResult.value = null
  validatingSkill.value = true
  try {
    const res = await validateSkillPackage(payload, file)
    if (!isCurrent()) return
    validationResult.value = res.data
    const completed = res.data?.llmStatus === 'succeeded' && res.data?.metadataStatus === 'succeeded'
    ElMessage({
      message: !res.data?.passed ? t('create.page.skillSpecFailed') : completed ? t('create.page.skillSpecScored') : t('create.page.skillSpecUnscored'),
      type: !res.data?.passed ? 'error' : completed && (res.data.llmAnalysis?.score ?? -1) >= skillPublishMinimum(res.data) ? 'success' : 'warning',
      duration: completed ? 2500 : 4500,
    })
  } catch (e: any) {
    if (!isCurrent()) return
    validationResult.value = null
    const msg = typeof e?.message === 'string' && e.message.startsWith('llm_') ? llmRequestError(e) : e?.message || t('create.page.skillSpecRequestFailed')
    ElMessage({ message: msg, type: 'error', duration: msg.length > 80 ? 6000 : 3500 })
  } finally {
    if (request === validationRequest) validatingSkill.value = false
  }
}

async function handleRetryMetadata() {
  const prior = validationResult.value
  if (busy.value || readOnly.value || detailNotReady.value || !prior?.validationId || !hasCurrentSkillReview(prior) || prior.metadataStatus === 'succeeded') return
  if (prior.expiresAt && Date.parse(prior.expiresAt) <= Date.now()) {
    ElMessage({ message: t('skillReview.expired'), type: 'warning' }); return
  }
  const request = ++validationRequest
  const file = artifactForm.value.skillFile
  const snapshot = { userId: userStore.userInfo?.id, skillId: currentSkillId.value, modelId: validationUserModelId.value }
  const isCurrent = () => request === validationRequest && !readOnly.value
    && snapshot.userId === userStore.userInfo?.id && snapshot.skillId === currentSkillId.value
    && snapshot.modelId === validationUserModelId.value && file === artifactForm.value.skillFile
  metadataRetrying.value = true
  try {
    const response = await retrySkillMetadata(prior.validationId, {
      ...buildValidationPayload(), validationToken: prior.validationToken, validationArtifactSha256: prior.artifactSha256,
    }, file)
    if (!isCurrent()) return
    validationResult.value = response.data
    const done = response.data?.metadataStatus === 'succeeded'
    ElMessage({ message: t(done ? 'skillReview.retryDone' : 'skillReview.retryFailed'), type: done ? 'success' : 'warning' })
  } catch (error: any) {
    if (isCurrent()) ElMessage({ message: typeof error?.message === 'string' && error.message.startsWith('llm_') ? llmRequestError(error) : error?.message || t('skillReview.retryFailed'), type: 'error' })
  } finally {
    if (request === validationRequest) metadataRetrying.value = false
  }
}

function resetValidationResult() {
  if (isInitializingFromDetail.value) return
  validationRequest++
  validationResult.value = null
  validatingSkill.value = false
  metadataRetrying.value = false
}

async function handleSaveDraft() {
  if (busy.value || readOnly.value || detailNotReady.value) return
  const payload = buildPayload('draft')
  if (!payload) return
  savingDraft.value = true
  try {
    const res = await saveSkillDraft(payload, artifactForm.value.skillFile)
    const pid = res?.data?.skillId
    if (typeof pid === 'number' && pid > 0) {
      currentSkillId.value = pid
      hasLoadedDetail.value = true
      if (!route.params?.id && !route.query?.id) {
        router.replace({ query: { ...route.query, id: String(pid) } })
      }
      await loadSkillDetailData(pid)
      validationResult.value = null
    }
    ElMessage({ message: res?.message || t('create.page.draftSaved'), type: 'success', duration: 2000 })
    router.back()
  } catch (e: any) {
    const msg = e?.message || t('create.page.saveFailed')
    ElMessage({ message: msg, type: 'error', duration: msg.length > 80 ? 6000 : 3500 })
  } finally {
    savingDraft.value = false
  }
}

function handlePublish() {
  if (busy.value || readOnly.value || detailNotReady.value) return
  const payload = buildPayload('publish')
  if (!payload) return
  publishingSkill.value = true
  publishSkill(payload, artifactForm.value.skillFile)
    .then((res) => {
      const pid = res?.data?.skillId
      if (typeof pid === 'number' && pid > 0) {
        currentSkillId.value = pid
        hasLoadedDetail.value = true
        if (!route.params?.id && !route.query?.id) {
          router.replace({ query: { ...route.query, id: String(pid) } })
        }
      }
      ElMessage({ message: res?.message || t('create.page.published'), type: 'success', duration: 2000 })
      router.back()
    })
    .catch((e: any) => {
      const msg = e?.message || t('create.page.publishFailed')
      ElMessage({ message: msg, type: 'error', duration: msg.length > 80 ? 6000 : 3500 })
    })
    .finally(() => {
      publishingSkill.value = false
    })
}

async function handleUploadIcon(file: File) {
  if (uploadingIcon.value || readOnly.value || detailNotReady.value) return
  uploadingIcon.value = true
  try {
    const res = await uploadSkillIcon(file)
    const url = res?.data
    if (!url) throw new Error(t('create.page.iconUrlMissing'))
    basicForm.value.icon = url
  } catch (e: any) {
    ElMessage({ message: e?.message || t('create.page.uploadIconFailed'), type: 'error', duration: 3000 })
  } finally {
    uploadingIcon.value = false
  }
}

function resetDetailForm() {
  isInitializingFromDetail.value = false
  resetValidationResult()
  hasLoadedDetail.value = false
  currentSkillId.value = null
  skillAuthorId.value = null
  basicForm.value = emptyBasicForm()
  artifactForm.value = { skillFile: null }
  hasArtifactOnServer.value = false
  serverZipFileName.value = ''
  serverArtifactSizeBytes.value = null
  savedValidation.value = null
  publishedValidation.value = null
}

const loadSkillDetailData = async (id: number) => {
  const request = ++detailRequest
  const context = { community: fromCommunity.value, userId: userStore.userInfo?.id }
  const isCurrent = () => request === detailRequest && id === routeSkillId.value
    && context.community === fromCommunity.value && context.userId === userStore.userInfo?.id
  resetDetailForm()
  detailLoading.value = true
  try {
    const res = context.community ? await getSkillDetail(id, { view: 'community' }) : await getSkillDetail(id)
    if (!isCurrent()) return
    const d = res?.data
    const sk = d?.skill
    if (!sk || sk.id !== id) throw new Error(t('create.page.skillDetailInvalid'))

    isInitializingFromDetail.value = true
    currentSkillId.value = sk.id
    skillAuthorId.value = sk.authorId ?? null
    savedValidation.value = d?.currentValidation ?? null
    publishedValidation.value = d?.publishedValidation ?? null
    hasArtifactOnServer.value = Boolean(sk.minioObjectKey && String(sk.minioObjectKey).trim())
    if (hasArtifactOnServer.value && sk.minioObjectKey) {
      const fromApi = (sk.fileName || '').trim()
      if (fromApi) {
        serverZipFileName.value = fromApi
      } else {
        const key = String(sk.minioObjectKey).trim()
        serverZipFileName.value = key.split('/').filter(Boolean).pop() || 'skill'
      }
      serverArtifactSizeBytes.value =
        typeof sk.artifactSize === 'number' && Number.isFinite(sk.artifactSize) ? sk.artifactSize : null
    } else {
      serverZipFileName.value = ''
      serverArtifactSizeBytes.value = null
    }

    basicForm.value.name = sk.name || ''
    basicForm.value.description = sk.description || ''
    basicForm.value.categoryCode = (sk.categoryCode || '') as SkillCategoryCode | ''
    basicForm.value.isPublic = sk.visibility !== 0
    {
      const raw = (sk.iconUrl || '').trim()
      if (raw && (/^https?:\/\//i.test(raw) || /^system-[1-4]$/i.test(raw))) {
        basicForm.value.icon = /^system-/i.test(raw) ? raw.toLowerCase() : raw
      } else {
        basicForm.value.icon = 'system-1'
      }
    }

    artifactForm.value.skillFile = null
    validationResult.value = null

    hasLoadedDetail.value = true
  } catch (e: any) {
    if (!isCurrent()) return
    ElMessage({ message: e?.message || t('create.page.loadFailed'), type: 'error', duration: 3500 })
  } finally {
    if (isCurrent()) {
      isInitializingFromDetail.value = false
      detailLoading.value = false
    }
  }
}

async function loadFavoriteStatus() {
  const request = ++favoriteRequest
  isFavorited.value = false
  favoriteLoading.value = false
  if (!canFavorite.value) return
  const idNum = routeSkillId.value
  if (idNum == null || !Number.isFinite(idNum) || idNum <= 0) return
  favoriteLoading.value = true
  try {
    const res = await checkFavoriteSkill(idNum)
    if (request === favoriteRequest) isFavorited.value = res?.data === true
  } catch {
    if (request === favoriteRequest) isFavorited.value = false
  } finally {
    if (request === favoriteRequest) favoriteLoading.value = false
  }
}

watch(
  [routeSkillId, fromCommunity, skillAuthorId, () => userStore.userInfo?.id],
  loadFavoriteStatus,
  { immediate: true, flush: 'post' },
)

async function handleFavorite() {
  if (!canFavorite.value || favoriteLoading.value) return
  const request = favoriteRequest
  const idNum = routeSkillId.value
  if (idNum == null || !Number.isFinite(idNum) || idNum <= 0) return
  try {
    favoriteLoading.value = true
    if (isFavorited.value) {
      await cancelFavoriteSkill(idNum)
      if (request === favoriteRequest) isFavorited.value = false
    } else {
      await addFavoriteSkill(idNum)
      if (request === favoriteRequest) isFavorited.value = true
    }
  } catch {
    if (request !== favoriteRequest) return
    ElMessage({ message: isFavorited.value ? t('create.page.unfavoriteFailed') : t('create.page.favoriteFailed'), type: 'error', duration: 2500 })
  } finally {
    if (request === favoriteRequest) favoriteLoading.value = false
  }
}

async function handleDownloadSkillFile() {
  if (!fromCommunity.value || downloadingSkillFile.value) return
  const idNum = routeSkillId.value
  if (idNum == null || !Number.isFinite(idNum) || idNum <= 0) return
  try {
    downloadingSkillFile.value = true
    await downloadSkillArtifact(idNum, serverZipFileName.value || undefined)
  } catch (e: any) {
    ElMessage({ message: e?.message || t('create.page.downloadFailed'), type: 'error', duration: 3000 })
  } finally {
    downloadingSkillFile.value = false
  }
}

async function recordViewCount() {
  if (!fromCommunity.value) return
  const idNum = routeSkillId.value
  if (idNum == null || !Number.isFinite(idNum) || idNum <= 0) return
  if (lastViewRecordedSkillId.value === idNum) return
  try {
    await addSkillView(idNum)
    lastViewRecordedSkillId.value = idNum
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  modelRequest++
  validationRequest++
  detailRequest++
  favoriteRequest++
})

watch(
  [() => userStore.userInfo?.id, readOnly],
  () => {
    modelRequest++
    modelsRefreshing = false
    refreshOnReturn = false
    modelsLoading.value = false
    modelsError.value = ''
    personalModels.value = []
    validationUserModelId.value = ''
    restoreModelSelection = true
    resetValidationResult()
    if (!readOnly.value) void refreshModels()
  },
  { immediate: true, flush: 'sync' },
)

watch(
  [() => artifactForm.value.skillFile, validationUserModelId],
  () => resetValidationResult(),
  { flush: 'sync' },
)

watch(
  [routeSkillId, fromCommunity, () => userStore.userInfo?.id],
  ([idNum, community]) => {
    if (idNum != null) {
      void loadSkillDetailData(idNum)
      if (community) void recordViewCount()
    } else {
      detailRequest++
      resetDetailForm()
      detailLoading.value = false
      if (isEditMode.value) ElMessage({ message: t('create.page.skillIdInvalid'), type: 'warning', duration: 2500 })
    }
  },
  { immediate: true, flush: 'sync' },
)
</script>

<template>
  <div class="skill-create-page">
    <DashboardHeader />
    <main class="page-main">
      <div class="page-container">
        <!-- 顶栏与表单同一居中列宽，顶栏随列对齐而非拉满整页 -->
        <div class="skill-create-column">
        <CreatePluginHeader
          :mode="mode"
          :saving-draft="savingDraft"
          :publishing-skill="publishingSkill"
          :read-only="readOnly"
          :show-favorite="canFavorite"
          :is-favorited="isFavorited"
          :favorite-loading="favoriteLoading"
          :submit-disabled="busy || detailNotReady || !validationSatisfied"
          :submit-disabled-reason="submitDisabledReason"
          @save-draft="handleSaveDraft"
          @publish="handlePublish"
          @favorite="handleFavorite"
        />

        <div v-if="isEditMode && !hasLoadedDetail" class="loading-state">
          <span class="loading-spinner" />
          <span>{{ detailLoading ? t('create.page.loadingSkillDetail') : t('create.page.preparingLoad') }}</span>
        </div>

        <div v-else class="main-col">
            <SkillBasicForm
              v-model="basicForm"
              :readonly="readOnly || busy || detailNotReady"
              :uploading-icon="uploadingIcon"
              @upload-icon="handleUploadIcon"
            />

            <SkillArtifactForm
              v-model="artifactForm"
              :readonly="readOnly"
              :server-file-name="serverZipFileName"
              :server-file-size-bytes="serverArtifactSizeBytes"
              :validation-status="validationStatus"
              :validation-result="validationResult"
              :validation-required="validationRequired"
              :download-enabled="fromCommunity && !!serverZipFileName"
              :downloading="downloadingSkillFile"
              :busy="busy"
              :validation-user-model-id="validationUserModelId"
              :model-options="modelOptions"
              :models-loading="modelsLoading"
              :models-error="modelsError"
              @update:validation-user-model-id="handleModelSelection"
              @refresh-models="refreshModels()"
              @validate="handleValidateSkillPackage"
              @download="handleDownloadSkillFile"
            />

            <button v-if="!readOnly && hasCurrentSkillReview(validationResult) && validationResult?.metadataStatus === 'failed'"
              type="button" class="metadata-retry" :disabled="busy" data-testid="retry-skill-metadata" @click="handleRetryMetadata">
              {{ t(metadataRetrying ? 'skillReview.retrying' : 'skillReview.retry') }}
            </button>
            <SkillValidationReport
              v-if="!readOnly && savedValidation && savedValidation.validationId !== publishedValidation?.validationId"
              :report="savedValidation"
              :title="t('create.report.savedTitle')"
              :file-changed="!!artifactForm.skillFile"
            />
            <SkillValidationReport
              v-if="readOnly || isEditMode"
              :report="publishedValidation"
              :title="t('create.report.publishedTitle')"
              :file-changed="!!artifactForm.skillFile"
            />
        </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.metadata-retry {
  align-self: flex-start;
  padding: 11px 18px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.metadata-retry:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.metadata-retry:focus-visible { outline: 2px solid #64748b; outline-offset: 3px; }
.metadata-retry:disabled { opacity: 0.55; cursor: wait; }
.skill-create-page {
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

.skill-create-column {
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
