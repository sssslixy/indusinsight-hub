<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { KbKnowledgeBaseOverview, KbVisibility, KbStatus } from '@/api/knowledgeDocument'

const props = defineProps<{
  kb: KbKnowledgeBaseOverview
}>()

const { t } = useI18n()

const visibilityLabelKey: Record<KbVisibility, string> = {
  private: 'knowledgeBase.visibility.private',
  team: 'knowledgeBase.visibility.team',
  public: 'knowledgeBase.visibility.public',
}

const statusLabelKey: Record<KbStatus, string> = {
  draft: 'knowledgeBase.status.draft',
  active: 'knowledgeBase.status.active',
  reindexing: 'knowledgeBase.status.reindexing',
  disabled: 'knowledgeBase.status.disabled',
  failed: 'knowledgeBase.status.failed',
}

const formatBytes = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '--'
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return '0 B'
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

const kbStatusClass = () => {
  switch (props.kb.status) {
    case 'active':
      return 'status-enabled'
    case 'reindexing':
      return 'status-processing'
    case 'draft':
      return 'status-disabled'
    case 'disabled':
      return 'status-disabled'
    case 'failed':
    default:
      return 'status-failed'
  }
}
</script>

<template>
  <section class="kb-overview-card">
    <div class="kb-overview-row">
      <div class="kb-title">
        <div class="kb-name" :title="kb.name">{{ kb.name }}</div>
        <div class="kb-meta-row">
          <span :class="['tag', kbStatusClass()]">{{ t(statusLabelKey[kb.status]) }}</span>
          <span class="tag tag-visibility">{{ t(visibilityLabelKey[kb.visibility]) }}</span>
        </div>
      </div>

      <div class="kb-kpis">
        <div class="kpi">
          <div class="kpi-value">{{ kb.documentCount }}</div>
          <div class="kpi-label">{{ t('knowledgeBase.overview.documentTotal') }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ kb.chunkCount }}</div>
          <div class="kpi-label">{{ t('knowledgeBase.overview.chunkTotal') }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ formatBytes(kb.totalFileSize) }}</div>
          <div class="kpi-label">{{ t('knowledgeBase.overview.totalFileSize') }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ fmtDate(kb.lastIndexedAt) }}</div>
          <div class="kpi-label">{{ t('knowledgeBase.overview.lastIndexedAt') }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kb-overview-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 18px 20px;
}

.kb-overview-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.kb-title {
  min-width: 260px;
}

.kb-name {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.25;
  margin-bottom: 8px;
  max-width: 420px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-meta-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.tag-visibility {
  background: rgba(0, 0, 0, 0.06);
  color: #525252;
  border: 1px solid rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

.status-enabled {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.status-processing {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.status-disabled {
  background: rgba(0, 0, 0, 0.06);
  color: #737373;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.status-failed {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.kb-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi {
  background: rgba(249, 250, 251, 0.45);
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  padding: 12px 12px;
}

.kpi-value {
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.2;
  margin-bottom: 6px;
}

.kpi-label {
  font-size: 12px;
  color: #737373;
}

@media (max-width: 900px) {
  .kb-overview-row {
    flex-direction: column;
  }
  .kb-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .kb-title {
    min-width: 0;
  }
}
</style>

