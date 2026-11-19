<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { MyPluginItem } from '@/api/myContent'

const props = defineProps<{ plugin: MyPluginItem }>()
const emit = defineEmits<{ delete: [id: number] }>()

const router = useRouter()
const { t } = useI18n()
const imgError = ref(false)

const fmt = (n: number | null | undefined) => {
  const num = n || 0
  return num >= 1000 ? (num / 1000).toFixed(1) + 'K' : String(num)
}
const fmtDate = (dt: string) => (dt ? dt.slice(0, 10) : '--')

const isImgUrl = (icon: string | null | undefined) =>
  !!icon && icon.trim() !== '' && (icon.startsWith('/') || icon.startsWith('http'))

const isEmoji = (icon: string | null | undefined) =>
  !!icon && icon.trim() !== '' && !icon.startsWith('/') && !icon.startsWith('http') && [...icon].length <= 4

const handleImgError = () => { imgError.value = true }

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

const handleEdit   = () => router.push(`/my/skills/${props.plugin.id}/edit`)
const handleDelete = () => emit('delete', props.plugin.id)
</script>

<template>
  <div class="plugin-card">
    <div class="card-header">
      <!-- 图标 -->
      <div class="plugin-icon">
        <img
          v-if="isImgUrl(plugin.pluginIcon) && !imgError"
          :src="plugin.pluginIcon"
          :alt="plugin.pluginName"
          class="icon-img"
          @error="handleImgError"
        />
        <span v-else-if="isEmoji(plugin.pluginIcon)" class="icon-emoji">{{ plugin.pluginIcon }}</span>
        <div v-else class="icon-placeholder">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect x="8" y="11" width="10" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <path d="M11 11V9C11 8.44772 11.4477 8 12 8H14C14.5523 8 15 8.44772 15 9V11" stroke="currentColor" stroke-width="1.8"/>
            <circle cx="11.5" cy="15" r="1" fill="currentColor"/>
            <circle cx="14.5" cy="15" r="1" fill="currentColor"/>
            <path d="M13 17V19M11 19H15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </div>
      </div>

      <!-- 名称 + 状态 + 日期 -->
      <div class="plugin-meta">
        <div class="name-row">
          <h3 class="plugin-name">{{ plugin.pluginName }}</h3>
          <span :class="['status-tag', statusClass(plugin.status)]">{{ plugin.statusLabel }}</span>
        </div>
        <div class="sub-row">
          <span class="category-tag">{{ plugin.pluginCategoryLabel }}</span>
          <span class="date-sep">·</span>
          <span class="date-item">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="2" width="9" height="8.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
              <path d="M4 1V3M8 1V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              <path d="M1.5 5H10.5" stroke="currentColor" stroke-width="1.2"/>
            </svg>
            {{ t('common.created') }} {{ fmtDate(plugin.createdAt) }}
          </span>
          <span class="date-sep">·</span>
          <span class="date-item">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/>
              <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            {{ t('common.update') }} {{ fmtDate(plugin.updatedAt) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 绠€？-->
    <p class="plugin-description">{{ plugin.pluginDescription }}</p>

    <!-- 缁熻 -->
    <div class="card-stats">
      <span class="stat-item">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 1.5L7.8 4.8L11.3 5.1L8.8 7.3L9.6 10.7L6.5 8.8L3.4 10.7L4.2 7.3L1.7 5.1L5.2 4.8Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
        {{ fmt(plugin.favoriteCount) }}
      </span>
      <span class="stat-item">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 9C2 9 3 6 6.5 6C10 6 11 9 11 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M4.5 5C4.5 3.9 5.4 3 6.5 3C7.6 3 8.5 3.9 8.5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        {{ fmt(plugin.likeCount) }}
      </span>
      <span class="stat-item">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 2.5C3.8 2.5 2 6.5 2 6.5S3.8 10.5 6.5 10.5C9.2 10.5 11 6.5 11 6.5S9.2 2.5 6.5 2.5Z" stroke="currentColor" stroke-width="1.2"/>
          <circle cx="6.5" cy="6.5" r="1.8" stroke="currentColor" stroke-width="1.2"/>
        </svg>
        {{ fmt(plugin.viewCount) }}
      </span>
    </div>

    <!-- 鎿嶄綔鎸夐挳 -->
    <div class="card-actions">
      <button class="action-btn btn-edit" @click="handleEdit">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M9 2L11 4L5 10H3V8L9 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
        {{ t('common.edit') }}
      </button>
      <button class="action-btn btn-delete" @click="handleDelete">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2.5 4H10.5M4.5 4V3C4.5 2.72 4.72 2.5 5 2.5H8C8.28 2.5 8.5 2.72 8.5 3V4M5.5 6V9.5M7.5 6V9.5M3.5 4L4 10C4 10.28 4.22 10.5 4.5 10.5H8.5C8.78 10.5 9 10.28 9 10L9.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('common.delete') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.plugin-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  transition: all 0.22s ease;
}

.plugin-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.13);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
}

.plugin-icon {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.icon-img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
.icon-emoji { font-size: 26px; line-height: 1; }
.icon-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #a3a3a3; }

.plugin-meta { flex: 1; min-width: 0; }

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  min-width: 0;
}

.plugin-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-draft     { background: rgba(0,0,0,0.06);      color: #737373; }
.status-published { background: rgba(34,197,94,0.1);   color: #16a34a; }
.status-pending   { background: rgba(249,115,22,0.1);  color: #ea580c; }
.status-offline   { background: rgba(239,68,68,0.1);   color: #dc2626; }
.status-rejected  { background: rgba(168,85,247,0.08); color: #9333ea; }

.sub-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.category-tag {
  padding: 3px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.date-sep { font-size: 13px; color: #d4d4d4; }

.date-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #a3a3a3;
}
.date-item svg { color: #c3c3c3; flex-shrink: 0; }

.plugin-description {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #525252;
  margin: 0;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #737373;
}
.stat-item svg { color: #a3a3a3; flex-shrink: 0; }

.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 6px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #ffffff;
  color: #525252;
  white-space: nowrap;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.16);
  color: #1a1a1a;
}

.btn-delete:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); color: #dc2626; }
</style>
