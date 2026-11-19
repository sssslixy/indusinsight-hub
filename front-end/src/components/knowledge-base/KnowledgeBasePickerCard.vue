<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MyKnowledgeBaseItem } from '@/api/knowledgeBase'
import { KNOWLEDGE_BASE_SYSTEM_ICON_MAP } from '@/constants/systemAssetIcons'

const props = defineProps<{
  item: MyKnowledgeBaseItem
  selected: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()
const { t } = useI18n()

const iconLoadFailed = ref(false)
watch(
  () => props.item.iconUrl,
  () => {
    iconLoadFailed.value = false
  },
)

const formatBytes = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return '--'
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '--'
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

const statusLabelKey = computed(() => {
  const map = {
    draft: 'knowledgeBase.status.draft',
    active: 'knowledgeBase.status.active',
    reindexing: 'knowledgeBase.status.reindexing',
    disabled: 'knowledgeBase.status.disabled',
    failed: 'knowledgeBase.status.failed',
  } as const satisfies Record<MyKnowledgeBaseItem['status'], string>
  return map[props.item.status] || '--'
})

const statusClass = computed(() => {
  const map: Record<MyKnowledgeBaseItem['status'], string> = {
    draft: 'status-disabled',
    active: 'status-enabled',
    reindexing: 'status-processing',
    disabled: 'status-disabled',
    failed: 'status-failed',
  }
  return map[props.item.status] || 'status-disabled'
})

const visibilityLabelKey = computed(() => {
  const map = {
    private: 'knowledgeBase.visibility.private',
    team: 'knowledgeBase.visibility.team',
    public: 'knowledgeBase.visibility.public',
  } as const
  return map[props.item.visibility]
})

const visibilityClass = computed(() => `visibility-${props.item.visibility}`)

const fmtDate = (value: string) => (value ? value.slice(0, 10) : '--')

const resolvedIconUrl = computed(() => {
  const v = props.item.iconUrl
  if (!v) return undefined
  if (v in KNOWLEDGE_BASE_SYSTEM_ICON_MAP) return KNOWLEDGE_BASE_SYSTEM_ICON_MAP[v]
  return v
})

const shouldShowPlaceholderIcon = computed(() => !resolvedIconUrl.value || iconLoadFailed.value)

const handleClick = () => emit('toggle')
</script>

<template>
  <div
    :class="['kb-picker-card', { 'kb-picker-card--selected': selected }]"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter.space.prevent="handleClick"
  >
    <div class="card-header">
      <div class="kb-icon">
        <img
          v-if="!shouldShowPlaceholderIcon"
          :src="resolvedIconUrl"
          alt=""
          class="kb-icon-img"
          @error="iconLoadFailed = true"
        />
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7.5C4 6.67 4.67 6 5.5 6h5c.83 0 1.5.67 1.5 1.5v10c0-.83-.67-1.5-1.5-1.5h-5C4.67 16 4 16.67 4 17.5v-10z"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            d="M20 7.5C20 6.67 19.33 6 18.5 6h-5c-.83 0-1.5.67-1.5 1.5v10c0-.83.67-1.5 1.5-1.5h5c.83 0 .5.67 1.5 1.5v-10z"
            stroke="currentColor"
            stroke-width="1.6"
          />
        </svg>
      </div>
      <div class="kb-meta">
        <div class="name-row">
          <h3 class="kb-name" :title="item.name">{{ item.name }}</h3>
          <span :class="['tag', statusClass]">{{ t(statusLabelKey) }}</span>
          <span :class="['tag', visibilityClass]">{{ t(visibilityLabelKey) }}</span>
        </div>
        <div class="date-row">
          <span class="date-item">{{ t('knowledgeBase.card.createdAt', { date: fmtDate(item.createdAt) }) }}</span>
          <span class="date-sep">·</span>
          <span class="date-item">{{ t('knowledgeBase.card.updatedAt', { date: fmtDate(item.updatedAt) }) }}</span>
        </div>
      </div>
    </div>

    <p class="desc">{{ item.description || t('agentCreate.picker.noDescription') }}</p>

    <div class="stats">
      <span class="stat">{{ t('knowledgeBase.card.documentCount', { count: item.documentCount }) }}</span>
      <span class="stat">{{ t('knowledgeBase.card.chunkCount', { count: item.chunkCount }) }}</span>
      <span class="stat">{{ t('knowledgeBase.card.totalSize', { size: formatBytes(item.totalFileSize) }) }}</span>
    </div>

    <div class="select-indicator">
      <span v-if="selected" class="check">{{ t('agentCreate.picker.selected') }}</span>
      <span v-else class="hint">{{ t('agentCreate.picker.clickToSelect') }}</span>
    </div>
  </div>
</template>

<style scoped>
.kb-picker-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  text-align: left;
}

.kb-picker-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.13);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.kb-picker-card--selected {
  background: #f5f5f5;
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
}

.kb-picker-card--selected:hover {
  background: #f3f4f6;
  border-color: rgba(37, 99, 235, 0.55);
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.kb-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a8a8a;
  flex-shrink: 0;
}

.kb-icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.kb-icon svg {
  width: 32px;
  height: 32px;
}

.kb-meta {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.kb-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
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
}
.status-failed {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.visibility-private {
  background: rgba(0, 0, 0, 0.06);
  color: #525252;
}
.visibility-team {
  background: rgba(14, 165, 233, 0.1);
  color: #0369a1;
}
.visibility-public {
  background: rgba(168, 85, 247, 0.1);
  color: #7e22ce;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #a3a3a3;
  font-size: 12px;
  flex-wrap: wrap;
}

.date-sep {
  color: #d4d4d4;
}

.desc {
  margin: 0;
  min-height: 38px;
  color: #525252;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 2px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.stat {
  font-size: 13px;
  color: #737373;
}

.select-indicator {
  padding-top: 6px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 12px;
}

.check {
  color: #111827;
  font-weight: 600;
}

.hint {
  color: #9ca3af;
}
</style>
