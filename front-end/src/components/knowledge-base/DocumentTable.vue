<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { KbDocument, DocumentStatus } from '@/api/knowledgeDocument'

withDefaults(
  defineProps<{
    docs: KbDocument[]
    /** 正在提交启用/停用请求的文档 id，用于该行按钮 loading */
    toggleEnabledBusyId?: number | null
    /** 正在提交删除请求的文档 id（确认后请求进行中） */
    deleteBusyDocId?: number | null
  }>(),
  { toggleEnabledBusyId: null, deleteBusyDocId: null },
)

const emit = defineEmits<{
  'toggle-enabled': [doc: KbDocument]
  'delete': [doc: KbDocument]
}>()

const { t } = useI18n()

const statusLabelKeyMap: Record<DocumentStatus, string> = {
  pending: 'knowledgeBase.documents.status.pending',
  processing: 'knowledgeBase.documents.status.processing',
  success: 'knowledgeBase.documents.status.success',
  failed: 'knowledgeBase.documents.status.failed',
  disabled: 'knowledgeBase.documents.status.disabled',
}

const stageStatusTextKeyMap: Record<DocumentStatus, string> = {
  pending: 'knowledgeBase.documents.stageStatus.pending',
  processing: 'knowledgeBase.documents.stageStatus.processing',
  success: 'knowledgeBase.documents.stageStatus.success',
  failed: 'knowledgeBase.documents.stageStatus.failed',
  disabled: 'knowledgeBase.documents.stageStatus.disabled',
}

const STAGE_EXPLAIN_MAP: Record<string, string> = {
  parse: 'knowledgeBase.documents.stage.parseExplain',
  split: 'knowledgeBase.documents.stage.splitExplain',
  embed: 'knowledgeBase.documents.stage.embedExplain',
  index: 'knowledgeBase.documents.stage.indexExplain',
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

const fmtDate = (value: string | null | undefined) => {
  if (!value) return '--'
  const s = String(value)
  return s.length >= 10 ? s.slice(0, 10) : s
}

const stageItems = (doc: KbDocument) => [
  { key: 'parse', labelKey: 'knowledgeBase.documents.stage.parse', status: doc.parseStatus },
  { key: 'split', labelKey: 'knowledgeBase.documents.stage.split', status: doc.splitStatus },
  { key: 'embed', labelKey: 'knowledgeBase.documents.stage.embed', status: doc.embeddingStatus },
  { key: 'index', labelKey: 'knowledgeBase.documents.stage.index', status: doc.indexStatus },
]

const stageTooltip = (it: { key: string; labelKey: string; status: DocumentStatus }) => {
  const explainKey = STAGE_EXPLAIN_MAP[it.key] || ''
  const label = t(it.labelKey)
  const status = t(stageStatusTextKeyMap[it.status])
  return explainKey
    ? t('knowledgeBase.documents.stage.tooltip', { label, status, explain: t(explainKey) })
    : t('knowledgeBase.documents.stage.tooltipNoExplain', { label, status })
}
</script>

<template>
  <div class="table-wrap">
    <table class="doc-table">
      <thead>
        <tr>
          <th class="col-info">{{ t('knowledgeBase.documents.table.documentInfo') }}</th>
          <th class="col-type">{{ t('knowledgeBase.documents.table.fileType') }}</th>
          <th class="col-size">{{ t('knowledgeBase.documents.table.fileSize') }}</th>
          <th class="col-overall">{{ t('knowledgeBase.documents.table.overallStatus') }}</th>
          <th class="col-stage">{{ t('knowledgeBase.documents.table.stageStatus') }}</th>
          <th class="col-count">{{ t('knowledgeBase.documents.table.pageAndChunks') }}</th>
          <th class="col-enabled">{{ t('knowledgeBase.documents.table.enabledStatus') }}</th>
          <th class="col-updated">{{ t('knowledgeBase.documents.table.updatedAt') }}</th>
          <th class="col-actions">{{ t('knowledgeBase.documents.table.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="doc in docs" :key="doc.id">
          <td class="cell col-info">
            <div class="doc-info">
              <div class="kind-badge" :title="doc.fileExtension">{{ doc.fileExtension.toUpperCase() }}</div>
              <div class="info-text">
                <div class="doc-name" :title="doc.name">{{ doc.name }}</div>
                <div class="doc-original" :title="doc.originalFileName">{{ doc.originalFileName }}</div>
              </div>
            </div>
          </td>

          <td class="cell col-type">
            <div class="type-cell">
              <span class="type-pill">{{ doc.fileType }}</span>
              <span class="type-ext">{{ doc.fileExtension }}</span>
            </div>
          </td>

          <td class="cell col-size">
            <span class="mono">{{ formatBytes(doc.fileSize) }}</span>
          </td>

          <td class="cell col-overall">
            <span :class="['status-tag', statusClassMap(doc.overallStatus)]">{{ t(statusLabelKeyMap[doc.overallStatus]) }}</span>
          </td>

          <td class="cell col-stage">
            <div class="stage-grid">
              <div
                v-for="it in stageItems(doc)"
                :key="it.key"
                class="stage-item"
                :title="stageTooltip(it)"
              >
                <div class="stage-top">
                  <span class="stage-dot" :class="stageDotClass(it.status)" />
                  <span class="stage-label">{{ t(it.labelKey) }}</span>
                </div>
                <div
                  class="stage-status"
                  :class="`stage-status--${stageDotClass(it.status)}`"
                >
                  {{ t(stageStatusTextKeyMap[it.status]) }}
                </div>
              </div>
            </div>
          </td>

          <td class="cell col-count">
            <div class="count-grid">
              <div class="count-metric">
                <div class="count-value">{{ doc.pageCount }}</div>
                <div class="count-label">{{ t('knowledgeBase.documents.table.pages') }}</div>
              </div>
              <div class="count-metric">
                <div class="count-value">{{ doc.chunkCount }}</div>
                <div class="count-label">{{ t('knowledgeBase.documents.table.chunks') }}</div>
              </div>
            </div>
          </td>

          <td class="cell col-enabled">
            <span :class="['enabled-tag', doc.enabled ? 'enabled' : 'disabled']">
              {{ doc.enabled ? t('knowledgeBase.documents.enabled') : t('knowledgeBase.documents.disabled') }}
            </span>
          </td>

          <td class="cell col-updated">
            <span>{{ fmtDate(doc.updatedAt) }}</span>
          </td>

          <td class="cell col-actions">
            <div class="row-actions-grid">
              <button
                class="action-btn action-secondary action-toggle"
                :disabled="toggleEnabledBusyId === doc.id"
                :title="
                  doc.enabled
                    ? t('knowledgeBase.documents.table.disableTitle')
                    : t('knowledgeBase.documents.table.enableTitle')
                "
                @click="emit('toggle-enabled', doc)"
              >
                {{ toggleEnabledBusyId === doc.id ? t('knowledgeBase.documents.table.processing') : doc.enabled ? t('knowledgeBase.documents.table.disable') : t('knowledgeBase.documents.table.enable') }}
              </button>

              <button
                class="action-btn action-danger action-delete"
                :disabled="deleteBusyDocId === doc.id"
                :title="t('knowledgeBase.documents.table.deleteTitle', { name: doc.name })"
                @click="emit('delete', doc)"
              >
                {{ deleteBusyDocId === doc.id ? t('knowledgeBase.documents.table.deleting') : t('knowledgeBase.documents.table.delete') }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  width: 100%;
}

.doc-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 0;
  table-layout: fixed;
}

thead th {
  background: #fafafa;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #525252;
  text-align: left;
  white-space: nowrap;
}

tbody td.cell {
  padding: 12px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  vertical-align: top;
  background: #ffffff;
}

.doc-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.kind-badge {
  width: 44px;
  height: 30px;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1px solid rgba(0, 0, 0, 0.04);
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  flex-shrink: 0;
}

.info-text {
  min-width: 0;
}

.doc-name {
  font-weight: 900;
  color: #1a1a1a;
  font-size: 15px;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.doc-original {
  margin-top: 6px;
  font-size: 12px;
  color: #a3a3a3;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.type-cell {
  display: flex;
  align-items: center;
  gap: 8px;
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

.type-ext {
  font-size: 12px;
  color: #737373;
  white-space: nowrap;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  color: #1a1a1a;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
  height: 28px;
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 10px;
  align-items: start;
}

.stage-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
  align-items: flex-start;
  line-height: 1.15;
}

.stage-top {
  display: flex;
  align-items: center;
  gap: 6px;
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

.stage-label {
  font-size: 12px;
  color: #525252;
  font-weight: 900;
  white-space: nowrap;
}

.stage-status {
  font-size: 11px;
  font-weight: 900;
  color: #737373;
  white-space: nowrap;
  line-height: 1.1;
}

.stage-status--dot-success {
  color: #16a34a;
}
.stage-status--dot-processing {
  color: #2563eb;
}
.stage-status--dot-pending {
  color: #737373;
}
.stage-status--dot-failed {
  color: #dc2626;
}
.stage-status--dot-disabled {
  color: #737373;
}

.count-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  align-items: start;
}

.count-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.count-value {
  font-size: 14px;
  font-weight: 900;
  color: #1a1a1a;
  line-height: 1.1;
}

.count-label {
  font-size: 12px;
  color: #737373;
  font-weight: 700;
}

.enabled-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
  height: 28px;
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

.row-actions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;
}

.action-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  color: #525252;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.18);
  color: #1a1a1a;
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-secondary {
  background: transparent;
}

.action-danger {
  background: #fff5f5;
  border-color: rgba(239, 68, 68, 0.28);
  color: #dc2626;
}

.action-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.4);
}

/* 列宽按尽量适配桌面单屏来控制（必要时由外层容器开启横向滚动） */
.col-info {
  width: 225px;
}
.col-type {
  width: 108px;
}
.col-size {
  width: 102px;
}
.col-overall {
  width: 118px;
}
.col-stage {
  width: 215px;
}
.col-count {
  width: 135px;
}
.col-enabled {
  width: 108px;
}
.col-updated {
  width: 98px;
}
.col-actions {
  width: 180px;
}

thead th.col-actions {
  position: sticky;
  right: 0;
  z-index: 3;
  background: #fafafa;
}

tbody td.col-actions {
  position: sticky;
  right: 0;
  z-index: 2;
  background: #ffffff;
  box-shadow: -1px 0 0 rgba(0, 0, 0, 0.06);
}
</style>

