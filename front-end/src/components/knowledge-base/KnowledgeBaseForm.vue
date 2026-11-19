<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SkillIconPicker from '@/components/skills/create/SkillIconPicker.vue'
import type { KnowledgeBaseFormData } from '@/api/knowledgeBase'
import kbIcon1 from '@/assets/icon/知识库图标1.png'
import kbIcon2 from '@/assets/icon/知识库图标2.png'
import kbIcon3 from '@/assets/icon/知识库图标3.png'
import kbIcon4 from '@/assets/icon/知识库图标4.png'

const model = defineModel<KnowledgeBaseFormData>({ required: true })
withDefaults(
  defineProps<{
    errors: Partial<Record<keyof KnowledgeBaseFormData, string>>
    uploadingIcon?: boolean
  }>(),
  { uploadingIcon: false },
)
const emit = defineEmits<{ 'upload-icon': [file: File] }>()
const { t } = useI18n()

const KNOWLEDGE_BASE_SYSTEM_ICONS = [kbIcon1, kbIcon2, kbIcon3, kbIcon4]

const OLLAMA_PROVIDER = 'ollama'
const OLLAMA_MODEL = 'qwen3-embedding:4b'
const OLLAMA_DIM = 2560
/** 仅展示用；实际请求体使用 bge-m3:latest（见 create/index.vue） */
const SPARSE_MODEL_DISPLAY = 'bge-m3'
const RERANK_MODEL_OPTIONS = ['Qwen/Qwen3-Reranker-8B', 'Qwen/Qwen3-Reranker-0.6B']
const FUSION_OPTIONS = [
  { value: 'rrf', label: 'RRF (Reciprocal Rank Fusion)' },
  { value: 'linear_interpolation', label: 'Linear Interpolation' },
  { value: 'weighted_sum', label: 'Weighted Sum' },
]

const hybridDisabled = computed(() => !model.value.sparseEnabled)
const embeddingDimension = computed(() => {
  if (model.value.embeddingProvider === OLLAMA_PROVIDER) return OLLAMA_DIM
  return 0
})

watch(
  () => model.value.embeddingProvider,
  (provider) => {
    if (provider === OLLAMA_PROVIDER) {
      model.value.embeddingModel = OLLAMA_MODEL
      return
    }
    if (provider === '') {
      model.value.embeddingModel = ''
    }
  },
  { immediate: true },
)

watch(
  () => model.value.rerankEnabled,
  (enabled) => {
    if (!enabled) return
    if (!RERANK_MODEL_OPTIONS.includes(model.value.rerankModel)) {
      model.value.rerankModel = 'Qwen/Qwen3-Reranker-0.6B'
    }
  },
  { immediate: true },
)

watch(
  () => model.value.sparseEnabled,
  (enabled) => {
    if (!enabled && model.value.retrievalStrategy === 'hybrid') {
      model.value.retrievalStrategy = 'dense'
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="form-stack">
    <section class="form-card">
      <h3 class="card-title">{{ t('knowledgeBase.form.basicInfo') }}</h3>
      <div class="grid two-cols base-grid">
        <div class="field full">
          <label class="label">{{ t('knowledgeBase.form.name') }} <span class="required">*</span></label>
          <input v-model="model.name" class="input" type="text" maxlength="60" :placeholder="t('knowledgeBase.form.namePlaceholder')" />
          <p v-if="errors.name" class="error">{{ errors.name }}</p>
        </div>

        <div class="field full">
          <label class="label">{{ t('knowledgeBase.form.description') }}</label>
          <textarea v-model="model.description" class="textarea" maxlength="300" rows="4" :placeholder="t('knowledgeBase.form.descriptionPlaceholder')" />
        </div>

        <div class="field base-icon-field">
          <SkillIconPicker
            v-model="model.iconUrl"
            :label="t('knowledgeBase.form.icon')"
            :system-icons="KNOWLEDGE_BASE_SYSTEM_ICONS"
            :uploading-icon="uploadingIcon"
            @upload-icon="emit('upload-icon', $event)"
          />
        </div>

        <div class="field base-side-stack">
          <div class="field side-item">
            <label class="label">{{ t('knowledgeBase.form.visibility') }}</label>
            <select v-model="model.visibility" class="select">
              <option value="private">{{ t('knowledgeBase.visibility.private') }}</option>
              <option value="public">{{ t('knowledgeBase.visibility.public') }}</option>
            </select>
          </div>

          <div class="field side-item">
            <label class="label">{{ t('knowledgeBase.form.enabledStatus') }}</label>
            <div class="switch-field">
              <label class="switch">
                <input v-model="model.enabled" type="checkbox" />
                <span class="slider" />
              </label>
              <span class="switch-text">{{ model.enabled ? t('knowledgeBase.form.enabled') : t('knowledgeBase.form.notEnabled') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="form-card">
      <h3 class="card-title">{{ t('knowledgeBase.form.config') }}</h3>
      <div class="grid two-cols">
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.embeddingProvider') }}</label>
          <input
            v-if="model.embeddingProvider === OLLAMA_PROVIDER"
            class="input"
            type="text"
            :value="t('knowledgeBase.form.localOllama')"
            readonly
          />
          <select v-else v-model="model.embeddingProvider" class="select">
            <option value="">{{ t('knowledgeBase.form.chooseEmbeddingProvider') }}</option>
            <option value="ollama">{{ t('knowledgeBase.form.localOllama') }}</option>
          </select>
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.embeddingModel') }}</label>
          <input
            v-if="model.embeddingProvider === OLLAMA_PROVIDER"
            :value="OLLAMA_MODEL"
            class="input"
            type="text"
            readonly
          />
          <input v-else class="input" type="text" disabled :placeholder="t('knowledgeBase.form.chooseEmbeddingProviderFirst')" />
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.embeddingDimension') }}</label>
          <input :value="embeddingDimension || ''" class="input" type="text" readonly placeholder="—" />
          <p class="hint">{{ t('knowledgeBase.form.dimensionAuto') }}</p>
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.denseDistanceMetric') }}</label>
          <select v-model="model.denseDistanceMetric" class="select">
            <option value="cosine">{{ t('knowledgeBase.form.cosineOption') }}</option>
            <option value="dot">{{ t('knowledgeBase.form.dotOption') }}</option>
          </select>
          <p class="hint">{{ t('knowledgeBase.form.denseMetricHint') }}</p>
        </div>

        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.sparseEnabled') }}</label>
          <div class="switch-field">
            <label class="switch">
              <input v-model="model.sparseEnabled" type="checkbox" />
              <span class="slider" />
            </label>
            <span class="switch-text">{{ model.sparseEnabled ? t('knowledgeBase.form.enabled') : t('knowledgeBase.form.notEnabled') }}</span>
          </div>
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.sparseProvider') }}</label>
          <input :value="t('knowledgeBase.form.localOllama')" class="input" type="text" :disabled="true" />
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.sparseModel') }}</label>
          <input :value="SPARSE_MODEL_DISPLAY" class="input" type="text" :disabled="true" />
        </div>

        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.retrievalStrategy') }}</label>
          <select v-model="model.retrievalStrategy" class="select">
            <option value="dense">{{ t('knowledgeBase.form.denseRetrieval') }}</option>
            <option value="hybrid" :disabled="hybridDisabled">{{ t('knowledgeBase.form.hybridRetrieval') }}</option>
          </select>
          <p class="hint">
            {{ t('knowledgeBase.form.hybridHint') }}
          </p>
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.topK') }}</label>
          <input v-model.number="model.topK" class="input" type="number" min="1" />
          <p class="hint">{{ t('knowledgeBase.form.topKHint') }}</p>
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.rerank') }}</label>
          <div class="switch-field">
            <label class="switch">
              <input v-model="model.rerankEnabled" type="checkbox" />
              <span class="slider" />
            </label>
            <span class="switch-text">{{ model.rerankEnabled ? t('knowledgeBase.form.enabled') : t('knowledgeBase.form.notEnabled') }}</span>
          </div>
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.rerankProvider') }}</label>
          <input :value="t('knowledgeBase.form.qwen')" class="input" type="text" :disabled="true" />
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.rerankModel') }}</label>
          <select v-model="model.rerankModel" class="select" :disabled="!model.rerankEnabled">
            <option v-for="m in RERANK_MODEL_OPTIONS" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>

        <div class="field full">
          <label class="label">{{ t('knowledgeBase.form.chunkConfig') }}</label>
        </div>
        <div class="field">
          <label class="label">{{ t('knowledgeBase.form.chunkStrategy') }}</label>
          <select v-model="model.chunkStrategy" class="select">
            <option value="paragraph">{{ t('knowledgeBase.form.paragraphChunk') }}</option>
            <option value="token">{{ t('knowledgeBase.form.tokenChunk') }}</option>
            <option value="markdown_heading">{{ t('knowledgeBase.form.markdownHeadingChunk') }}</option>
            <option value="fixed">{{ t('knowledgeBase.form.fixedChunk') }}</option>
          </select>
          <p class="hint">{{ t('knowledgeBase.form.chunkStrategyHint') }}</p>
        </div>

        <div class="field">
          <label class="label">Chunk Size</label>
          <input v-model.number="model.chunkSize" class="input" type="number" min="1" />
          <p class="hint">{{ t('knowledgeBase.form.chunkSizeHint') }}</p>
          <p v-if="errors.chunkSize" class="error">{{ errors.chunkSize }}</p>
        </div>
        <div class="field">
          <label class="label">Chunk Overlap</label>
          <input v-model.number="model.chunkOverlap" class="input" type="number" min="0" />
          <p class="hint">{{ t('knowledgeBase.form.chunkOverlapHint') }}</p>
          <p v-if="errors.chunkOverlap" class="error">{{ errors.chunkOverlap }}</p>
        </div>
        <div class="field">
          <label class="label">prefer_heading_split</label>
          <div class="switch-field">
            <label class="switch">
              <input v-model="model.chunkPreferHeadingSplit" type="checkbox" />
              <span class="slider" />
            </label>
            <span class="switch-text">{{ model.chunkPreferHeadingSplit ? t('knowledgeBase.form.preferHeadingSplitOn') : t('knowledgeBase.form.preferHeadingSplitOff') }}</span>
          </div>
          <p class="hint">{{ t('knowledgeBase.form.preferHeadingSplitHint') }}</p>
        </div>
        <div class="field">
          <label class="label">min_chunk_length</label>
          <input v-model.number="model.chunkMinChunkLength" class="input" type="number" min="1" />
          <p class="hint">{{ t('knowledgeBase.form.minChunkLengthHint') }}</p>
        </div>
        <div class="field">
          <label class="label">merge_short_paragraphs</label>
          <div class="switch-field">
            <label class="switch">
              <input v-model="model.chunkMergeShortParagraphs" type="checkbox" />
              <span class="slider" />
            </label>
            <span class="switch-text">{{ model.chunkMergeShortParagraphs ? t('knowledgeBase.form.mergeShortParagraphsOn') : t('knowledgeBase.form.mergeShortParagraphsOff') }}</span>
          </div>
          <p class="hint">{{ t('knowledgeBase.form.mergeShortParagraphsHint') }}</p>
        </div>
        <div class="field">
          <label class="label">table_as_single_chunk</label>
          <div class="switch-field">
            <label class="switch">
              <input v-model="model.chunkTableAsSingleChunk" type="checkbox" />
              <span class="slider" />
            </label>
            <span class="switch-text">{{ model.chunkTableAsSingleChunk ? t('knowledgeBase.form.tableAsSingleChunkOn') : t('knowledgeBase.form.tableAsSingleChunkOff') }}</span>
          </div>
          <p class="hint">{{ t('knowledgeBase.form.tableAsSingleChunkHint') }}</p>
        </div>
        <div class="field">
          <label class="label">code_block_as_single_chunk</label>
          <div class="switch-field">
            <label class="switch">
              <input v-model="model.chunkCodeBlockAsSingleChunk" type="checkbox" />
              <span class="slider" />
            </label>
            <span class="switch-text">{{ model.chunkCodeBlockAsSingleChunk ? t('knowledgeBase.form.codeBlockAsSingleChunkOn') : t('knowledgeBase.form.codeBlockAsSingleChunkOff') }}</span>
          </div>
          <p class="hint">{{ t('knowledgeBase.form.codeBlockAsSingleChunkHint') }}</p>
        </div>

        <div class="field full">
          <label class="label">{{ t('knowledgeBase.form.retrievalConfig') }}</label>
        </div>
        <div class="field">
          <label class="label">dense_prefetch_limit</label>
          <input v-model.number="model.retrievalDensePrefetchLimit" class="input" type="number" min="1" />
          <p class="hint">{{ t('knowledgeBase.form.densePrefetchHint') }}</p>
        </div>
        <div class="field">
          <label class="label">sparse_prefetch_limit</label>
          <input v-model.number="model.retrievalSparsePrefetchLimit" class="input" type="number" min="1" />
          <p class="hint">{{ t('knowledgeBase.form.sparsePrefetchHint') }}</p>
        </div>
        <div class="field">
          <label class="label">fusion</label>
          <select v-model="model.retrievalFusion" class="select">
            <option v-for="o in FUSION_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <p class="hint">{{ t('knowledgeBase.form.fusionHint') }}</p>
        </div>
        <div class="field">
          <label class="label">rerank_top_n</label>
          <input v-model.number="model.retrievalRerankTopN" class="input" type="number" min="1" />
          <p class="hint">{{ t('knowledgeBase.form.rerankTopNHint') }}</p>
        </div>
        <div class="field">
          <label class="label">return_payload</label>
          <div class="switch-field">
            <label class="switch">
              <input v-model="model.retrievalReturnPayload" type="checkbox" />
              <span class="slider" />
            </label>
            <span class="switch-text">{{ model.retrievalReturnPayload ? t('knowledgeBase.form.returnPayloadOn') : t('knowledgeBase.form.returnPayloadOff') }}</span>
          </div>
          <p class="hint">{{ t('knowledgeBase.form.returnPayloadHint') }}</p>
        </div>
        <div class="field">
          <label class="label">rewrite_query</label>
          <div class="switch-field">
            <label class="switch">
              <input v-model="model.retrievalRewriteQuery" type="checkbox" />
              <span class="slider" />
            </label>
            <span class="switch-text">{{ model.retrievalRewriteQuery ? t('knowledgeBase.form.rewriteQueryOn') : t('knowledgeBase.form.rewriteQueryOff') }}</span>
          </div>
          <p class="hint">{{ t('knowledgeBase.form.rewriteQueryHint') }}</p>
        </div>

      </div>
    </section>

  </div>
</template>

<style scoped>
.form-stack { display: flex; flex-direction: column; gap: 16px; }
.form-card { background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 22px 24px; }
.card-title { margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1a1a1a; }
.grid { display: grid; gap: 14px; }
.two-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.base-grid { row-gap: 16px; }
.field { min-width: 0; }
.field.full { grid-column: 1 / -1; }
.label { display: block; margin-bottom: 7px; font-size: 14px; color: #2f2f2f; font-weight: 500; }
.required { color: #dc2626; }
.input, .select, .textarea { width: 100%; box-sizing: border-box; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; background: #fafafa; color: #1a1a1a; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s ease; }
.input, .select { height: 40px; padding: 0 12px; }
.textarea { padding: 10px 12px; resize: vertical; min-height: 92px; }
.input:focus, .select:focus, .textarea:focus { border-color: #2d2d2d; background: #fff; }
.input::placeholder, .textarea::placeholder {
  color: #9ca3af;
  font-size: 14px;
  font-weight: 400;
  font-family: inherit;
  line-height: 1.5;
}
.hint { margin: 6px 0 0; font-size: 12px; color: #8a8a8a; line-height: 1.5; }
.error { margin: 6px 0 0; font-size: 12px; color: #dc2626; line-height: 1.5; }
.base-icon-field {
  align-self: stretch;
  display: flex;
}
.base-side-stack {
  display: grid;
  gap: 14px;
  align-content: stretch;
  align-self: stretch;
}
.side-item { margin: 0; }
.switch-field { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 12px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; background: #fafafa; }
.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 21px;
  flex-shrink: 0;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 21px;
  transition: 0.2s;
}
.slider::before {
  position: absolute;
  content: '';
  height: 15px;
  width: 15px;
  left: 3px;
  bottom: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
.switch input:checked + .slider { background: #1e40af; }
.switch input:checked + .slider::before { transform: translateX(17px); }
.switch-text { font-size: 13px; color: #6b7280; line-height: 1; }

/* 仅作用于知识库表单：放大图标区域并与右侧两项通高、底部对齐 */
.base-icon-field :deep(.icon-section) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.base-icon-field :deep(.icon-row) {
  flex: 1;
  align-items: flex-end;
}
.base-icon-field :deep(.icon-preview) {
  width: 116px !important;
  height: 116px !important;
}
.base-icon-field :deep(.system-icon-btn) {
  width: 40px !important;
  height: 40px !important;
}
.base-icon-field :deep(.system-icon-img) {
  width: 100% !important;
  height: 100% !important;
}
.base-icon-field :deep(.upload-btn) {
  height: 30px;
  padding: 0 12px;
}

@media (max-width: 900px) {
  .two-cols { grid-template-columns: 1fr; }
  .base-side-stack { gap: 12px; }
  .base-icon-field :deep(.icon-preview) {
    width: 92px !important;
    height: 92px !important;
  }
  .base-icon-field :deep(.system-icon-btn) {
    width: 34px !important;
    height: 34px !important;
  }
  .base-icon-field :deep(.upload-btn) {
    height: 26px;
    padding: 0 10px;
  }
}
</style>
