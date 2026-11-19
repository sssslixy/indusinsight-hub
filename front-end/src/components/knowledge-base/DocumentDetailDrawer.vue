<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DocumentStatus, KbDocumentDetailView, KbVisibility } from '@/api/knowledgeDocument'

const props = withDefaults(
  defineProps<{
    visible: boolean
    /** 接口返回的详情；loading / error 时为 null */
    detail: KbDocumentDetailView | null
    loading?: boolean
    error?: string | null
    /** 加载中用于标题占位（列表行上的文档名） */
    previewName?: string
    previewOriginalFileName?: string
  }>(),
  { loading: false, error: null, previewName: '', previewOriginalFileName: '' },
)

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

/** 与文档列表“总体状态”列一致 */
const overallLabelKeyMap: Record<DocumentStatus, string> = {
  pending: 'knowledgeBase.documents.status.pending',
  processing: 'knowledgeBase.documents.status.processing',
  success: 'knowledgeBase.documents.status.success',
  failed: 'knowledgeBase.documents.status.failed',
  disabled: 'knowledgeBase.documents.status.disabled',
}

/** 与文档列表“处理阶段状态”单元格一致（DocumentTable.stageStatusTextMap） */
const stageLabelKeyMap: Record<DocumentStatus, string> = {
  pending: 'knowledgeBase.documents.stageStatus.pending',
  processing: 'knowledgeBase.documents.stageStatus.processing',
  success: 'knowledgeBase.documents.stageStatus.success',
  failed: 'knowledgeBase.documents.stageStatus.failed',
  disabled: 'knowledgeBase.documents.stageStatus.disabled',
}

const statusClassMap = (status: DocumentStatus) => {
  switch (status) {
    case 'success':
      return 'status-success'
    case 'processing':
      return 'status-processing'
    case 'pending':
      return 'status-pending'
    case 'failed':
      return 'status-failed'
    case 'disabled':
    default:
      return 'status-disabled'
  }
}

/** 与列表/后端约定一致；兼容 running */
const normalizeDocumentStatus = (s: string | null | undefined): DocumentStatus => {
  if (s == null || !String(s).trim()) return 'pending'
  const v = String(s).trim().toLowerCase()
  if (v === 'running') return 'processing'
  const allowed: DocumentStatus[] = ['pending', 'processing', 'success', 'failed', 'disabled']
  if (allowed.includes(v as DocumentStatus)) return v as DocumentStatus
  return 'pending'
}

const stageDotClass = (status: DocumentStatus) => {
  switch (status) {
    case 'success':
      return 'dot-success'
    case 'processing':
      return 'dot-processing'
    case 'pending':
      return 'dot-pending'
    case 'failed':
      return 'dot-failed'
    case 'disabled':
    default:
      return 'dot-disabled'
  }
}

const visibilityLabelKey: Record<KbVisibility, string> = {
  private: 'knowledgeBase.visibility.private',
  team: 'knowledgeBase.visibility.team',
  public: 'knowledgeBase.visibility.public',
}

const displayText = (value: unknown) => {
  if (value === null || value === undefined) return '--'
  if (typeof value === 'string' && !value.trim()) return '--'
  return String(value)
}

const formatBytes = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '--'
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  if (num <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let idx = 0
  let v = num
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024
    idx += 1
  }
  const fixed = idx === 0 ? 0 : 1
  return `${v.toFixed(fixed)} ${units[idx]}`
}

const fmtDateTime = (value: string | null | undefined) => {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const displayNum = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '--'
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : '--'
}

const doc = computed(() => props.detail?.document || null)
const kb = computed(() => props.detail?.kb || null)
const failure = computed(() => props.detail?.failure || null)
const latestTask = computed(() => props.detail?.latestTask || null)

const failureTaskStatus = computed(() => normalizeDocumentStatus(failure.value?.lastTaskStatus))

const titleMainText = computed(() => {
  if (doc.value?.name) return doc.value.name
  if (props.previewName?.trim()) return props.previewName.trim()
  return t('knowledgeBase.documents.detail.title')
})

const titleSubText = computed(() => {
  if (doc.value?.originalFileName) return doc.value.originalFileName
  return props.previewOriginalFileName?.trim() || ''
})

const stackOpen = ref(false)

watch(
  () => [props.detail?.document?.id, props.loading, props.error] as const,
  () => {
    stackOpen.value = false
  },
)

const stageBlocks = computed(() => {
  const d = doc.value
  if (!d) return []
  return [
    { key: 'parse', labelKey: 'knowledgeBase.documents.stage.parse', status: d.parseStatus },
    { key: 'split', labelKey: 'knowledgeBase.documents.stage.split', status: d.splitStatus },
    { key: 'embed', labelKey: 'knowledgeBase.documents.stage.embed', status: d.embeddingStatus },
    { key: 'index', labelKey: 'knowledgeBase.documents.stage.index', status: d.indexStatus },
  ] as const
})

const onClose = () => emit('close')
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="visible" class="drawer-overlay" @click.self="onClose">
        <div class="drawer">
          <!-- 模块 1：顶部标题区 -->
          <div class="drawer-header">
            <div class="drawer-title">
              <div v-if="doc && !loading" class="title-tags">
                <span class="type-pill">{{ displayText(doc.fileType) }}</span>
                <span :class="['overall-pill', statusClassMap(doc.overallStatus)]">
                  {{ t(overallLabelKeyMap[doc.overallStatus]) }}
                </span>
              </div>
              <div class="title-main">{{ titleMainText }}</div>
              <div v-if="loading" class="title-sub title-sub--muted">{{ t('knowledgeBase.documents.detail.loadingDetail') }}</div>
              <div
                v-else-if="titleSubText"
                class="title-sub"
                :title="titleSubText"
              >
                {{ titleSubText }}
              </div>
            </div>

            <div class="drawer-close">
              <button type="button" class="close-btn" :aria-label="t('knowledgeBase.documents.detail.close')" @click="onClose">×</button>
            </div>
          </div>

          <div class="drawer-body">
              <div v-if="loading" class="detail-skeleton" aria-busy="true">
                <div v-for="n in 5" :key="n" class="sk-card">
                  <div class="sk-line sk-line--title" />
                  <div class="sk-line" />
                  <div class="sk-line sk-line--short" />
                </div>
              </div>

              <div v-else-if="error" class="detail-error">
                <p class="detail-error-title">{{ t('knowledgeBase.documents.detail.loadFailedTitle') }}</p>
                <p class="detail-error-msg">{{ error }}</p>
              </div>

              <template v-else-if="detail && doc && kb">
                <!-- 模块 2：基础信息 -->
                <section class="detail-card">
                  <h3 class="card-title">{{ t('knowledgeBase.documents.detail.basicInfo') }}</h3>
                  <div class="kv-grid kv-grid--2">
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.documentId') }}</span>
                      <span class="v mono">{{ displayNum(doc.id) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.documentCode') }}</span>
                      <span class="v mono">{{ displayText(doc.documentCode) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.table.fileType') }}</span>
                      <span class="v">{{ displayText(doc.fileType) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">MIME Type</span>
                      <span class="v mono break-all">{{ displayText(doc.mimeType) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.fileExtension') }}</span>
                      <span class="v mono">{{ displayText(doc.fileExtension) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.table.fileSize') }}</span>
                      <span class="v">{{ formatBytes(doc.fileSize) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.sourceType') }}</span>
                      <span class="v">{{ displayText(doc.sourceType) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.language') }}</span>
                      <span class="v">{{ displayText(doc.language) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.parser') }}</span>
                      <span class="v">{{ displayText(doc.parserType) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.versionNo') }}</span>
                      <span class="v mono">{{ displayNum(doc.versionNo) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.table.enabledStatus') }}</span>
                      <span class="v">
                        <span :class="['enabled-tag', doc.enabled ? 'enabled' : 'disabled']">
                          {{ doc.enabled ? t('knowledgeBase.documents.enabled') : t('knowledgeBase.documents.disabled') }}
                        </span>
                      </span>
                    </div>
                  </div>
                </section>

                <!-- 模块 3：知识库与处理配置 -->
                <section class="detail-card">
                  <h3 class="card-title">{{ t('knowledgeBase.documents.detail.knowledgeConfig') }}</h3>
                  <p class="card-hint">{{ t('knowledgeBase.documents.detail.knowledgeConfigHint') }}</p>
                  <div class="kv-grid kv-grid--2">
                    <div v-if="kb.knowledgeBaseId != null" class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.knowledgeBaseId') }}</span>
                      <span class="v mono">{{ displayNum(kb.knowledgeBaseId) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.knowledgeBaseName') }}</span>
                      <span class="v">{{ displayText(kb.name) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.form.visibility') }}</span>
                      <span class="v">{{ visibilityLabelKey[kb.visibility] ? t(visibilityLabelKey[kb.visibility]) : displayText(kb.visibility) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.modelProvider') }}</span>
                      <span class="v">{{ displayText(kb.embeddingProvider) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.form.embeddingModel') }}</span>
                      <span class="v mono break-all">{{ displayText(kb.embeddingModel) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.form.retrievalStrategy') }}</span>
                      <span class="v">{{ displayText(kb.retrievalStrategy) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.form.chunkStrategy') }}</span>
                      <span class="v">{{ displayText(kb.chunkStrategy) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">Chunk Size</span>
                      <span class="v mono">{{ displayNum(kb.chunkSize) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">Chunk Overlap</span>
                      <span class="v mono">{{ displayNum(kb.chunkOverlap) }}</span>
                    </div>
                  </div>
                </section>

                <!-- 模块 4：处理状态 -->
                <section class="detail-card">
                  <h3 class="card-title">{{ t('knowledgeBase.documents.detail.processingStatus') }}</h3>
                  <div class="overall-banner">
                    <span class="overall-label">{{ t('knowledgeBase.documents.table.overallStatus') }}</span>
                    <span :class="['status-tag-lg', statusClassMap(doc.overallStatus)]">
                      {{ t(overallLabelKeyMap[doc.overallStatus]) }}
                    </span>
                  </div>
                  <div class="stage-grid">
                    <div v-for="it in stageBlocks" :key="it.key" class="stage-block">
                      <div class="stage-block-top">
                        <span class="stage-dot" :class="stageDotClass(it.status)" />
                        <span class="stage-block-name">{{ t(it.labelKey) }}</span>
                      </div>
                      <span :class="['stage-block-status', `st--${stageDotClass(it.status)}`]">
                        {{ t(stageLabelKeyMap[it.status]) }}
                      </span>
                    </div>
                  </div>
                </section>

                <!-- 模块 5：处理结果 -->
                <section class="detail-card">
                  <h3 class="card-title">{{ t('knowledgeBase.documents.detail.processingResult') }}</h3>
                  <div class="metrics-row">
                    <div class="metric">
                      <div class="metric-value">{{ displayNum(doc.pageCount) }}</div>
                      <div class="metric-label">{{ t('knowledgeBase.documents.table.pages') }}</div>
                    </div>
                    <div class="metric">
                      <div class="metric-value">{{ displayNum(doc.tokenCount) }}</div>
                      <div class="metric-label">{{ t('knowledgeBase.documents.detail.tokenCount') }}</div>
                    </div>
                    <div class="metric">
                      <div class="metric-value">{{ displayNum(doc.chunkCount) }}</div>
                      <div class="metric-label">{{ t('knowledgeBase.documents.detail.chunkCount') }}</div>
                    </div>
                  </div>
                  <div class="kv-grid kv-grid--1 kv-tight">
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.lastParsedAt') }}</span>
                      <span class="v">{{ fmtDateTime(doc.lastParsedAt) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.lastEmbeddedAt') }}</span>
                      <span class="v">{{ fmtDateTime(doc.lastEmbeddedAt) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.createdAt') }}</span>
                      <span class="v">{{ fmtDateTime(doc.createdAt) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.updatedAt') }}</span>
                      <span class="v">{{ fmtDateTime(doc.updatedAt) }}</span>
                    </div>
                  </div>
                </section>

                <!-- 最近任务（接口 latestTask） -->
                <section v-if="latestTask" class="detail-card">
                  <h3 class="card-title">{{ t('knowledgeBase.documents.detail.latestTask') }}</h3>
                  <div class="kv-grid kv-grid--1 kv-tight">
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.taskCode') }}</span>
                      <span class="v mono break-all">{{ displayText(latestTask.taskCode) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.taskType') }}</span>
                      <span class="v mono">{{ displayText(latestTask.taskType) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.taskStatus') }}</span>
                      <span class="v">
                        <span :class="['status-mini', statusClassMap(normalizeDocumentStatus(latestTask.taskStatus))]">
                          {{ t(overallLabelKeyMap[normalizeDocumentStatus(latestTask.taskStatus)]) }}
                        </span>
                      </span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.triggerType') }}</span>
                      <span class="v">{{ displayText(latestTask.triggerType) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.retry') }}</span>
                      <span class="v mono">
                        {{ displayNum(latestTask.retryCount) }} / {{ displayNum(latestTask.maxRetryCount) }}
                      </span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.latestErrorStage') }}</span>
                      <span class="v mono">{{ displayText(latestTask.latestErrorStage) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.startedAt') }}</span>
                      <span class="v">{{ fmtDateTime(latestTask.startedAt) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.finishedAt') }}</span>
                      <span class="v">{{ fmtDateTime(latestTask.finishedAt) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.errorSummary') }}</span>
                      <span class="v break-all">{{ displayText(latestTask.errorMessage) }}</span>
                    </div>
                  </div>
                </section>

                <!-- 模块 6：失败 / 异常（仅失败时强调展示） -->
                <section v-if="failure" class="detail-card detail-card--alert">
                  <h3 class="card-title card-title--alert">{{ t('knowledgeBase.documents.detail.failureInfo') }}</h3>
                  <div class="kv-grid kv-grid--1 kv-tight">
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.latestFailedStage') }}</span>
                      <span class="v">{{ displayText(failure.failedStageLabel) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.latestTaskType') }}</span>
                      <span class="v">{{ displayText(failure.lastTaskTypeLabel) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="k">{{ t('knowledgeBase.documents.detail.taskStatus') }}</span>
                      <span class="v">
                        <span :class="['status-mini', statusClassMap(failureTaskStatus)]">
                          {{ t(overallLabelKeyMap[failureTaskStatus]) }}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div class="error-summary">
                    <div class="error-summary-label">{{ t('knowledgeBase.documents.detail.errorSummary') }}</div>
                    <p class="error-summary-text">{{ displayText(failure.errorMessage) }}</p>
                  </div>
                  <div v-if="failure.errorStack && String(failure.errorStack).trim()" class="stack-section">
                    <button type="button" class="stack-toggle" @click="stackOpen = !stackOpen">
                      {{ stackOpen ? t('knowledgeBase.documents.detail.collapseStack') : t('knowledgeBase.documents.detail.expandStack') }}
                    </button>
                    <pre v-show="stackOpen" class="stack-pre">{{ failure.errorStack }}</pre>
                  </div>
                </section>
              </template>

              <div v-else class="empty-detail">{{ t('knowledgeBase.documents.detail.empty') }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1000;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
}

.drawer {
  width: 580px;
  max-width: 100%;
  background: #ffffff;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-header {
  padding: 18px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}

.drawer-title {
  min-width: 0;
  flex: 1;
}

.title-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.type-pill {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #525252;
  font-weight: 700;
  white-space: nowrap;
}

.overall-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.overall-pill.status-success {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}
.overall-pill.status-processing {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}
.overall-pill.status-pending {
  background: rgba(0, 0, 0, 0.05);
  color: #737373;
}
.overall-pill.status-failed {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
.overall-pill.status-disabled {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.14);
  color: #737373;
}

.title-main {
  font-size: 17px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.title-sub {
  margin-top: 8px;
  font-size: 13px;
  color: #a3a3a3;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

.title-sub--muted {
  -webkit-line-clamp: 1;
  line-clamp: 1;
  font-style: italic;
}

.detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sk-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 16px;
  background: #fafafa;
}

.sk-line {
  height: 12px;
  border-radius: 6px;
  background: #ececec;
  margin-bottom: 10px;
}

.sk-line:last-child {
  margin-bottom: 0;
}

.sk-line--title {
  width: 40%;
  height: 14px;
}

.sk-line--short {
  width: 55%;
}

.detail-error {
  padding: 32px 12px;
  text-align: center;
}

.detail-error-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 800;
  color: #1a1a1a;
}

.detail-error-msg {
  margin: 0;
  font-size: 13px;
  color: #737373;
  line-height: 1.6;
  word-break: break-word;
}

.close-btn {
  height: 34px;
  width: 34px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  cursor: pointer;
  font-size: 18px;
  color: #525252;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.drawer-body {
  padding: 18px 20px 18px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.detail-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 16px 16px;
  background: #fafafa;
  margin-bottom: 16px;
}

.detail-card:last-of-type {
  margin-bottom: 0;
}

.detail-card--alert {
  background: #fffafa;
  border-color: rgba(239, 68, 68, 0.22);
}

.card-title {
  font-size: 14px;
  font-weight: 900;
  color: #1a1a1a;
  margin: 0 0 12px;
}

.card-title--alert {
  color: #b91c1c;
}

.card-hint {
  margin: -6px 0 12px;
  font-size: 12px;
  color: #737373;
  line-height: 1.5;
}

.kv-grid {
  display: grid;
  gap: 12px 20px;
}

.kv-grid--2 {
  grid-template-columns: 1fr 1fr;
}

.kv-grid--1 {
  grid-template-columns: 1fr;
}

.kv-tight {
  gap: 10px;
}

.kv-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.k {
  font-size: 13px;
  color: #737373;
  font-weight: 700;
  flex-shrink: 0;
  max-width: 46%;
}

.v {
  font-size: 13px;
  color: #1a1a1a;
  font-weight: 600;
  text-align: right;
  min-width: 0;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.break-all {
  word-break: break-all;
}

.enabled-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}
.enabled-tag.enabled {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}
.enabled-tag.disabled {
  background: rgba(244, 63, 94, 0.06);
  color: #9ca3af;
  border: 1px solid rgba(244, 63, 94, 0.14);
}

.overall-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.overall-label {
  font-size: 13px;
  font-weight: 800;
  color: #525252;
}

.status-tag-lg {
  display: inline-flex;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}

.status-success {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}
.status-processing {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}
.status-pending {
  background: rgba(0, 0, 0, 0.05);
  color: #737373;
}
.status-failed {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
.status-disabled {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.14);
  color: #737373;
}

.stage-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stage-block {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stage-block-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.dot-success {
  background: rgba(34, 197, 94, 0.8);
  border-color: rgba(34, 197, 94, 0.3);
}
.dot-processing {
  background: rgba(37, 99, 235, 0.85);
  border-color: rgba(37, 99, 235, 0.35);
}
.dot-pending {
  background: rgba(107, 114, 128, 0.75);
  border-color: rgba(107, 114, 128, 0.25);
}
.dot-failed {
  background: rgba(220, 38, 38, 0.9);
  border-color: rgba(220, 38, 38, 0.35);
}
.dot-disabled {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(0, 0, 0, 0.12);
}

.stage-block-name {
  font-size: 13px;
  font-weight: 800;
  color: #525252;
}

.stage-block-status {
  font-size: 12px;
  font-weight: 900;
  padding-left: 18px;
}

.st--dot-success {
  color: #16a34a;
}
.st--dot-processing {
  color: #2563eb;
}
.st--dot-pending {
  color: #737373;
}
.st--dot-failed {
  color: #dc2626;
}
.st--dot-disabled {
  color: #737373;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.metric {
  padding: 12px 10px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  text-align: center;
}

.metric-value {
  font-size: 16px;
  font-weight: 900;
  color: #1a1a1a;
  line-height: 1.2;
}

.metric-label {
  margin-top: 6px;
  font-size: 12px;
  color: #737373;
  font-weight: 700;
}

.status-mini {
  font-size: 12px;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.error-summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(239, 68, 68, 0.25);
}

.error-summary-label {
  font-size: 12px;
  font-weight: 800;
  color: #b91c1c;
  margin-bottom: 6px;
}

.error-summary-text {
  margin: 0;
  font-size: 13px;
  color: #525252;
  line-height: 1.65;
}

.stack-section {
  margin-top: 12px;
}

.stack-toggle {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 13px;
  font-weight: 800;
  color: #b91c1c;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.stack-toggle:hover {
  color: #991b1b;
}

.stack-pre {
  margin: 10px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  color: #404040;
  max-height: 220px;
  overflow-y: auto;
}

.empty-detail {
  font-size: 14px;
  color: #737373;
  padding: 24px 0;
  text-align: center;
}

@media (max-width: 640px) {
  .drawer {
    width: 100%;
  }

  .kv-grid--2 {
    grid-template-columns: 1fr;
  }

  .metrics-row {
    grid-template-columns: 1fr;
  }

  .stage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
