<script setup lang="ts">
import { computed, ref } from 'vue'
import { skillPublishMinimum } from '@/utils/skills/skillReviewPolicy'
import { useI18n } from 'vue-i18n'
import type { SkillArtifactFormState } from '@/types/skills/skillCreate'
import type { SkillValidationIssue, SkillValidationResponse } from '@/api/skill'
import AgentModelSelector from '@/components/agents/create/AgentModelSelector.vue'
import SkillValidationReport from './SkillValidationReport.vue'
import type { ModelOption } from '@/types/modules/agentCreate'

const props = withDefaults(
  defineProps<{
    modelValue: SkillArtifactFormState
    readonly?: boolean
    serverFileName?: string
    serverFileSizeBytes?: number | null
    validationStatus?: 'idle' | 'running' | 'passed' | 'failed'
    validationResult?: SkillValidationResponse | null
    validationRequired?: boolean
    downloadEnabled?: boolean
    downloading?: boolean
    busy?: boolean
    validationUserModelId?: string
    modelOptions?: ModelOption[]
    modelsLoading?: boolean
    modelsError?: string
  }>(),
  {
    readonly: false,
    serverFileName: '',
    serverFileSizeBytes: null,
    validationStatus: 'idle',
    validationResult: null,
    validationRequired: true,
    downloadEnabled: false,
    downloading: false,
    busy: false,
    validationUserModelId: '',
    modelOptions: () => [],
    modelsLoading: false,
    modelsError: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [val: SkillArtifactFormState]
  validate: []
  download: []
  'update:validationUserModelId': [val: string]
  'refresh-models': []
}>()

const { t } = useI18n()
const freshReport = computed(() => props.validationResult ? {
  ...props.validationResult,
  modelName: props.validationResult.llmModel?.displayName || props.validationResult.llmModel?.modelCode,
} : null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const fileLocked = computed(() => props.readonly || props.busy || props.validationStatus === 'running')

function patch(p: Partial<SkillArtifactFormState>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}

function onSkillFileChange(e: Event) {
  if (fileLocked.value) return
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  patch({ skillFile: f })
}

function clearSkillFile() {
  if (fileLocked.value) return
  patch({ skillFile: null })
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function onDragOver() {
  if (!fileLocked.value) isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  if (fileLocked.value) return
  const f = e.dataTransfer?.files?.[0]
  if (!f) return
  patch({ skillFile: f })
}

const canDownloadServerFile = computed(() => {
  return props.readonly && props.downloadEnabled && !!props.serverFileName && !props.modelValue.skillFile
})

function handleSkillFileAreaDownload() {
  if (!canDownloadServerFile.value || props.downloading) return
  emit('download')
}

const canValidate = computed(() => {
  return !fileLocked.value && !props.modelsLoading && (!!props.modelValue.skillFile || !!props.serverFileName)
})

const validationTitle = computed(() => {
  if (props.validationStatus === 'running') return t('create.artifact.validationRunning')
  if (props.validationStatus === 'passed') {
    if (props.validationResult?.llmStatus === 'failed') return t('create.artifact.validationScoringFailed')
    if (props.validationResult?.llmStatus !== 'succeeded') return t('create.artifact.validationPassedUnscored')
    const score = props.validationResult?.llmAnalysis?.score
    if (typeof score === 'number' && score < skillPublishMinimum(props.validationResult)) return t('create.artifact.validationPassedLowScore')
    if (props.validationResult?.metadataStatus !== 'succeeded') return t('create.report.metadataIncomplete')
    return props.validationResult?.warningCount ? t('create.artifact.validationPassedWithWarnings') : t('create.artifact.validationPassed')
  }
  if (props.validationStatus === 'failed') return t('create.artifact.validationFailed')
  if (!props.validationRequired) return t('create.artifact.validationNotRequired')
  return t('create.artifact.validationIdle')
})

const validationSummary = computed(() => {
  if (props.validationResult?.passed && props.validationResult.llmStatus !== 'succeeded') {
    return t('create.artifact.unscoredSummary')
  }
  const score = props.validationResult?.llmAnalysis?.score
  if (typeof score === 'number' && score < skillPublishMinimum(props.validationResult)) {
    return t('create.artifact.lowScoreSummary')
  }
  if (props.validationResult?.summary) return props.validationResult.summary
  if (!props.validationRequired) {
    return t('create.artifact.editExistingSummary')
  }
  return t('create.artifact.defaultValidationSummary')
})

const validationTone = computed(() => {
  if (props.validationStatus === 'passed') {
    return props.validationResult?.llmStatus === 'succeeded' && (props.validationResult.llmAnalysis?.score ?? -1) >= skillPublishMinimum(props.validationResult) && props.validationResult.metadataStatus === 'succeeded' && !props.validationResult.warningCount ? 'pass' : 'warning'
  }
  if (props.validationStatus === 'failed') return 'fail'
  if (props.validationStatus === 'running') return 'run'
  return 'idle'
})

const llmStatusMessage = computed(() => {
  const result = props.validationResult
  if (result?.llmSkipReason === 'static_failed') return t('create.artifact.scoringSkippedStatic')
  if (result?.llmSkipReason === 'no_model') return t('create.artifact.scoringSkippedNoModel')
  return ''
})

const hasCompletedReview = computed(() => {
  const result = props.validationResult
  return result?.passed && result.llmStatus === 'succeeded'
    && result.llmModel?.userModelId === props.validationUserModelId
    && result.validationToken && result.artifactSha256
})

const severityGroups = computed<Array<{ key: SkillValidationIssue['severity']; label: string }>>(() => [
  { key: 'fatal', label: t('create.artifact.fatalIssues') },
  { key: 'warning', label: t('create.artifact.warning') },
  { key: 'info', label: t('create.artifact.suggestion') },
])

const visibleIssues = computed(() => (props.validationResult?.issues || []).filter(issue =>
  issue.code !== 'llm_suggestions' || !props.validationResult?.llmAnalysis?.suggestions?.length))

function issuesBySeverity(severity: SkillValidationIssue['severity']) {
  return visibleIssues.value.filter((item) => item.severity === severity)
}
</script>

<template>
  <div class="card">
    <header class="hd">
      <h2 class="hd__title">{{ t('create.artifact.uploadSkill') }}</h2>
    </header>

    <div class="skill-file-wrap">
      <label class="label">{{ t('create.artifact.skillFile') }}</label>

      <div
        class="drop-zone"
        :class="{
          'drop-zone--drag': isDragging,
          'drop-zone--disabled': fileLocked && !canDownloadServerFile,
          'drop-zone--downloadable': canDownloadServerFile,
          'drop-zone--has-file': !!modelValue.skillFile || (!!serverFileName && !modelValue.skillFile),
        }"
        :role="canDownloadServerFile ? 'button' : undefined"
        :tabindex="canDownloadServerFile ? 0 : undefined"
        :aria-label="canDownloadServerFile ? t('create.artifact.downloadSkillFile') : undefined"
        :title="canDownloadServerFile ? t('create.artifact.clickToDownloadSkillFile') : undefined"
        @click="handleSkillFileAreaDownload"
        @keydown.enter.prevent="handleSkillFileAreaDownload"
        @keydown.space.prevent="handleSkillFileAreaDownload"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <input
          :id="readonly ? undefined : 'skill-file-input'"
          ref="fileInputRef"
          type="file"
          class="visually-hidden"
          :disabled="fileLocked"
          @change="onSkillFileChange"
        />

        <div class="drop-zone__body">
          <div class="drop-zone__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 5v10m0 0l3.5-3.5M12 15L8.5 11.5M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3"
                stroke="currentColor"
                stroke-width="1.65"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <template v-if="!modelValue.skillFile && serverFileName">
            <p class="server-picked">
              <span class="server-picked__muted">{{ t('create.common.uploaded') }}</span>
              <span class="picked-name">{{ serverFileName }}</span>
            </p>
            <p v-if="serverFileSizeBytes != null" class="picked-meta">{{ formatSize(serverFileSizeBytes) }}</p>
            <p v-if="!readonly" class="server-picked__hint">{{ t('create.artifact.chooseNewSkillFileToReplace') }}</p>
            <p v-if="!readonly" class="drop-zone__or">{{ t('create.common.or') }}</p>
            <label v-if="!readonly" for="skill-file-input" class="pick-btn">{{ t('create.artifact.chooseSkillFile') }}</label>
          </template>
          <template v-else-if="!modelValue.skillFile">
            <p class="drop-zone__title">{{ t('create.artifact.dragSkillFileHere') }}</p>
            <p class="drop-zone__or">{{ t('create.common.or') }}</p>
            <label v-if="!readonly" for="skill-file-input" class="pick-btn">{{ t('create.artifact.chooseSkillFile') }}</label>
            <p v-else class="drop-zone__readonly">{{ t('create.common.readOnlyCannotSelect') }}</p>
          </template>
          <template v-else>
            <p class="picked-name">{{ modelValue.skillFile.name }}</p>
            <p class="picked-meta">{{ formatSize(modelValue.skillFile.size) }}</p>
          </template>
        </div>
      </div>

      <div v-if="modelValue.skillFile && !readonly" class="skill-file-actions">
        <button type="button" class="btn-clear" :disabled="fileLocked" @click="clearSkillFile">{{ t('create.common.reselect') }}</button>
      </div>

      <section v-if="!readonly" class="validation-box" :class="`validation-box--${validationTone}`">
        <div class="scoring-model">
          <AgentModelSelector
            :model-value="validationUserModelId"
            :options="modelOptions"
            :loading="modelsLoading"
            :error="modelsError"
            :previous-model="hasCompletedReview ? validationResult?.llmModel?.displayName : undefined"
            :unavailable-hint="hasCompletedReview ? t('create.artifact.completedScoreModelUnavailable') : undefined"
            :label="t('create.artifact.scoringModel')"
            :placeholder="t('create.artifact.staticOnlyOption')"
            :required="false"
            :clearable="true"
            :disabled="fileLocked"
            @update:model-value="emit('update:validationUserModelId', $event)"
            @refresh="emit('refresh-models')"
          />
          <p class="hint">{{ validationUserModelId ? t('create.artifact.scoringCost') : t('create.artifact.staticOnlyHint') }}</p>
        </div>
        <div class="validation-head">
          <div>
            <p class="validation-title">{{ validationTitle }}</p>
            <p class="validation-summary">{{ validationSummary }}</p>
          </div>
          <button
            type="button"
            class="validation-btn"
            :disabled="!canValidate"
            @click="emit('validate')"
          >
            {{ validationStatus === 'running' ? t('create.artifact.testing') : t('create.artifact.testSkillSpec') }}
          </button>
        </div>

        <div v-if="validationResult" class="validation-stats">
          <span class="stat" :class="{ 'stat--fatal': validationResult.fatalCount }">{{ t('create.artifact.fatal') }} {{ validationResult.fatalCount || 0 }}</span>
          <span class="stat" :class="{ 'stat--warning': validationResult.warningCount }">{{ t('create.artifact.warning') }} {{ validationResult.warningCount || 0 }}</span>
          <span v-if="issuesBySeverity('info').length" class="stat stat--info">{{ t('create.artifact.suggestion') }} {{ issuesBySeverity('info').length }}</span>
        </div>

        <details v-if="visibleIssues.length" class="validation-checks" :open="!!validationResult?.fatalCount">
          <summary>{{ t('create.report.checkDetails') }}<span class="check-count">{{ visibleIssues.length }}</span><span class="check-chevron" aria-hidden="true" /></summary>
          <div class="issue-groups">
            <div v-for="group in severityGroups" :key="group.key">
              <div v-if="issuesBySeverity(group.key).length" class="issue-group">
                <p class="issue-group__title">{{ group.label }}</p>
                <article
                  v-for="issue in issuesBySeverity(group.key)"
                  :key="`${issue.severity}-${issue.code}-${issue.path || ''}`"
                  class="issue-item"
                >
                  <div class="issue-item__main">
                    <strong>{{ issue.title }}</strong>
                    <span v-if="issue.path" class="issue-path">{{ issue.path }}{{ issue.line ? `:${issue.line}` : '' }}</span>
                  </div>
                  <p>{{ issue.message }}</p>
                  <p v-if="issue.suggestion" class="issue-suggestion">{{ issue.suggestion }}</p>
                </article>
              </div>
            </div>
          </div>
        </details>

        <p v-if="llmStatusMessage" class="scoring-status" role="status">{{ llmStatusMessage }}</p>
      </section>
      <SkillValidationReport
        v-if="!readonly && freshReport"
        :report="freshReport"
        :title="t('create.report.currentTitle')"
        :show-issues="false"
        embedded
      />
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 18px 20px 20px;
}
.hd {
  margin: 0 0 14px;
}
.hd__title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}
.label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}
.skill-file-wrap {
  margin-top: 0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.drop-zone {
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  background: #f3f4f6;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}
.drop-zone:not(.drop-zone--disabled):hover {
  border-color: #9ca3af;
  background: #e5e7eb;
}
.drop-zone--drag {
  border-color: #6b7280;
  border-style: dashed;
  background: #e5e7eb;
  box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.06);
}
.drop-zone--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.drop-zone--downloadable {
  cursor: pointer;
}
.drop-zone--downloadable:hover {
  border-color: #9ca3af;
  background: #eef2f7;
}
.drop-zone--has-file {
  border-style: solid;
  border-color: #d1d5db;
  background: #f9fafb;
}

.drop-zone__body {
  padding: 20px 16px;
  text-align: center;
}

.drop-zone__icon {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  color: #94a3b8;
}
.drop-zone__icon svg {
  width: 36px;
  height: 36px;
}

.drop-zone__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}
.drop-zone__or {
  margin: 6px 0 10px;
  font-size: 12px;
  color: #9ca3af;
}

.pick-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}
.pick-btn:hover {
  background: #020617;
  border-color: #020617;
}

.drop-zone__readonly {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}

.picked-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  word-break: break-all;
}
.picked-meta {
  margin: 6px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.server-picked {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
}
.server-picked__muted {
  font-size: 13px;
  color: #9ca3af;
}
.server-picked__hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.skill-file-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.btn-clear {
  border: none;
  background: none;
  padding: 4px 0;
  font-size: 13px;
  font-weight: 500;
  color: #2563eb;
  cursor: pointer;
  font-family: inherit;
}
.btn-clear:hover {
  color: #1d4ed8;
  text-decoration: underline;
}
.btn-clear:disabled { opacity: 0.5; cursor: not-allowed; }
.scoring-model { margin-bottom: 18px; }

.hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}

.validation-box {
  --status-color: #94a3b8;
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.validation-box--pass { --status-color: #16a34a; }
.validation-box--warning { --status-color: #d97706; }
.validation-box--fail { --status-color: #dc2626; }
.validation-box--run { --status-color: #2563eb; }
.validation-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-top: 18px;
  border-top: 1px solid #e5e7eb;
}
.validation-title {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  color: #111827;
}
.validation-title::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--status-color);
  vertical-align: 1px;
}
.validation-summary {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #6b7280;
}
.validation-btn {
  flex-shrink: 0;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.validation-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.validation-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.stat {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: #edf1f5;
  color: #64748b;
}
.stat--fatal { background: rgba(220, 38, 38, 0.1); color: #b91c1c; }
.stat--warning { background: rgba(217, 119, 6, 0.12); color: #b45309; }
.stat--info { background: rgba(37, 99, 235, 0.1); color: #1d4ed8; }
.validation-checks { margin-top: 16px; border-top: 1px solid #e5e7eb; }
.validation-checks summary { display: flex; align-items: center; gap: 8px; padding-top: 16px; list-style: none; cursor: pointer; color: #475569; font-size: 13px; font-weight: 500; }
.validation-checks summary::-webkit-details-marker { display: none; }
.validation-checks summary:focus-visible { outline: 2px solid #94a3b8; outline-offset: 4px; border-radius: 4px; }
.check-count { padding: 2px 6px; border-radius: 5px; background: #edf1f5; color: #718096; font-size: 11px; }
.check-chevron { width: 6px; height: 6px; border-right: 1.5px solid #8490a2; border-bottom: 1.5px solid #8490a2; transform: rotate(45deg); margin: -3px 3px 0 auto; flex-shrink: 0; }
.validation-checks[open] .check-chevron { transform: rotate(225deg); margin-top: 3px; }
.scoring-status { margin: 14px 0 0; color: #64748b; font-size: 13px; line-height: 1.7; }
.issue-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}
.issue-group__title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 650;
  color: #374151;
}
.issue-item {
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 8px;
  background: #fff;
}
.issue-item + .issue-item {
  margin-top: 6px;
}
.issue-item__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: #111827;
}
.issue-item p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #4b5563;
  overflow-wrap: anywhere;
}
.issue-path {
  flex-shrink: 0;
  max-width: 48%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #6b7280;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.issue-item .issue-suggestion {
  color: #64748b;
}
@media (max-width: 768px) {
  .validation-box { padding: 16px; }
  .validation-head {
    flex-direction: column;
  }
  .validation-btn {
    width: 100%;
  }
  .issue-item__main {
    align-items: flex-start;
    flex-direction: column;
  }
  .issue-path {
    max-width: 100%;
  }
}
</style>
