<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MyKnowledgeBaseItem } from '@/api/knowledgeBase'

import kbIcon1 from '@/assets/icon/知识库图标1.png'
import kbIcon2 from '@/assets/icon/知识库图标2.png'
import kbIcon3 from '@/assets/icon/知识库图标3.png'
import kbIcon4 from '@/assets/icon/知识库图标4.png'

const props = defineProps<{
  item: MyKnowledgeBaseItem
  deleteLoading?: boolean
  deleteDisabled?: boolean
}>()
const emit = defineEmits<{
  edit: [id: number]
  manageDocs: [id: number]
  delete: [id: number]
}>()
const { t } = useI18n()

const SYSTEM_ICON_MAP: Record<string, string> = {
  'system-1': kbIcon1,
  'system-2': kbIcon2,
  'system-3': kbIcon3,
  'system-4': kbIcon4,
}

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

const visibilityClass = computed(() => `visibility-${props.item.visibility}`)

const visibilityLabelKey = computed(() => {
  const map = {
    private: 'knowledgeBase.visibility.private',
    team: 'knowledgeBase.visibility.team',
    public: 'knowledgeBase.visibility.public',
  } as const
  return map[props.item.visibility]
})

/** 与后端 KnowledgeBaseStatus 对齐；启用/停用均用标签表达，不改变卡片描边 */
const operationalStatus = computed(() => {
  const s = props.item.status
  type Variant = 'active' | 'disabled' | 'draft' | 'reindexing' | 'failed'
  const map: Record<MyKnowledgeBaseItem['status'], { labelKey: string; variant: Variant }> = {
    active: { labelKey: 'knowledgeBase.status.active', variant: 'active' },
    disabled: { labelKey: 'knowledgeBase.status.disabled', variant: 'disabled' },
    draft: { labelKey: 'knowledgeBase.status.draft', variant: 'draft' },
    reindexing: { labelKey: 'knowledgeBase.status.reindexing', variant: 'reindexing' },
    failed: { labelKey: 'knowledgeBase.status.failed', variant: 'failed' },
  }
  return map[s]
})

const fmtDate = (value: string) => (value ? value.slice(0, 10) : '--')

const resolvedIconUrl = computed(() => {
  const v = props.item.iconUrl
  if (!v) return undefined
  // 后端可能直接返回 system-* 标识，而不是可访问的 URL
  if (v in SYSTEM_ICON_MAP) return SYSTEM_ICON_MAP[v]
  return v
})

const shouldShowPlaceholderIcon = computed(() => {
  return !resolvedIconUrl.value || iconLoadFailed.value
})

const deleteButtonDisabled = computed(() => {
  return Boolean(props.deleteDisabled || props.deleteLoading)
})
</script>

<template>
  <div class="knowledge-card">
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
          <span :class="['tag', visibilityClass]">{{ t(visibilityLabelKey) }}</span>
          <span
            class="tag tag-status"
            :class="'tag-status--' + operationalStatus.variant"
          >
            {{ t(operationalStatus.labelKey) }}
          </span>
        </div>
        <div class="date-row">
          <span class="date-item">{{ t('knowledgeBase.card.createdAt', { date: fmtDate(item.createdAt) }) }}</span>
          <span class="date-sep">·</span>
          <span class="date-item">{{ t('knowledgeBase.card.updatedAt', { date: fmtDate(item.updatedAt) }) }}</span>
        </div>
      </div>
    </div>

    <p class="desc">{{ item.description || t('common.noDescription') }}</p>

    <div class="stats">
      <span class="stat">{{ t('knowledgeBase.card.documentCount', { count: item.documentCount }) }}</span>
      <span class="stat">{{ t('knowledgeBase.card.chunkCount', { count: item.chunkCount }) }}</span>
      <span class="stat">{{ t('knowledgeBase.card.totalSize', { size: formatBytes(item.totalFileSize) }) }}</span>
    </div>

    <div class="actions">
      <button class="btn btn-outline" @click="emit('edit', item.id)">
        {{ t('knowledgeBase.actions.edit') }}
      </button>
      <button class="btn btn-primary" @click="emit('manageDocs', item.id)">
        {{ t('knowledgeBase.actions.manageDocuments') }}
      </button>
      <button
        class="btn btn-danger"
        :disabled="deleteButtonDisabled"
        @click="emit('delete', item.id)"
      >
        {{ props.deleteLoading ? t('knowledgeBase.actions.deleting') : t('knowledgeBase.actions.delete') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.knowledge-card { display: flex; flex-direction: column; min-height: 290px; padding: 24px; background: #fafafa; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; transition: all 0.2s ease; }
.knowledge-card:hover { background: #fff; border-color: rgba(0,0,0,0.13); box-shadow: 0 4px 14px rgba(0,0,0,0.07); }
.card-header { display: flex; gap: 14px; align-items: flex-start; }
.kb-icon { width: 50px; height: 50px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08); background: #fff; display: flex; align-items: center; justify-content: center; color: #8a8a8a; flex-shrink: 0; }
.kb-icon-img { width: 100%; height: 100%; object-fit: contain; }
.kb-icon svg { width: 36px; height: 36px; }
.kb-meta { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; margin-bottom: 7px; }
.kb-name { margin: 0; font-size: 17px; font-weight: 600; color: #1a1a1a; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.visibility-private { background: rgba(0,0,0,0.06); color: #525252; }
.visibility-team { background: rgba(14,165,233,0.1); color: #0369a1; }
.visibility-public { background: rgba(168,85,247,0.1); color: #7e22ce; }
.tag-status.tag-status--active { background: rgba(34,197,94,0.12); color: #15803d; font-weight: 500; }
.tag-status.tag-status--disabled { background: rgba(239,68,68,0.1); color: #b91c1c; font-weight: 500; }
.tag-status.tag-status--draft,
.tag-status.tag-status--reindexing { background: rgba(245,158,11,0.12); color: #b45309; font-weight: 500; }
.tag-status.tag-status--failed { background: rgba(248,113,113,0.12); color: #b91c1c; font-weight: 500; }
.date-row { display: flex; align-items: center; gap: 6px; color: #a3a3a3; font-size: 13px; flex-wrap: wrap; }
.date-sep { color: #d4d4d4; }
.desc { margin: 14px 0 0; min-height: 44px; color: #525252; font-size: 14px; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.stats { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.stat { font-size: 13px; color: #737373; }
.actions { margin-top: auto; padding-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.btn { height: 34px; border-radius: 7px; border: 1px solid rgba(0,0,0,0.1); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
.btn-outline { background: #fff; color: #525252; }
.btn-outline:hover { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.16); color: #1a1a1a; }
.btn-primary { background: #2d2d2d; border-color: #2d2d2d; color: #fff; }
.btn-primary:hover { background: #1a1a1a; border-color: #1a1a1a; }
.btn-danger { background: #fff5f5; border-color: rgba(239,68,68,0.28); color: #dc2626; }
.btn-danger:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.4); }

.btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
