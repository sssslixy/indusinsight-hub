<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElAlert } from 'element-plus'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import SubmissionDateFilter from '@/components/evaluation/SubmissionDateFilter.vue'
import { readDateRange } from './dateRange'
import {
  downloadEvaluationDataset,
  getEvaluationCases,
  getEvaluationBoard,
  submitEvaluation,
} from '@/api/evaluation'
import type { CaseId, EvaluationCase, EvaluationBoard } from '@/api/evaluation'

defineOptions({ name: 'EvaluationLeaderboard' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const caseIds: CaseId[] = ['case1', 'case2', 'case3']
const activeId = computed<CaseId>(() =>
  caseIds.includes(route.query.case as CaseId) ? (route.query.case as CaseId) : 'case1',
)
const dateFilter = computed(() => readDateRange(route.query.startDate, route.query.endDate))
const dateRange = computed(() => dateFilter.value.range)
const pickerValue = computed<[string, string] | null>(() =>
  dateRange.value ? [dateRange.value.startDate, dateRange.value.endDate] : null,
)
const boardKey = computed(
  () => `${activeId.value}:${dateRange.value?.startDate ?? ''}:${dateRange.value?.endDate ?? ''}`,
)
const cases = ref<EvaluationCase[]>([])
const activeCase = computed(() => cases.value.find((item) => item.id === activeId.value))
const board = ref<EvaluationBoard | null>(null)
// Keep each case visible on return while its latest results load in the background.
// Component-local caching prevents results leaking between login sessions.
const boardCache = new Map<string, EvaluationBoard>()
const submissionCounts = ref<Partial<Record<CaseId, number>>>({})
const mySubmissionCount = computed(() => submissionCounts.value[activeId.value] ?? 0)
const boardScroll = ref<HTMLElement | null>(null)
const detailsScroll = ref<HTMLElement | null>(null)
const loading = ref(false)
const submitting = ref(false)
const downloading = ref(false)
const downloadError = ref('')
let downloadRequest: AbortController | null = null
const error = ref('')
const boardError = ref('')
const notice = ref('')
const file = ref<File | null>(null)
const input = ref<HTMLInputElement | null>(null)
const requestId = ref('')
let generation = 0
let loadSequence = 0
const limited = computed(
  () =>
    !!activeCase.value?.maxSubmissions &&
    mySubmissionCount.value >= activeCase.value.maxSubmissions,
)
const canSubmit = computed(
  () =>
    !!activeCase.value?.canSubmit &&
    !!file.value &&
    !submitting.value &&
    !limited.value &&
    (!activeCase.value.maxSubmissions || submissionCounts.value[activeId.value] !== undefined),
)
const fixed = (value: number) => value.toFixed(4)
const full = (value: number) => String(value)
const date = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value))
const message = (e: unknown) => (e instanceof Error ? e.message : t('evaluation.failed'))

// crypto.randomUUID is unavailable on some classroom HTTP/LAN origins.
function newRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 15) | 64
  bytes[8] = ((bytes[8] ?? 0) & 63) | 128
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
function selectFile(event: Event) {
  file.value = null
  requestId.value = ''
  error.value = ''
  notice.value = ''
  const selected = (event.target as HTMLInputElement).files?.[0]
  if (!selected) return
  if (
    !selected.name.toLowerCase().endsWith('.csv') ||
    selected.size === 0 ||
    selected.size > 2 * 1024 * 1024
  ) {
    error.value = t('evaluation.invalidFile')
    if (input.value) input.value.value = ''
    return
  }
  file.value = selected
  requestId.value = newRequestId()
}
async function refresh(includeCases = true) {
  const scope = generation,
    seq = ++loadSequence,
    id = activeId.value,
    key = boardKey.value,
    range = dateRange.value
  loading.value = true
  boardError.value = ''
  const [configuration, ranking] = await Promise.allSettled([
    includeCases ? getEvaluationCases() : Promise.resolve(null),
    !dateFilter.value.valid
      ? Promise.resolve(null)
      : range
        ? getEvaluationBoard(id, range)
        : getEvaluationBoard(id),
  ])
  if (scope !== generation || seq !== loadSequence) return
  if (configuration.status === 'fulfilled') {
    if (configuration.value) cases.value = configuration.value.data
  } else {
    boardError.value = message(configuration.reason)
  }
  if (ranking.status === 'fulfilled') {
    if (ranking.value) {
      boardCache.delete(key)
      boardCache.set(key, ranking.value.data)
      if (boardCache.size > 24) boardCache.delete(boardCache.keys().next().value!)
      board.value = ranking.value.data
      submissionCounts.value[id] =
        ranking.value.data.mySubmissionCount ?? ranking.value.data.mine?.submissionCount ?? 0
    }
  } else boardError.value = message(ranking.reason)
  loading.value = false
}
async function upload() {
  if (!canSubmit.value || !file.value) return
  const scope = generation,
    id = activeId.value,
    selected = file.value
  submitting.value = true
  error.value = ''
  notice.value = ''
  try {
    const result = await submitEvaluation(id, selected, requestId.value)
    for (const key of boardCache.keys()) if (key.startsWith(`${id}:`)) boardCache.delete(key)
    delete submissionCounts.value[id]
    if (scope !== generation) return
    notice.value = t('evaluation.success', { value: fixed(result.data.metricValue) })
    file.value = null
    requestId.value = ''
    if (input.value) input.value.value = ''
    await refresh()
  } catch (e) {
    if (scope !== generation) return
    error.value = message(e)
    const code = (e as { code?: number })?.code
    // A definite business rejection finishes this attempt; ambiguous network errors reuse its ID.
    if (code !== undefined && code >= 4200 && code <= 4206 && code !== 4203)
      requestId.value = newRequestId()
  } finally {
    if (scope === generation) submitting.value = false
  }
}
function cancelDownload() {
  downloadRequest?.abort()
  downloadRequest = null
  downloading.value = false
  downloadError.value = ''
}
async function downloadDataset() {
  if (downloading.value) return
  const id = activeId.value
  const controller = new AbortController()
  downloadRequest = controller
  downloading.value = true
  downloadError.value = ''
  try {
    const blob = await downloadEvaluationDataset(id, controller.signal)
    if (controller.signal.aborted || downloadRequest !== controller) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${id}.zip`
    document.body.append(link)
    try {
      link.click()
    } finally {
      link.remove()
      // Allow the browser to begin consuming the object URL before releasing it.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  } catch (e) {
    if (!controller.signal.aborted && downloadRequest === controller)
      downloadError.value = e instanceof Error ? e.message : t('evaluation.downloadFailed')
  } finally {
    if (downloadRequest === controller) {
      downloadRequest = null
      downloading.value = false
    }
  }
}
watch(
  [activeId, () => route.query.startDate, () => route.query.endDate],
  (_, previous) => {
    const caseChanged = activeId.value !== previous?.[0]
    if (caseChanged) {
      cancelDownload()
      generation++
      file.value = null
      requestId.value = ''
      if (detailsScroll.value) detailsScroll.value.scrollTop = 0
      notice.value = ''
      error.value = ''
      submitting.value = false
      if (input.value) input.value.value = ''
    }
    loadSequence++
    board.value = dateFilter.value.valid ? (boardCache.get(boardKey.value) ?? null) : null
    if (boardScroll.value) boardScroll.value.scrollTop = 0
    void refresh(caseChanged || !cases.value.length)
  },
  { immediate: true },
)
function changeDates(value: [string, string] | null) {
  const query = { ...route.query }
  delete query.startDate
  delete query.endDate
  if (value) [query.startDate, query.endDate] = value
  void router.push({ query })
}
function selectCase(id: CaseId) {
  void router.replace({ query: { ...route.query, case: id } })
}
onBeforeUnmount(() => {
  cancelDownload()
  generation++
  loadSequence++
})
</script>

<template>
  <div class="evaluation-page">
    <DashboardHeader />
    <main class="evaluation-main">
      <header class="heading">
        <div>
          <h1>{{ t('evaluation.title') }}</h1>
          <p>{{ t('evaluation.subtitle') }}</p>
        </div>
        <button
          type="button"
          class="button secondary refresh-button"
          :disabled="loading"
          @click="refresh()"
        >
          <svg
            :class="{ spinning: loading }"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.55-1L20 9M4 15l2.35 3A7 7 0 0 0 17.9 17"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ t('evaluation.refresh') }}
        </button>
      </header>
      <div class="evaluation-layout">
        <aside class="evaluation-sidebar">
          <nav class="case-tabs panel" :aria-label="t('evaluation.selectCase')">
            <button
              v-for="(id, index) in caseIds"
              :key="id"
              type="button"
              :class="{ active: id === activeId }"
              :aria-pressed="id === activeId"
              :title="t(`evaluation.${id}`)"
              @click="selectCase(id)"
            >
              <span class="case-number">0{{ index + 1 }}</span
              ><span class="case-tab-name">{{ t(`evaluation.${id}Tab`) }}</span>
            </button>
          </nav>
          <section class="panel case-details" :aria-label="t('evaluation.details')">
            <div
              ref="detailsScroll"
              class="details-scroll"
              tabindex="0"
              :aria-label="t('evaluation.details')"
            >
              <div class="detail-heading">
                <h2>{{ t('evaluation.details') }}</h2>
                <span class="case-label">Case {{ activeId.slice(-1) }}</span>
              </div>
              <div v-if="activeCase" class="metric-summary">
                <strong>{{ t(`evaluation.${activeCase.metric}`) }}</strong>
                <span>{{ t(`evaluation.${activeCase.direction}`) }}</span>
              </div>
              <div class="case-meta">
                <p v-if="activeCase">
                  {{ t('evaluation.samples', { count: activeCase.testRows }) }} ·
                  {{
                    activeCase.maxSubmissions
                      ? t('evaluation.limit', { count: activeCase.maxSubmissions })
                      : t('evaluation.unlimited')
                  }}
                </p>
                <p v-if="activeCase?.deadline">
                  {{ t('evaluation.deadline', { time: date(activeCase.deadline) }) }}
                </p>
              </div>
              <div class="format-details">
                <h3>{{ t('evaluation.submissionFormat') }}</h3>
                <p>{{ t('evaluation.format') }}</p>
                <p>{{ t(`evaluation.${activeId}Help`) }}</p>
              </div>
              <p class="replacement">{{ t('evaluation.replacement') }}</p>
              <el-alert
                v-if="activeCase && !activeCase.canSubmit"
                :title="activeCase.unavailableReason || t('evaluation.unavailable')"
                type="warning"
                :closable="false"
              />
              <el-alert
                v-if="limited"
                :title="t('evaluation.limitReached')"
                type="warning"
                :closable="false"
              />
            </div>
            <div class="upload-area">
              <input
                id="prediction-file"
                ref="input"
                hidden
                type="file"
                :aria-label="t('evaluation.file')"
                accept=".csv,text/csv"
                :disabled="submitting || !activeCase?.canSubmit || limited"
                @change="selectFile"
              />
              <button
                type="button"
                class="button secondary file-button"
                :disabled="submitting || !activeCase?.canSubmit || limited"
                @click="input?.click()"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 16V4m-4 4 4-4 4 4M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ t('evaluation.file') }}
              </button>
              <p class="selected-file" :title="file?.name" aria-live="polite">
                {{ file?.name || t('evaluation.noFile') }}
              </p>
              <button
                type="button"
                class="button primary submit-button"
                :disabled="!canSubmit"
                @click="upload"
              >
                <span v-if="submitting" class="spinner" aria-hidden="true" />{{
                  t(submitting ? 'evaluation.uploading' : 'evaluation.upload')
                }}
              </button>
              <p class="hint">{{ t('evaluation.retryHint') }}</p>
              <section class="dataset-download" :aria-label="t('evaluation.dataset')">
                <h3>{{ t('evaluation.dataset') }}</h3>
                <button
                  type="button"
                  class="button secondary dataset-button"
                  :disabled="downloading"
                  :aria-busy="downloading"
                  :aria-label="t('evaluation.downloadDataset', { file: `${activeId}.zip` })"
                  @click="downloadDataset"
                >
                  <span class="dataset-file">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 13h6M9 17h4"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    {{ activeId }}.zip
                  </span>
                  <span class="dataset-action" aria-live="polite">
                    <span v-if="downloading" class="spinner" aria-hidden="true" />
                    <svg
                      v-else
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 3v12m-4-4 4 4 4-4M5 16v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    {{ t(downloading ? 'evaluation.downloading' : 'evaluation.download') }}
                  </span>
                </button>
                <p v-if="downloadError" class="download-error" role="alert">{{ downloadError }}</p>
              </section>
            </div>
          </section>
        </aside>
        <section class="panel leaderboard-panel" :aria-label="t('evaluation.title')">
          <header class="board-heading">
            <div>
              <h2>{{ t(`evaluation.${activeId}`) }}</h2>
              <p>
                {{
                  t(dateRange ? 'evaluation.filteredUsers' : 'evaluation.totalUsers', {
                    count: board?.total || 0,
                  })
                }}
              </p>
            </div>
            <span v-if="activeCase" class="metric-label">{{
              t(`evaluation.${activeCase.metric}`)
            }}</span>
          </header>
          <SubmissionDateFilter
            :model-value="pickerValue"
            :invalid="!dateFilter.valid"
            @change="changeDates"
          />
          <div class="own-result" aria-live="polite">
            <h3>{{ t(dateRange ? 'evaluation.filteredMine' : 'evaluation.mine') }}</h3>
            <div v-if="board?.mine" class="own-values">
              <span
                >{{ t('evaluation.rank') }} <strong>{{ board.mine.rank }}</strong></span
              >
              <span :title="full(board.mine.metricValue)"
                >{{ t('evaluation.value') }}
                <strong>{{ fixed(board.mine.metricValue) }}</strong></span
              >
              <span
                >{{ t('evaluation.count') }} <strong>{{ board.mine.submissionCount }}</strong></span
              >
            </div>
            <p v-else>
              {{
                t(
                  !board && loading
                    ? 'evaluation.loading'
                    : dateRange && mySubmissionCount > 0
                      ? 'evaluation.mineOutsideDates'
                      : 'evaluation.notSubmitted',
                )
              }}
            </p>
          </div>
          <el-alert
            v-if="boardError"
            class="feedback"
            :title="boardError"
            type="error"
            :closable="false"
            role="alert"
          />
          <el-alert
            v-if="error"
            class="feedback"
            :title="error"
            type="error"
            :closable="false"
            role="alert"
          />
          <el-alert
            v-if="notice"
            class="feedback"
            :title="notice"
            type="success"
            :closable="false"
            role="status"
          />
          <div
            ref="boardScroll"
            class="board-scroll"
            :aria-busy="loading"
            :aria-label="t('evaluation.rankings')"
            role="region"
            tabindex="0"
          >
            <table>
              <colgroup>
                <col class="rank-column" />
                <col class="username-column" />
                <col class="metric-column" />
                <col class="count-column" />
                <col class="time-column" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">{{ t('evaluation.rank') }}</th>
                  <th scope="col">{{ t('evaluation.username') }}</th>
                  <th scope="col">{{ t('evaluation.value') }}</th>
                  <th scope="col">{{ t('evaluation.count') }}</th>
                  <th scope="col">{{ t('evaluation.time') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in board?.list || []"
                  :key="row.userId"
                  :class="{ 'my-row': row.currentUser }"
                >
                  <td class="rank-value">{{ row.rank }}</td>
                  <td class="username">{{ row.username }}</td>
                  <td class="metric-value" :title="full(row.metricValue)">
                    {{ fixed(row.metricValue) }}
                  </td>
                  <td>{{ row.submissionCount }}</td>
                  <td class="submission-time">{{ date(row.submittedAt) }}</td>
                </tr>
                <tr v-if="!board?.list.length">
                  <td colspan="5" class="empty-state">
                    {{
                      t(
                        !board && loading
                          ? 'evaluation.loading'
                          : !dateFilter.valid
                            ? 'evaluation.invalidDates'
                            : dateRange
                              ? 'evaluation.emptyDates'
                              : 'evaluation.empty',
                      )
                    }}
                    <button
                      v-if="dateRange && !loading"
                      type="button"
                      class="clear-dates"
                      @click="changeDates(null)"
                    >
                      {{ t('evaluation.clearDates') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.evaluation-page {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--app-color-bg-page);
  color: var(--app-color-text-primary);
}
.evaluation-main {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(var(--app-page-top-desktop) + 28px) 48px 28px;
}
.heading {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
h1 {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
h2 {
  font-size: 17px;
  font-weight: 600;
}
h3 {
  font-size: 13px;
  font-weight: 500;
}
p {
  color: var(--app-color-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}
.heading p {
  font-size: 14px;
  margin-top: 6px;
}
.evaluation-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
  flex: 1;
  min-height: 0;
}
.panel {
  background: #fff;
  border: 1px solid var(--app-color-border-soft);
  border-radius: var(--app-radius-lg);
}
.evaluation-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}
.case-tabs {
  padding: 8px;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}
.case-tabs button {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  min-height: 70px;
  padding: 8px 4px;
  border: 0;
  border-radius: var(--app-radius-md);
  background: transparent;
  color: #525252;
  text-align: center;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.5;
  transition:
    background 0.15s,
    color 0.15s;
}
.case-tabs button:hover {
  background: #f5f5f5;
}
.case-tabs button.active {
  color: #fff;
  background: var(--app-color-text-primary);
}
.case-number {
  font-size: 12px;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
}
.case-tab-name {
  white-space: nowrap;
}
.case-details {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.details-scroll {
  padding: 20px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.detail-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.case-label,
.metric-label {
  font-size: 12px;
  color: var(--app-color-text-secondary);
  border: 1px solid var(--app-color-border-soft);
  border-radius: 6px;
  padding: 3px 8px;
  white-space: nowrap;
}
.metric-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.metric-summary strong {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.metric-summary span {
  font-size: 12px;
  color: var(--app-color-text-secondary);
}
.case-meta p {
  font-size: 12px;
}
.format-details {
  margin: 18px 0 14px;
  padding-top: 16px;
  border-top: 1px solid var(--app-color-border-soft);
}
.format-details h3 {
  margin-bottom: 6px;
}
.format-details p + p {
  margin-top: 8px;
}
.replacement {
  padding: 10px 12px;
  background: var(--app-color-bg-page);
  border-radius: var(--app-radius-md);
  color: #525252;
  font-size: 12px;
}
.upload-area {
  padding: 16px 20px;
  border-top: 1px solid var(--app-color-border-soft);
  flex-shrink: 0;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 9px 16px;
  border: 1px solid var(--app-color-border-soft);
  border-radius: var(--app-radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.secondary {
  background: #fff;
  color: #525252;
}
.secondary:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #d4d4d4;
}
.primary {
  color: #fff;
  background: var(--app-color-text-primary);
}
.primary:hover:not(:disabled) {
  background: #333;
}
.file-button,
.submit-button {
  width: 100%;
}
.selected-file {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  padding: 7px 0 12px;
}
.hint {
  font-size: 11px;
  margin-top: 10px;
}
.dataset-download {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--app-color-border-soft);
}
.dataset-download h3 {
  margin-bottom: 8px;
}
.dataset-button {
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border-radius: 8px;
  justify-content: space-between;
  flex-wrap: wrap;
  text-align: left;
}
.dataset-button:focus-visible {
  outline: 2px solid var(--app-color-text-primary);
  outline-offset: 3px;
}
.dataset-file,
.dataset-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.dataset-action {
  margin-left: auto;
  gap: 6px;
}
.download-error {
  margin-top: 8px;
  color: var(--el-color-danger, #b91c1c);
  font-size: 12px;
}
.leaderboard-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.board-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 16px;
  flex-shrink: 0;
}
.board-heading p {
  margin-top: 4px;
  font-size: 12px;
}
.own-result {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  margin: 0 24px 20px;
  padding: 12px 16px;
  border: 1px solid var(--app-color-border-soft);
  border-radius: var(--app-radius-md);
  background: var(--app-color-bg-page);
  flex-shrink: 0;
}
.own-result h3 {
  color: var(--app-color-text-secondary);
}
.own-values {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--app-color-text-secondary);
}
.own-values strong {
  margin-left: 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--app-color-text-primary);
  font-variant-numeric: tabular-nums;
}
.feedback {
  width: auto;
  margin: 0 24px 12px;
  flex-shrink: 0;
}
.board-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-gutter: stable;
}
table {
  width: 100%;
  min-width: 800px;
  table-layout: fixed;
  border-spacing: 0;
  border-collapse: separate;
  text-align: left;
  font-size: 13px;
}
.rank-column {
  width: 10%;
}
.username-column {
  width: 30%;
}
.metric-column,
.count-column {
  width: 16%;
}
.time-column {
  width: 28%;
}
th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 14px 20px;
  background: #fafafa;
  color: var(--app-color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
  border-top: 1px solid var(--app-color-border-soft);
  border-bottom: 1px solid var(--app-color-border-soft);
}
td {
  padding: 18px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.045);
  font-variant-numeric: tabular-nums;
}
th:first-child,
td:first-child {
  padding-left: 24px;
}
th:nth-child(3),
td:nth-child(3),
th:nth-child(4),
td:nth-child(4) {
  text-align: center;
}
th:nth-child(5),
td:nth-child(5) {
  padding-right: 24px;
  text-align: right;
}
tbody tr:hover {
  background: #fafafa;
}
.my-row {
  background: #f5f5f5;
}
.my-row .username {
  font-weight: 600;
}
.rank-value,
.metric-value {
  font-weight: 500;
}
.username {
  overflow-wrap: anywhere;
  max-width: 240px;
}
.submission-time {
  color: var(--app-color-text-secondary);
  white-space: nowrap;
  font-size: 12px;
}
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--app-color-text-secondary);
}
.clear-dates {
  display: block;
  margin: 12px auto 0;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: #f5f5f5;
  color: #262626;
  cursor: pointer;
  font-size: 13px;
}
.clear-dates:focus-visible {
  outline: 2px solid #525252;
  outline-offset: 2px;
}
.spinner {
  width: 14px;
  height: 14px;
  border: 1.5px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
}
.spinner,
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1100px) {
  .evaluation-main {
    padding-left: 24px;
    padding-right: 24px;
  }
  .evaluation-layout {
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 16px;
  }
}
@media (max-width: 768px) {
  .dataset-button {
    min-height: 44px;
  }
  .evaluation-main {
    padding-top: calc(var(--app-page-top-mobile) + 20px);
    padding-bottom: 16px;
  }
}
@media (max-width: 640px) {
  .evaluation-page {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }
  .evaluation-main {
    height: auto;
    min-height: 100dvh;
  }
  .evaluation-main {
    padding-left: 16px;
    padding-right: 16px;
  }
  h1 {
    font-size: 23px;
  }
  .heading {
    margin-bottom: 16px;
  }
  .evaluation-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(220px, 42dvh) minmax(480px, auto);
    gap: 12px;
  }
  .evaluation-sidebar {
    flex-direction: row;
    gap: 10px;
  }
  .case-tabs {
    width: 132px;
    padding: 5px;
    align-content: start;
    grid-template-columns: 1fr;
  }
  .case-tabs button {
    font-size: 12px;
    padding: 10px 8px;
    gap: 6px;
    min-height: 0;
  }
  .case-number {
    display: none;
  }
  .case-details {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }
  .details-scroll {
    padding: 12px;
    overflow: visible;
    flex-shrink: 0;
  }
  .upload-area {
    padding: 12px;
  }
  .board-heading {
    padding: 14px 16px 10px;
  }
  .leaderboard-panel {
    min-height: 480px;
  }
  .board-scroll {
    min-height: 200px;
    max-height: 60dvh;
  }
  .own-result {
    margin: 0 16px 12px;
    padding: 8px 10px;
    gap: 6px;
  }
  .own-values {
    gap: 12px;
  }
  .feedback {
    margin-left: 16px;
    margin-right: 16px;
  }
}
@media (max-height: 760px) {
  .case-details {
    overflow-y: auto;
  }
  .details-scroll {
    overflow: visible;
    flex-shrink: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner,
  .spinning {
    animation: none;
  }
}
</style>
