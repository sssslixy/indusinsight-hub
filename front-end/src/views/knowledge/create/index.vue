<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { BackButton } from '@/components/base'
import { KnowledgeBaseForm } from './components'
import {
  createKnowledgeBase,
  getKnowledgeBaseDetail,
  uploadKnowledgeBaseIcon,
  updateKnowledgeBase,
  DEFAULT_KNOWLEDGE_BASE_FORM,
} from '@/api/knowledgeBase'
import type { KnowledgeBaseFormData } from '@/api/knowledgeBase'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const form = ref<KnowledgeBaseFormData>({ ...DEFAULT_KNOWLEDGE_BASE_FORM })
const errors = ref<Partial<Record<keyof KnowledgeBaseFormData, string>>>({})
const lastSavedSnapshot = ref(JSON.stringify(form.value))
const isEditMode = computed(() => !!route.params.id)
const saving = ref(false)
const uploadingIcon = ref(false)
const detailLoading = ref(false)
const detailLoaded = ref(!isEditMode.value)
const detailError = ref<string | null>(null)

const isDirty = computed(() => JSON.stringify(form.value) !== lastSavedSnapshot.value)
const SPARSE_PROVIDER_OLLAMA = 'ollama'
/** 与后端 / worker-kb / sparse-service 约定一致（界面仍展示「bge-m3」） */
const SPARSE_MODEL_FOR_API = 'bge-m3:latest'
const EMPTY_PARSER_CONFIG_JSON = '{}'
const RERANK_PROVIDER_QWEN = 'qwen'
const RERANK_MODEL_OPTIONS = ['Qwen/Qwen3-Reranker-8B', 'Qwen/Qwen3-Reranker-0.6B']
const OLLAMA_PROVIDER = 'ollama'
const OLLAMA_MODEL = 'qwen3-embedding:4b'
const OLLAMA_DIM = 2560
const qwenModelDimMap: Record<string, number> = {
  'Qwen/Qwen3-Embedding-8B': 4096,
  'Qwen/Qwen3-Embedding-4B': 2048,
  'Qwen/Qwen3-Embedding-0.6B': 1024,
}
const FUSION_OPTIONS = ['rrf', 'linear_interpolation', 'weighted_sum']

/** 编辑非 Ollama 知识库时暂存原向量化配置，表单仅展示 Ollama 选项，保存时仍可沿用直至用户改为 Ollama */
const stashedEmbedding = ref<{ provider: string; model: string } | null>(null)

const validate = () => {
  const next: Partial<Record<keyof KnowledgeBaseFormData, string>> = {}
  const name = form.value.name.trim()
  if (!name) next.name = t('knowledgeBase.createPage.validation.nameRequired')
  else if (name.length > 60) next.name = t('knowledgeBase.createPage.validation.nameMax')

  const emb = resolveEmbeddingForSave()
  if (!emb) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.embeddingProviderRequired'), type: 'warning', duration: 2500 })
    return false
  }
  if (!emb.model.trim()) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.embeddingModelRequired'), type: 'warning', duration: 2500 })
    return false
  }
  if (!form.value.retrievalStrategy?.trim()) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.retrievalStrategyRequired'), type: 'warning', duration: 2500 })
    return false
  }
  if (form.value.retrievalStrategy === 'hybrid' && !form.value.sparseEnabled) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.hybridRequiresSparse'), type: 'warning', duration: 2500 })
    return false
  }
  if (!(Number(form.value.topK) > 0)) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.topKPositive'), type: 'warning', duration: 2500 })
    return false
  }
  if (form.value.rerankEnabled) {
    if (!RERANK_MODEL_OPTIONS.includes(form.value.rerankModel)) {
      ElMessage({ message: t('knowledgeBase.createPage.validation.rerankModelUnsupported'), type: 'warning', duration: 2500 })
      return false
    }
  }
  if (!form.value.chunkStrategy?.trim()) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.chunkStrategyRequired'), type: 'warning', duration: 2500 })
    return false
  }
  const embeddingDimension = deriveEmbeddingDimension(emb.provider, emb.model)
  if (!(Number(embeddingDimension) > 0)) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.embeddingDimensionPositive'), type: 'warning', duration: 2500 })
    return false
  }
  if (!(Number(form.value.chunkMinChunkLength) > 0)) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.minChunkLengthPositive'), type: 'warning', duration: 2500 })
    return false
  }
  if (!(Number(form.value.retrievalDensePrefetchLimit) > 0)) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.densePrefetchPositive'), type: 'warning', duration: 2500 })
    return false
  }
  if (!(Number(form.value.retrievalSparsePrefetchLimit) > 0)) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.sparsePrefetchPositive'), type: 'warning', duration: 2500 })
    return false
  }
  if (!form.value.retrievalFusion?.trim()) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.fusionRequired'), type: 'warning', duration: 2500 })
    return false
  }
  if (!FUSION_OPTIONS.includes(form.value.retrievalFusion)) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.fusionUnsupported'), type: 'warning', duration: 2500 })
    return false
  }
  if (!(Number(form.value.retrievalRerankTopN) > 0)) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.rerankTopNPositive'), type: 'warning', duration: 2500 })
    return false
  }
  if (!(Number(form.value.chunkSize) > 0)) {
    next.chunkSize = t('knowledgeBase.createPage.validation.chunkSizePositive')
  }
  if (!(Number(form.value.chunkOverlap) >= 0)) {
    next.chunkOverlap = t('knowledgeBase.createPage.validation.chunkOverlapNonNegative')
  } else if (Number(form.value.chunkOverlap) >= Number(form.value.chunkSize)) {
    next.chunkOverlap = t('knowledgeBase.createPage.validation.chunkOverlapLessThanSize')
  }
  errors.value = next
  return Object.keys(next).length === 0
}

const resolveIconUrl = (iconUrl: string) => {
  // 系统图标使用稳定标识（system-*），上传/后端回填则直接透传
  if (!iconUrl) return 'system-1'
  if (iconUrl.startsWith('system-')) return iconUrl
  if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) return iconUrl
  return 'system-1'
}

const handleUploadIcon = async (file: File) => {
  if (uploadingIcon.value) return
  uploadingIcon.value = true
  try {
    const res = await uploadKnowledgeBaseIcon(file)
    const iconUrl = res?.data
    if (!iconUrl) {
      throw new Error(t('knowledgeBase.createPage.serviceNoIconUrl'))
    }
    form.value.iconUrl = iconUrl
  } catch (e: any) {
    ElMessage({ message: e?.message || t('knowledgeBase.createPage.iconUploadFailed'), type: 'error', duration: 3000 })
  } finally {
    uploadingIcon.value = false
  }
}

const saveNow = async () => {
  if (saving.value) return

  const editId = Number(route.params.id)
  if (isEditMode.value && (!editId || editId < 1)) {
    ElMessage({ message: t('knowledgeBase.createPage.missingId'), type: 'error', duration: 3000 })
    router.push('/my/knowledge')
    return
  }

  if (!validate()) {
    ElMessage({ message: t('knowledgeBase.createPage.validation.fixFormErrors'), type: 'warning', duration: 2500 })
    return
  }

  saving.value = true
  try {
    const embSave = resolveEmbeddingForSave()!
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description?.trim() || '',
      iconUrl: resolveIconUrl(form.value.iconUrl),
      visibility: form.value.visibility,
      enabled: form.value.enabled,
      embeddingProvider: embSave.provider,
      embeddingModel: embSave.model.trim(),
      embeddingDimension: deriveEmbeddingDimension(embSave.provider, embSave.model),
      denseDistanceMetric: form.value.denseDistanceMetric,
      sparseEnabled: form.value.sparseEnabled,
      sparseProvider: form.value.sparseEnabled ? SPARSE_PROVIDER_OLLAMA : '',
      sparseModel: form.value.sparseEnabled ? SPARSE_MODEL_FOR_API : '',
      retrievalStrategy: form.value.retrievalStrategy,
      topK: Number(form.value.topK),
      scoreThreshold: null,
      rerankEnabled: form.value.rerankEnabled,
      rerankProvider: form.value.rerankEnabled ? RERANK_PROVIDER_QWEN : '',
      rerankModel: form.value.rerankEnabled ? form.value.rerankModel?.trim() : '',
      parserConfig: EMPTY_PARSER_CONFIG_JSON,
      chunkConfig: JSON.stringify({
        prefer_heading_split: form.value.chunkPreferHeadingSplit,
        min_chunk_length: Number(form.value.chunkMinChunkLength),
        merge_short_paragraphs: form.value.chunkMergeShortParagraphs,
        table_as_single_chunk: form.value.chunkTableAsSingleChunk,
        code_block_as_single_chunk: form.value.chunkCodeBlockAsSingleChunk,
      }),
      retrievalConfig: JSON.stringify({
        dense_prefetch_limit: Number(form.value.retrievalDensePrefetchLimit),
        sparse_prefetch_limit: Number(form.value.retrievalSparsePrefetchLimit),
        fusion: form.value.retrievalFusion.trim(),
        rerank_top_n: Number(form.value.retrievalRerankTopN),
        return_payload: form.value.retrievalReturnPayload,
        rewrite_query: form.value.retrievalRewriteQuery,
      }),
      chunkStrategy: form.value.chunkStrategy,
      chunkSize: Number(form.value.chunkSize),
      chunkOverlap: Number(form.value.chunkOverlap),
    }

    if (isEditMode.value) {
      await updateKnowledgeBase(editId, payload)
      lastSavedSnapshot.value = JSON.stringify(form.value)
      ElMessage({ message: t('knowledgeBase.createPage.saveSuccess'), type: 'success', duration: 2200 })
      router.back()
      return
    }

    await createKnowledgeBase(payload)
    lastSavedSnapshot.value = JSON.stringify(form.value)
    ElMessage({ message: t('knowledgeBase.createPage.createSuccess'), type: 'success', duration: 2200 })
    router.back()
  } catch (e: any) {
    ElMessage({
      message: e?.message || (isEditMode.value ? t('knowledgeBase.createPage.saveFailed') : t('knowledgeBase.createPage.createFailed')),
      type: 'error',
      duration: 3000,
    })
  } finally {
    saving.value = false
  }
}

onBeforeRouteLeave(() => {
  if (!isDirty.value) {
    return true
  }
  return window.confirm(t('knowledgeBase.createPage.leaveConfirm'))
})

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!isDirty.value) return
  e.preventDefault()
  e.returnValue = ''
}

watch(
  () => [form.value.chunkSize, form.value.chunkOverlap, form.value.name],
  () => {
    if (Object.keys(errors.value).length > 0) validate()
  }
)

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload))

onMounted(async () => {
  if (!isEditMode.value) {
    stashedEmbedding.value = null
    return
  }

  const editId = Number(route.params.id)
  if (!editId || editId < 1) {
    ElMessage({ message: t('knowledgeBase.createPage.missingId'), type: 'error', duration: 3000 })
    router.push('/my/knowledge')
    return
  }

  detailLoading.value = true
  detailError.value = null
  detailLoaded.value = false

  try {
    const res = await getKnowledgeBaseDetail(editId)
    const d = res.data
    const chunkCfg = safeParseJson(d.chunkConfig)
    const retrievalCfg = safeParseJson(d.retrievalConfig)

    const embProv = String(d.embeddingProvider || '')
    if (embProv === OLLAMA_PROVIDER) {
      stashedEmbedding.value = null
    } else {
      stashedEmbedding.value = {
        provider: embProv,
        model: String(d.embeddingModel || ''),
      }
    }

    const dm = String(d.denseDistanceMetric || '')
    const denseMetric: 'cosine' | 'dot' = dm === 'dot' ? 'dot' : 'cosine'

    form.value = {
      ...DEFAULT_KNOWLEDGE_BASE_FORM,
      name: d.name,
      description: d.description || '',
      iconUrl: d.iconUrl || 'system-1',
      visibility: d.visibility as any,
      enabled: !!d.enabled,
      embeddingProvider: embProv === OLLAMA_PROVIDER ? OLLAMA_PROVIDER : '',
      embeddingModel: embProv === OLLAMA_PROVIDER ? String(d.embeddingModel || '') : '',
      denseDistanceMetric: denseMetric,
      sparseEnabled: !!d.sparseEnabled,
      retrievalStrategy: d.retrievalStrategy as any,
      topK: Number(d.topK),
      rerankEnabled: !!d.rerankEnabled,
      rerankModel: RERANK_MODEL_OPTIONS.includes(d.rerankModel || '') ? (d.rerankModel as string) : 'Qwen/Qwen3-Reranker-0.6B',
      chunkPreferHeadingSplit: Boolean(chunkCfg.prefer_heading_split ?? DEFAULT_KNOWLEDGE_BASE_FORM.chunkPreferHeadingSplit),
      chunkMinChunkLength: Number(chunkCfg.min_chunk_length ?? DEFAULT_KNOWLEDGE_BASE_FORM.chunkMinChunkLength),
      chunkMergeShortParagraphs: Boolean(chunkCfg.merge_short_paragraphs ?? DEFAULT_KNOWLEDGE_BASE_FORM.chunkMergeShortParagraphs),
      chunkTableAsSingleChunk: Boolean(chunkCfg.table_as_single_chunk ?? DEFAULT_KNOWLEDGE_BASE_FORM.chunkTableAsSingleChunk),
      chunkCodeBlockAsSingleChunk: Boolean(chunkCfg.code_block_as_single_chunk ?? DEFAULT_KNOWLEDGE_BASE_FORM.chunkCodeBlockAsSingleChunk),
      retrievalDensePrefetchLimit: Number(retrievalCfg.dense_prefetch_limit ?? DEFAULT_KNOWLEDGE_BASE_FORM.retrievalDensePrefetchLimit),
      retrievalSparsePrefetchLimit: Number(retrievalCfg.sparse_prefetch_limit ?? DEFAULT_KNOWLEDGE_BASE_FORM.retrievalSparsePrefetchLimit),
      retrievalFusion: FUSION_OPTIONS.includes(String(retrievalCfg.fusion ?? ''))
        ? String(retrievalCfg.fusion)
        : DEFAULT_KNOWLEDGE_BASE_FORM.retrievalFusion,
      retrievalRerankTopN: Number(retrievalCfg.rerank_top_n ?? DEFAULT_KNOWLEDGE_BASE_FORM.retrievalRerankTopN),
      retrievalReturnPayload: Boolean(retrievalCfg.return_payload ?? DEFAULT_KNOWLEDGE_BASE_FORM.retrievalReturnPayload),
      retrievalRewriteQuery: Boolean(retrievalCfg.rewrite_query ?? DEFAULT_KNOWLEDGE_BASE_FORM.retrievalRewriteQuery),
      chunkStrategy: d.chunkStrategy as any,
      chunkSize: Number(d.chunkSize),
      chunkOverlap: Number(d.chunkOverlap),
    }
    lastSavedSnapshot.value = JSON.stringify(form.value)
    detailLoaded.value = true
  } catch (e: any) {
    const msg: string = e?.message || t('knowledgeBase.createPage.detailLoadFailed')
    detailError.value = msg
    ElMessage({ message: msg, type: 'error', duration: 3000 })
  } finally {
    detailLoading.value = false
  }
})

function safeParseJson(input?: string): Record<string, any> {
  if (!input || !input.trim()) return {}
  try {
    const parsed = JSON.parse(input)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function deriveEmbeddingDimension(provider: string, model: string): number {
  if (provider === OLLAMA_PROVIDER) return OLLAMA_DIM
  return qwenModelDimMap[model] ?? 0
}

function resolveEmbeddingForSave(): { provider: string; model: string } | null {
  const p = String(form.value.embeddingProvider ?? '').trim()
  if (p === OLLAMA_PROVIDER) {
    const m = (form.value.embeddingModel || OLLAMA_MODEL).trim()
    return { provider: OLLAMA_PROVIDER, model: m || OLLAMA_MODEL }
  }
  if (!p && stashedEmbedding.value?.provider && stashedEmbedding.value.model) {
    return stashedEmbedding.value
  }
  return null
}
</script>

<template>
  <div class="knowledge-page">
    <DashboardHeader />
    <main class="page-main">
      <div class="page-container">
        <section class="page-header">
          <div class="title-area">
            <h1 class="page-title">{{ isEditMode ? t('knowledgeBase.createPage.editTitle') : t('knowledgeBase.createPage.createTitle') }}</h1>
            <p class="page-subtitle">{{ isEditMode ? t('knowledgeBase.createPage.editSubtitle') : t('knowledgeBase.createPage.createSubtitle') }}</p>
          </div>
          <div class="header-actions">
            <BackButton />
            <button
              class="btn btn-primary"
              :disabled="saving || detailLoading || !!detailError || (isEditMode && !detailLoaded)"
              @click="saveNow"
            >
              {{ saving ? (isEditMode ? t('knowledgeBase.createPage.saving') : t('knowledgeBase.createPage.creating')) : (isEditMode ? t('knowledgeBase.createPage.saveChanges') : t('knowledgeBase.createPage.createNow')) }}
            </button>
          </div>
        </section>

        <div v-if="isEditMode && detailError" class="detail-error">
          <div class="error-title">{{ t('knowledgeBase.createPage.loadFailed') }}</div>
          <div class="error-msg">{{ detailError }}</div>
          <BackButton />
        </div>

        <div v-else-if="isEditMode && (!detailLoaded || detailLoading)" class="detail-loading">
          <div>{{ t('knowledgeBase.createPage.loadingDetail') }}</div>
        </div>

        <KnowledgeBaseForm
          v-else
          v-model="form"
          :errors="errors"
          :uploading-icon="uploadingIcon"
          @upload-icon="handleUploadIcon"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.knowledge-page { min-height: 100vh; background: var(--app-color-bg-page); display: flex; flex-direction: column; }
.page-main { flex: 1; padding-top: var(--app-page-top-desktop); padding-bottom: var(--app-page-bottom-desktop); }
.page-container { max-width: 1100px; margin: 0 auto; padding: 48px 48px 0; display: flex; flex-direction: column; gap: 24px; }
.page-header { padding-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.title-area { flex: 1; }
.page-title { margin: 0 0 8px; font-size: 30px; font-weight: 600; color: #1a1a1a; line-height: 1.2; }
.page-subtitle { margin: 0; font-size: 15px; color: var(--app-color-text-secondary); line-height: 1.5; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.btn { height: 40px; border-radius: 8px; font-size: 14px; font-weight: 500; padding: 0 18px; cursor: pointer; transition: all 0.2s ease; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-outline { background: #fff; border: 1px solid rgba(0,0,0,0.12); color: #374151; }
.btn-outline:hover:not(:disabled) { background: #f9fafb; border-color: #2d2d2d; color: #1f2937; }
.btn-primary { background: #2d2d2d; border: 1px solid #2d2d2d; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #1a1a1a; border-color: #1a1a1a; }

.detail-loading {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 24px;
  color: var(--app-color-text-secondary);
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.detail-error {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 24px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  justify-content: center;
}

.error-title { font-weight: 600; color: #1a1a1a; }
.error-msg { color: #dc2626; font-size: 13px; line-height: 1.6; }

@media (max-width: 768px) {
  .page-main { padding-top: var(--app-page-top-mobile); padding-bottom: var(--app-page-bottom-mobile); }
  .page-container { padding: 32px 20px 0; gap: 20px; }
  .page-header { flex-direction: column; }
  .page-title { font-size: 24px; }
  .header-actions { flex-wrap: wrap; }
}
</style>
