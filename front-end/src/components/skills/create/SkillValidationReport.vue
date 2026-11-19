<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SkillValidationReport } from '@/api/skill'
import { llmErrorMessage } from '@/api/llm'

const props = defineProps<{ report?: SkillValidationReport | null; title: string; fileChanged?: boolean; showIssues?: boolean; embedded?: boolean }>()
const { t, locale } = useI18n()
const date = computed(() => {
  const raw = props.report?.validatedAt
  if (!raw) return ''
  const value = new Date(raw)
  return Number.isNaN(value.getTime()) ? '' : value.toLocaleString(locale.value)
})
const metadataError = computed(() => props.report?.metadataErrorCode === 'llm_metadata_invalid_json'
  ? t('create.report.metadataInvalid') : llmErrorMessage(props.report?.metadataErrorCode || undefined))
const issues = computed(() => (props.report?.issues || []).filter(issue =>
  issue.code !== 'llm_suggestions' || !props.report?.llmAnalysis?.suggestions?.length))
const coverageCounts = computed(() => {
  const files = props.report?.reviewCoverage?.files || []
  return (['full', 'partial', 'unread'] as const)
    .map(status => ({ status, count: files.filter(file => file.status === status).length }))
    .filter(item => item.count > 0)
})
</script>

<template>
  <section class="assessment" :class="{ 'assessment--embedded': embedded }" data-testid="skill-assessment">
    <header class="assessment-header">
      <div class="assessment-heading">
        <h3>{{ title }}</h3>
        <p v-if="date || report?.modelName" class="report-source">
          <span v-if="date">{{ date }}</span><span v-if="report?.modelName">{{ report.modelName }}</span>
        </p>
      </div>
      <div v-if="report?.llmStatus === 'succeeded' && report.llmAnalysis?.score != null" class="score-panel">
        <span class="score-label">{{ t('create.report.scoreLabel') }}</span>
        <strong class="llm-score">{{ report.llmAnalysis.score }} <small>/ 100</small></strong>
      </div>
    </header>
    <p v-if="!report" class="muted">{{ t('create.report.empty') }}</p>
    <template v-else>
      <p v-if="fileChanged || report.matchesCurrentArtifact === false" class="notice">{{ t('create.report.fileChanged') }}</p>
      <dl v-if="report.metadataStatus === 'succeeded'" class="metadata">
        <div class="metadata-name"><dt>{{ t('create.report.aiName') }}</dt><dd>{{ report.generatedName }}</dd></div>
        <div class="metadata-description"><dt>{{ t('create.report.aiDescription') }}</dt><dd>{{ report.generatedDescription }}</dd></div>
      </dl>
      <p v-else class="notice" role="status">
        {{ t('create.report.noVector') }}
        <span v-if="report.metadataStatus === 'failed'">{{ metadataError }}</span>
      </p>
      <template v-if="report.llmStatus === 'succeeded' && report.llmAnalysis">
        <div v-if="report.llmAnalysis.summary" class="review-overview">
          <h4>{{ t('create.report.overview') }}</h4>
          <p>{{ report.llmAnalysis.summary }}</p>
        </div>
        <p v-if="report.reviewRulesVersion !== 'skill-review-v2'" class="muted">{{ t('skillReview.legacy') }}</p>
        <div v-else-if="report.llmAnalysis.dimensions?.length" class="dimension-list">
          <h4>{{ t('skillReview.dimensions') }}</h4>
          <details v-for="dimension in report.llmAnalysis.dimensions" :key="dimension.id" class="dimension-row">
            <summary class="dimension-summary">
              <span class="dimension-title">{{ t(`skillReview.${dimension.id}`) }}</span>
              <span class="dimension-score"><strong>{{ dimension.score }}</strong><span>/ {{ dimension.maxScore }}</span></span>
              <span class="disclosure-chevron" aria-hidden="true" />
            </summary>
            <div class="dimension-content">
              <p class="dimension-explanation">{{ dimension.explanation }}</p>
              <div v-if="dimension.deductions.length" class="deductions">
                <h5>{{ t('skillReview.deductions') }}</h5>
                <ul><li v-for="deduction in dimension.deductions" :key="deduction">{{ deduction }}</li></ul>
              </div>
              <details v-if="dimension.evidence.length" class="evidence-disclosure">
                <summary>{{ t('skillReview.evidence') }}<span class="reference-count">({{ dimension.evidence.length }})</span><span class="disclosure-chevron" aria-hidden="true" /></summary>
                <ul class="evidence-list">
                  <li v-for="(evidence, index) in dimension.evidence" :key="index">
                    <code>{{ evidence.path }}</code>
                    <span class="line-range">{{ t('skillReview.lines', { start: evidence.startLine, end: evidence.endLine }) }}</span>
                  </li>
                </ul>
              </details>
            </div>
          </details>
        </div>
        <details v-if="report.llmAnalysis.descriptionFeedback || report.llmAnalysis.skillMdFeedback" class="report-disclosure">
          <summary>{{ t('create.report.feedbackTitle') }}<span class="disclosure-chevron" aria-hidden="true" /></summary>
          <div class="feedback-grid">
            <section v-if="report.llmAnalysis.descriptionFeedback" class="feedback-block">
              <h4>{{ t('create.report.descriptionFeedback') }}</h4>
              <p>{{ report.llmAnalysis.descriptionFeedback }}</p>
            </section>
            <section v-if="report.llmAnalysis.skillMdFeedback" class="feedback-block">
              <h4>{{ t('create.report.bodyFeedback') }}</h4>
              <p>{{ report.llmAnalysis.skillMdFeedback }}</p>
            </section>
          </div>
        </details>
        <details v-if="report.llmAnalysis.suggestions?.length" class="report-disclosure">
          <summary>{{ t('create.report.suggestions') }}<span class="item-count">{{ report.llmAnalysis.suggestions.length }}</span><span class="disclosure-chevron" aria-hidden="true" /></summary>
          <ol class="suggestion-list"><li v-for="(suggestion, index) in report.llmAnalysis.suggestions" :key="index">
            <span class="suggestion-number" aria-hidden="true">{{ index + 1 }}</span><p>{{ suggestion }}</p>
          </li></ol>
        </details>
      </template>
      <p v-else-if="report.llmStatus === 'failed'" class="notice">{{ llmErrorMessage(report.llmErrorCode || undefined) }}</p>
      <details v-if="report.reviewCoverage" class="report-disclosure coverage-disclosure">
        <summary>
          <span>{{ t('skillReview.coverage') }}</span>
          <span class="coverage-counts">
            <span v-for="item in coverageCounts" :key="item.status" class="coverage-count">{{ t(`skillReview.${item.status}`) }} {{ item.count }}</span>
          </span>
          <span class="disclosure-chevron" aria-hidden="true" />
        </summary>
        <p class="coverage-note">{{ t(report.reviewCoverage.complete ? 'skillReview.complete' : 'skillReview.incomplete') }}</p>
        <div v-if="report.reviewCoverage.files.length" class="coverage-table-wrap">
          <table class="coverage-table">
            <caption class="sr-only">{{ t('skillReview.coverage') }}</caption>
            <thead><tr><th scope="col">{{ t('skillReview.file') }}</th><th scope="col">{{ t('skillReview.readStatus') }}</th><th scope="col">{{ t('skillReview.readRanges') }}</th></tr></thead>
            <tbody>
              <tr v-for="file in report.reviewCoverage.files" :key="file.path">
                <td class="coverage-file"><code>{{ file.path }}</code></td>
                <td class="coverage-state">
                  <span class="read-status" :class="`read-status--${file.status}`">{{ t(`skillReview.${file.status}`) }}</span>
                  <p v-if="file.reason" class="coverage-reason">{{ t(`skillReview.${file.reason}`) }}</p>
                </td>
                <td class="coverage-ranges">
                  <span v-for="(range, index) in file.readRanges" :key="index" class="line-range">{{ t('skillReview.lines', { start: range.startLine, end: range.endLine }) }}</span>
                  <span v-if="!file.readRanges.length" class="range-empty" :aria-label="t('skillReview.noReadRanges')">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted">{{ t('skillReview.noFiles') }}</p>
      </details>
      <details v-if="showIssues !== false && issues.length" class="report-disclosure">
        <summary>{{ t('create.report.checkDetails') }}<span class="item-count">{{ issues.length }}</span><span class="disclosure-chevron" aria-hidden="true" /></summary>
        <ul class="check-list"><li v-for="(issue, index) in issues" :key="index">
          <h4>{{ issue.title }}</h4><p>{{ issue.message }}</p><p v-if="issue.suggestion">{{ issue.suggestion }}</p>
        </li></ul>
      </details>
    </template>
  </section>
</template>

<style scoped>
.assessment { min-width: 0; padding: 26px 28px 12px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; color: #475569; overflow-wrap: anywhere; }
.assessment--embedded { margin-top: 24px; padding: 24px 0 0; border: 0; border-top: 1px solid #e5e7eb; border-radius: 0; }
.assessment-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
.assessment-heading { min-width: 0; }
h3 { margin: 0; font-size: 17px; font-weight: 600; color: #172033; }
.report-source { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 9px 0 0; color: #8490a2; font-size: 12px; line-height: 1.6; }
.score-panel { flex-shrink: 0; padding: 10px 16px; border-radius: 10px; background: #f6f8fb; text-align: right; }
.score-label { display: block; color: #718096; font-size: 11px; margin-bottom: 2px; }
.llm-score { font-size: 30px; line-height: 1.2; font-weight: 650; color: #172033; font-variant-numeric: tabular-nums; }
.llm-score small { color: #94a3b8; font-size: 12px; font-weight: 400; }
.metadata { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2.7fr); gap: 24px; margin: 0 0 22px; padding: 22px 0; border-top: 1px solid #edf0f4; border-bottom: 1px solid #edf0f4; }
.metadata-description { border-left: 1px solid #edf0f4; padding-left: 24px; }
dt { color: #8490a2; font-size: 12px; margin-bottom: 8px; }
dd { margin: 0; line-height: 1.85; white-space: pre-line; font-size: 14px; }
.metadata-name dd { color: #172033; font-size: 17px; font-weight: 550; line-height: 1.65; }
h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #334155; }
p { margin: 0; line-height: 1.85; font-size: 14px; white-space: pre-line; }
.review-overview { padding-bottom: 22px; }
.report-disclosure { border-top: 1px solid #edf0f4; }
summary { display: flex; align-items: center; gap: 9px; padding: 17px 0; color: #334155; font-size: 13px; font-weight: 550; cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary:hover { color: #0f172a; }
summary:focus-visible { outline: 2px solid #94a3b8; outline-offset: 3px; border-radius: 4px; }
.disclosure-chevron { width: 6px; height: 6px; border-right: 1.5px solid #8490a2; border-bottom: 1.5px solid #8490a2; transform: rotate(45deg); margin: -3px 3px 0 auto; flex-shrink: 0; }
details[open] > summary .disclosure-chevron { transform: rotate(225deg); margin-top: 3px; }
.item-count { display: inline-flex; align-items: center; justify-content: center; min-width: 21px; padding: 2px 5px; border-radius: 5px; background: #f1f5f9; color: #718096; font-size: 11px; font-variant-numeric: tabular-nums; }
.feedback-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding-bottom: 20px; }
.feedback-block { padding: 18px; background: #f8fafc; border-radius: 8px; }
.feedback-block p { font-size: 13px; }
.suggestion-list, .check-list { margin: 0; padding: 0 0 16px; list-style: none; }
.suggestion-list li { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; }
.suggestion-list li + li { border-top: 1px solid #f1f5f9; }
.suggestion-number { display: inline-flex; justify-content: center; align-items: center; flex: 0 0 22px; height: 22px; margin-top: 2px; border-radius: 6px; background: #f1f5f9; color: #64748b; font-size: 11px; font-variant-numeric: tabular-nums; }
.suggestion-list p { min-width: 0; font-size: 13px; }
.check-list li { padding: 14px 0; }
.check-list p { font-size: 13px; }
.muted { color: #8490a2; font-size: 13px; margin-bottom: 14px; }
.notice { margin: 0 0 20px; padding: 12px 14px; border-radius: 8px; background: #fffbeb; font-size: 13px; line-height: 1.7; color: #92400e; }
@media (max-width: 640px) {
  .assessment { padding: 20px 18px 8px; }
  .assessment--embedded { padding: 20px 0 0; }
  .assessment-header { gap: 12px; margin-bottom: 18px; }
  h3 { font-size: 16px; }
  .score-panel { padding: 9px 11px; }
  .llm-score { font-size: 26px; }
  .metadata { grid-template-columns: minmax(0, 1fr); gap: 18px; padding: 18px 0; }
  .metadata-description { padding-left: 0; border-left: 0; }
  .feedback-grid { grid-template-columns: minmax(0, 1fr); }
}

/* New review sections follow the existing report's typography and dividers. */
.assessment code { font-family: 'Cascadia Code', Consolas, 'SFMono-Regular', Menlo, monospace; font-size: 13px; line-height: 1.65; color: #64748b; }
.dimension-list { margin-bottom: 22px; }
.dimension-list > h4 { margin-bottom: 4px; }
.dimension-row { min-width: 0; }
.dimension-row + .dimension-row { border-top: 1px solid #f1f5f9; }
.dimension-summary { display: grid; grid-template-columns: minmax(0, 1fr) auto 8px; gap: 14px; padding: 14px 0; }
.dimension-title { font-size: 13px; font-weight: 500; line-height: 1.7; }
.dimension-score { display: inline-flex; align-items: baseline; justify-content: flex-end; gap: 5px; min-width: 62px; white-space: nowrap; color: #8490a2; font-size: 12px; font-weight: 400; font-variant-numeric: tabular-nums; }
.dimension-score strong { font-size: 13px; font-weight: 600; color: #475569; }
.dimension-content { padding: 0 0 18px; }
.dimension-explanation { font-size: 14px; }
.deductions { margin-top: 12px; }
.deductions h5 { margin: 0 0 6px; color: #718096; font-size: 12px; font-weight: 500; }
.deductions ul { margin: 0; padding-left: 18px; list-style: disc; }
.deductions li { padding-left: 3px; font-size: 13px; line-height: 1.85; }
.deductions li + li { margin-top: 5px; }
.deductions li::marker { color: #94a3b8; }
.evidence-disclosure { margin-top: 12px; }
.evidence-disclosure > summary { width: fit-content; max-width: 100%; padding: 4px 0; gap: 6px; font-size: 12px; font-weight: 400; color: #718096; }
.evidence-disclosure > summary:hover { color: #475569; }
.reference-count { font-variant-numeric: tabular-nums; }
.evidence-disclosure .disclosure-chevron { margin-left: 3px; }
.evidence-list { display: grid; gap: 0; max-width: 800px; margin: 8px 0 0; padding: 0; list-style: none; }
.evidence-list li { display: flex; align-items: baseline; justify-content: space-between; gap: 8px 20px; padding: 5px 0; }
.evidence-list code { min-width: 0; overflow-wrap: anywhere; }
.line-range { display: inline-block; white-space: nowrap; color: #8490a2; font-size: 12px; font-weight: 400; font-variant-numeric: tabular-nums; }
.coverage-disclosure > summary { flex-wrap: wrap; }
.coverage-counts { display: inline-flex; flex-wrap: wrap; gap: 6px 12px; margin-left: 6px; }
.coverage-count { color: #8490a2; font-size: 12px; font-weight: 400; white-space: nowrap; }
.coverage-note { margin-bottom: 12px; color: #718096; font-size: 13px; }
.coverage-table-wrap { margin-bottom: 20px; border-top: 1px solid #edf0f4; border-bottom: 1px solid #edf0f4; }
.coverage-table { width: 100%; border-collapse: collapse; table-layout: fixed; text-align: left; }
.coverage-table th { padding: 10px 12px; background: #f8fafc; color: #718096; font-size: 12px; font-weight: 500; }
.coverage-table th:first-child { width: 50%; }
.coverage-table th:nth-child(2) { width: 30%; }
.coverage-table th:last-child { width: 20%; }
.coverage-table td { padding: 12px; border-top: 1px solid #edf0f4; vertical-align: top; }
.coverage-file code { overflow-wrap: anywhere; }
.read-status { color: #64748b; font-size: 12px; line-height: 1.7; white-space: nowrap; }
.coverage-reason { margin-top: 5px; font-size: 12px; line-height: 1.6; color: #8490a2; }
.coverage-ranges .line-range { display: block; margin: 2px 0; }
.range-empty { color: #94a3b8; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (max-width: 640px) {
  .dimension-summary { gap: 10px; }
  .evidence-list li { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1px; padding: 6px 0; }
  .coverage-counts { order: 2; flex-basis: 100%; margin: 0; }
  .coverage-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .coverage-table tbody { display: block; }
  .coverage-table tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; padding: 14px; }
  .coverage-table tr + tr { border-top: 1px solid #edf0f4; }
  .coverage-table td { padding: 0; border: 0; }
  .coverage-file { grid-column: 1 / -1; }
  .coverage-ranges { text-align: right; }
}
</style>
