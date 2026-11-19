<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { type MyAgentItem } from '@/api/myContent'
import { AgentIcon } from '@/components/base'

const props = defineProps<{ agent: MyAgentItem }>()
const emit = defineEmits<{ delete: [id: number] }>()
const router = useRouter()
const { t } = useI18n()

const STATUS_PUBLISHED = 2

const fmt = (n: number | null | undefined) => {
  const num = n || 0
  return num >= 1000 ? (num / 1000).toFixed(1) + 'K' : String(num)
}
const fmtDate = (dt: string) => (dt ? dt.slice(0, 10) : '--')

const isImgUrl = (icon: string | null | undefined) =>
  !!icon &&
  icon.trim() !== '' &&
  (icon.startsWith('/') || icon.startsWith('http') || icon.startsWith('blob:'))

const isSystemAgentIcon = (icon: string | null | undefined) =>
  !!icon && /^system-[1-4]$/i.test(icon.trim())

const isEmoji = (icon: string | null | undefined) =>
  !!icon &&
  icon.trim() !== '' &&
  !icon.startsWith('/') &&
  !icon.startsWith('http') &&
  !icon.startsWith('blob:') &&
  !isSystemAgentIcon(icon) &&
  [...icon].length <= 4

const showAgentIconImage = (icon: string | null | undefined) =>
  !!icon && icon.trim() !== '' && !isEmoji(icon) && (isSystemAgentIcon(icon) || isImgUrl(icon))

const statusClass = (status: number) => {
  const map: Record<number, string> = {
    0: 'status-draft',
    1: 'status-pending',
    2: 'status-published',
    3: 'status-offline',
    4: 'status-rejected',
  }
  return map[status] || 'status-draft'
}

const handleEdit = () => {
  router.push(`/my/agents/${props.agent.id}/edit`)
}

const handleUse = () => {
  if (props.agent.status !== STATUS_PUBLISHED) {
    ElMessage({
      message: t('common.publishBeforeUse'),
      type: 'warning',
      duration: 2200,
    })
    return
  }
  router.push({ name: 'agent-use', params: { id: String(props.agent.id) } })
}

const handleDelete = () => emit('delete', props.agent.id)
</script>

<template>
  <div class="agent-card">
    <div class="card-header">
      <div class="agent-icon">
        <AgentIcon
          v-if="showAgentIconImage(agent.agentIcon)"
          :src="agent.agentIcon"
          :agent-id="agent.id"
          :enable-edit-fallback="false"
          :size="54"
          :alt="agent.agentName"
          class="icon-image"
        />
        <span v-else-if="isEmoji(agent.agentIcon)" class="icon-emoji">{{ agent.agentIcon }}</span>
        <div v-else class="icon-placeholder">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect x="8" y="10" width="16" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
            <circle cx="13" cy="15" r="1.5" fill="currentColor"/>
            <circle cx="19" cy="15" r="1.5" fill="currentColor"/>
            <path d="M13 20C13 20 14.5 21 16 21C17.5 21 19 20 19 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <rect x="6" y="8" width="2" height="4" rx="1" fill="currentColor"/>
            <rect x="24" y="8" width="2" height="4" rx="1" fill="currentColor"/>
          </svg>
        </div>
      </div>
      <div class="agent-meta">
        <div class="name-row">
          <h3 class="agent-name">{{ agent.agentName }}</h3>
          <span :class="['status-tag', statusClass(agent.status)]">{{ agent.statusLabel }}</span>
        </div>
        <div class="date-row">
          <span class="date-item">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="2" width="9" height="8.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
              <path d="M4 1V3M8 1V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              <path d="M1.5 5H10.5" stroke="currentColor" stroke-width="1.2"/>
            </svg>
            {{ t('common.created') }} {{ fmtDate(agent.createdAt) }}
          </span>
          <span class="date-sep">/</span>
          <span class="date-item">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/>
              <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            {{ t('common.update') }} {{ fmtDate(agent.updatedAt) }}
          </span>
        </div>
      </div>
    </div>
    <p class="agent-description">{{ agent.agentDescription }}</p>
    <div class="card-stats">
      <span class="stat-item">{{ t('common.favorite') }} {{ fmt(agent.favoriteCount) }}</span>
      <span class="stat-item">{{ t('common.views') }} {{ fmt(agent.viewCount) }}</span>
    </div>
    <div class="card-actions">
      <button type="button" class="action-btn btn-edit" @click="handleEdit">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9 2L11 4L5 10H3V8L9 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        {{ t('common.edit') }}
      </button>
      <button type="button" class="action-btn btn-use" @click="handleUse">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4 6.5H9M9 6.5L7 4.5M9 6.5L7 8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {{ t('common.continueUse') }}
      </button>
      <button type="button" class="action-btn btn-delete" @click="handleDelete">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 4H10.5M4.5 4V3C4.5 2.72 4.72 2.5 5 2.5H8C8.28 2.5 8.5 2.72 8.5 3V4M5.5 6V9.5M7.5 6V9.5M3.5 4L4 10C4 10.28 4.22 10.5 4.5 10.5H8.5C8.78 10.5 9 10.28 9 10L9.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {{ t('common.delete') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.agent-card { display:flex; flex-direction:column; padding:24px; background:#fafafa; border:1px solid rgba(0,0,0,0.07); border-radius:12px; transition:all 0.22s ease; }
.agent-card:hover { background:#ffffff; border-color:rgba(0,0,0,0.13); box-shadow:0 4px 14px rgba(0,0,0,0.07); transform:translateY(-2px); }
.card-header { display:flex; align-items:flex-start; gap:14px; margin-bottom:14px; }
.agent-icon { width:54px; height:54px; border-radius:10px; background:#ffffff; border:1px solid rgba(0,0,0,0.08); display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; }
.icon-image { width:100%; height:100%; object-fit:cover; border-radius:10px; }
.icon-emoji { font-size:26px; line-height:1; }
.icon-placeholder { display:flex; align-items:center; justify-content:center; width:100%; height:100%; color:#a3a3a3; }
.agent-meta { flex:1; min-width:0; }
.name-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
.agent-name { font-size:17px; font-weight:600; color:#1a1a1a; margin:0; line-height:1.3; }
.status-tag { padding:2px 8px; border-radius:4px; font-size:12px; font-weight:500; white-space:nowrap; flex-shrink:0; }
.status-draft { background:rgba(0,0,0,0.06); color:#737373; }
.status-published { background:rgba(34,197,94,0.1); color:#16a34a; }
.status-pending { background:rgba(249,115,22,0.1); color:#ea580c; }
.status-offline { background:rgba(239,68,68,0.1); color:#dc2626; }
.status-rejected { background:rgba(168,85,247,0.08); color:#9333ea; }
.date-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.date-item { display:flex; align-items:center; gap:4px; font-size:13px; color:#a3a3a3; }
.date-item svg { color:#c3c3c3; flex-shrink:0; }
.date-sep { font-size:13px; color:#d4d4d4; }
.agent-description { flex:1; font-size:14px; color:#525252; margin:0; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.card-stats { display:flex; align-items:center; gap:16px; padding-top:12px; margin-top:14px; border-top:1px solid rgba(0,0,0,0.06); }
.stat-item { display:flex; align-items:center; gap:6px; font-size:13px; color:#737373; }
.card-actions { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:12px; }
.action-btn { display:flex; align-items:center; justify-content:center; gap:5px; padding:9px 6px; border-radius:7px; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.2s ease; border:1px solid rgba(0,0,0,0.1); background:#ffffff; color:#525252; white-space:nowrap; }
.action-btn:hover { background:rgba(0,0,0,0.04); border-color:rgba(0,0,0,0.16); color:#1a1a1a; }
.btn-use { background:#2d2d2d; border-color:#2d2d2d; color:#ffffff; }
.btn-use:hover { background:#1a1a1a; border-color:#1a1a1a; color:#ffffff; }
.btn-delete:hover { background:rgba(239,68,68,0.08); border-color:rgba(239,68,68,0.3); color:#dc2626; }
</style>
