<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ResultSummary,
  ArtifactFile,
  ChartOrMetricCard,
  ExecutionLogEntry,
} from '@/types/modules/agentWorkbench'

interface FileItem extends ArtifactFile {
  downloadKey?: 'report' | 'deployment_zip'
}

const props = withDefaults(
  defineProps<{
    summary: ResultSummary | null
    files: ArtifactFile[]
    chartsAndMetrics: ChartOrMetricCard[]
    executionLogs: ExecutionLogEntry[]
    /** 任务 ID，与 deliverables 一起用于下载 */
    taskId?: string
    /** 可下载产物（报告、部署包） */
    deliverables?: { key: string; name: string }[]
    /** 产物完成时间（ISO 字符串），用于在文件名下方显示时间 */
    deliverablesCompletedAt?: string
    /** 是否展示「运行日志」Tab（外部服务仅保留文件产物） */
    showExecutionLogsTab?: boolean
  }>(),
  {
    taskId: '',
    deliverables: () => [],
    deliverablesCompletedAt: '',
    showExecutionLogsTab: true,
  }
)

const activeTab = ref<'files' | 'logs'>('files')
const { locale, t } = useI18n()

watch(
  () => props.showExecutionLogsTab,
  (show) => {
    if (!show && activeTab.value === 'logs') activeTab.value = 'files'
  },
)
const downloading = ref<string | null>(null)

const tabs = computed(() => {
  const list: { key: 'files' | 'logs'; label: string }[] = [
    { key: 'files', label: t('workbench.result.files') },
  ]
  if (props.showExecutionLogsTab) list.push({ key: 'logs', label: t('workbench.result.logs') })
  return list
})

function formatDisplayTime(isoOrEmpty: string): string {
  if (!isoOrEmpty) return ''
  try {
    const d = new Date(isoOrEmpty)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(locale.value, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(/\//g, '-')
  } catch {
    return ''
  }
}

const displayFiles = computed<FileItem[]>(() => {
  // 优先使用 files（历史恢复时为 artifactFiles），保证恢复会话时文件产物可见
  if (props.files?.length) {
    return props.files as FileItem[]
  }
  if (props.taskId && props.deliverables?.length) {
    const timeStr = formatDisplayTime(props.deliverablesCompletedAt || '')
    return props.deliverables.map((d) => ({
      id: d.key,
      name: d.name,
      size: '-',
      createdAt: timeStr,
      downloadKey: d.key as 'report' | 'deployment_zip',
    }))
  }
  return []
})

function hasValidFileId(file: FileItem): boolean {
  const n = Number(file.id)
  return !Number.isNaN(n) && n > 0
}

async function handleDownload(file: FileItem) {
  // 系统产出统一用文件 id 下载（当前任务与历史记录均从本系统存储拉取）
  const fileIdNum = Number(file.id)
  if (Number.isNaN(fileIdNum) || fileIdNum <= 0) return
  try {
    downloading.value = String(file.id)
    const { downloadTaskFileById } = await import('@/api/task')
    await downloadTaskFileById(fileIdNum, file.name)
  } catch (e) {
    console.error(e)
  } finally {
    downloading.value = null
  }
}
</script>

<template>
  <div class="result-panel">
    <div v-if="tabs.length > 1" class="panel-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>
    <div v-else class="panel-single-title">{{ t('workbench.result.files') }}</div>

    <div class="panel-content">
      <!-- 文件产物 -->
      <div v-show="activeTab === 'files'" class="tab-pane">
        <template v-if="displayFiles.length">
          <div class="file-list">
            <div
              v-for="f in displayFiles"
              :key="f.id"
              class="file-row"
            >
              <div class="file-info">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="file-icon">
                  <rect
                    x="2"
                    y="1"
                    width="10"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <path
                    d="M4 4.5H10M4 6.5H10M4 8.5H7"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="file-meta">
                  <span class="file-meta-name">{{ f.name }}</span>
                  <span class="file-meta-size">{{ f.createdAt ? t('workbench.result.time', { time: f.createdAt }) : (f.size || '—') }}</span>
                </div>
              </div>
              <button
                type="button"
                class="btn-download"
                :disabled="downloading !== null || !hasValidFileId(f)"
                :title="t('workbench.result.download')"
                @click="handleDownload(f)"
              >
                {{ downloading === f.id ? t('workbench.result.downloading') : t('workbench.result.download') }}
              </button>
            </div>
          </div>
        </template>
        <div v-else class="empty-hint">{{ t('workbench.result.noFiles') }}</div>
      </div>

      <!-- 运行日志 -->
      <div v-show="activeTab === 'logs'" class="tab-pane">
        <template v-if="executionLogs.length">
          <div class="log-list">
            <div v-for="l in executionLogs" :key="l.id" class="log-row">
              <span class="log-time">{{ l.timestamp }}</span>
              <span class="log-step">{{ l.stepName }}</span>
              <span class="log-action">{{ l.action }}</span>
              <span v-if="l.actionType" class="log-plugin">{{ t('workbench.result.action') }}: {{ l.actionType }}</span>
              <span v-if="l.stageGoal" class="log-plugin">{{ t('workbench.result.goal') }}: {{ l.stageGoal }}</span>
              <span v-if="l.skillName" class="log-plugin">
                {{ t('workbench.result.skill') }}: {{ l.skillName }}
              </span>
              <span v-if="l.skillVersionId" class="log-plugin">v{{ l.skillVersionId }}</span>
              <span v-if="l.runtimeType" class="log-plugin">{{ l.runtimeType }}</span>
              <span class="log-status" :class="`log-status--${l.status}`">
                {{ l.status === 'success' ? t('workbench.result.success') : l.status === 'failed' ? t('workbench.result.failed') : t('workbench.result.running') }}
              </span>
              <span v-if="l.detail" class="log-action">{{ l.detail }}</span>
            </div>
          </div>
        </template>
        <div v-else class="empty-hint">{{ t('workbench.result.noLogs') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-panel {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

.panel-single-title {
  flex-shrink: 0;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  background: #fafafa;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  flex-shrink: 0;
  background: #fafafa;
}

.tab-btn {
  flex: 1;
  min-width: 0;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.tab-btn:hover {
  color: #374151;
}

.tab-btn--active {
  color: #111827;
  border-bottom-color: #111827;
  background: #ffffff;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
  min-height: 0;
  scrollbar-gutter: stable;
}

.panel-content::-webkit-scrollbar {
  width: 5px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
}

.tab-pane {
  min-height: 100%;
}

.empty-hint {
  font-size: 13px;
  color: #9ca3af;
  padding: 24px 0;
  text-align: center;
}

.summary-block {
  margin-bottom: 16px;
}

.summary-block:last-child {
  margin-bottom: 0;
}

.block-title {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-text,
.summary-value {
  font-size: 14px;
  color: #111827;
  line-height: 1.6;
  margin: 0;
}

.summary-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
}

.summary-list--steps {
  list-style: none;
  padding-left: 0;
}

.summary-list--steps li::before {
  content: '→';
  color: #9ca3af;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.file-icon {
  color: #6b7280;
  flex-shrink: 0;
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-meta-name {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta-size {
  font-size: 11px;
  color: #9ca3af;
}

.btn-download {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  flex-shrink: 0;
}

.btn-download:hover {
  border-color: #111827;
  color: #111827;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-card {
  padding: 12px 14px;
  background: #f9fafb;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}

.metric-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

.metric-sub {
  font-size: 12px;
  color: #059669;
  margin-top: 2px;
}

.metric-desc {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  font-size: 12px;
  background: #f9fafb;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
}

.log-time {
  color: #9ca3af;
  flex-shrink: 0;
}

.log-step {
  font-weight: 600;
  color: #374151;
  flex-shrink: 0;
}

.log-action {
  color: #111827;
  flex: 1;
  min-width: 0;
}

.log-plugin {
  font-size: 11px;
  color: #6b7280;
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 5px;
  border-radius: 4px;
}

.log-duration {
  font-size: 11px;
  color: #9ca3af;
}

.log-status {
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.log-status--success {
  color: #059669;
}

.log-status--failed {
  color: #dc2626;
}

.log-status--running {
  color: #2563eb;
}
</style>
