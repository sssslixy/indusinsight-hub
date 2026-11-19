<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toolCategoryZhCardLabel } from '@/constants/skillCategoryCodes'
import { resolvePluginSystemIconSrc } from '@/constants/systemAssetIcons'
import type { ToolListItem } from '@/api/tool'

const props = withDefaults(
  defineProps<{
    tool: ToolListItem
    variant?: 'manage' | 'community' | 'favorite'
    favoritedAt?: string
  }>(),
  { variant: 'manage' },
)
const emit = defineEmits<{ delete: [id: number]; cancelFavorite: [id: number] }>()
const router = useRouter()
const { t } = useI18n()
const imgError = ref(false)

watch(
  () => props.tool.iconUrl,
  () => {
    imgError.value = false
  },
)

const resolvedIconSrc = computed(() => resolvePluginSystemIconSrc(props.tool.iconUrl))
const categoryLabel = computed(() => t('category.toolType', { category: t(toolCategoryZhCardLabel(props.tool.categoryCode)) }))

const fmt = (n?: number) => {
  const value = n || 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
}
const fmtDate = (dt?: string) => (dt ? dt.slice(0, 10) : '--')
const fmtFavorited = (dt?: string) => {
  if (!dt) return '--'
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return dt.slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const handleImgError = () => {
  imgError.value = true
}
const handleEdit = () => router.push(`/my/tools/${props.tool.id}/edit`)
const handleDelete = () => emit('delete', props.tool.id)

const handleViewDetail = (e: Event) => {
  e.stopPropagation()
  router.push({ path: '/tools/create', query: { id: String(props.tool.id), from: 'community' } })
}

const handleCancelFavorite = () => emit('cancelFavorite', props.tool.id)

const statusClass = (status?: string) => {
  const map: Record<string, string> = {
    draft: 'status-draft',
    published: 'status-published',
    disabled: 'status-offline',
    validation_failed: 'status-rejected',
  }
  return map[status || ''] || 'status-draft'
}
const statusLabel = (status?: string) => {
  const map: Record<string, string> = {
    draft: t('dashboard.toolStatus.draft'),
    published: t('dashboard.toolStatus.published'),
    disabled: t('dashboard.toolStatus.disabled'),
    validation_failed: t('dashboard.toolStatus.validationFailed'),
  }
  return map[status || ''] || status || t('dashboard.toolStatus.draft')
}

const isManage = computed(() => props.variant === 'manage')
const isCommunity = computed(() => props.variant === 'community')
const isFavorite = computed(() => props.variant === 'favorite')
</script>

<template>
  <div class="tool-card" :class="{ 'tool-card--community': isCommunity || isFavorite }">
    <div class="card-header" :class="{ 'card-header--compact-meta': isCommunity || isFavorite }">
      <div class="tool-icon">
        <img
          v-if="resolvedIconSrc && !imgError"
          :src="resolvedIconSrc"
          :alt="tool.name"
          class="icon-img"
          @error="handleImgError"
        />
        <div v-else class="icon-placeholder">T</div>
      </div>

      <div class="tool-meta">
        <template v-if="isManage">
          <div class="title-stack">
            <div class="name-status-row">
              <h3 class="tool-name">{{ tool.name }}</h3>
              <span :class="['status-tag', statusClass(tool.status)]">{{ statusLabel(tool.status) }}</span>
            </div>
            <span class="category-tag">{{ categoryLabel }}</span>
          </div>
          <div class="sub-row">
            <span class="date-item">{{ t('common.update') }} {{ fmtDate(tool.updatedAt) }}</span>
          </div>
        </template>
        <template v-else>
          <div class="title-stack">
            <h3 class="tool-name">{{ tool.name }}</h3>
            <span class="category-tag">{{ categoryLabel }}</span>
          </div>
          <div class="sub-row">
            <span class="tool-author">@{{ tool.authorName || t('common.unknownAuthor') }}</span>
          </div>
        </template>
      </div>
    </div>

    <p class="tool-description">{{ tool.description || t('common.noDescription') }}</p>

    <div class="card-stats">
      <span class="stat-item">{{ t('common.favorite') }} {{ fmt(tool.favoriteCount) }}</span>
      <span class="stat-item">{{ t('common.views') }} {{ fmt(tool.viewCount) }}</span>
      <span v-if="isFavorite && favoritedAt" class="stat-item stat-favorited">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path
            d="M6.5 1.5L7.8 4.8L11.3 5.1L8.8 7.3L9.6 10.7L6.5 8.8L3.4 10.7L4.2 7.3L1.7 5.1L5.2 4.8Z"
            fill="#f59e0b"
            stroke-width="0"
          />
        </svg>
        {{ fmtFavorited(favoritedAt) }}
      </span>
    </div>

    <div v-if="isManage" class="card-actions">
      <button type="button" class="action-btn btn-edit" @click="handleEdit">{{ t('common.edit') }}</button>
      <button type="button" class="action-btn btn-delete" @click="handleDelete">{{ t('common.delete') }}</button>
    </div>

    <button v-else-if="isCommunity" type="button" class="detail-btn" @click="handleViewDetail">
      {{ t('common.viewDetails') }}
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path
          d="M4.5 2.5L8.5 6.5L4.5 10.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div v-else-if="isFavorite" class="card-actions card-actions--favorite">
      <button type="button" class="detail-btn detail-btn--flex" @click="handleViewDetail">
        {{ t('common.viewDetails') }}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path
            d="M4.5 2.5L8.5 6.5L4.5 10.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button type="button" class="unfav-btn" @click="handleCancelFavorite">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1.5L8.5 5.2L12.5 5.5L9.5 8.2L10.5 12L7 9.8L3.5 12L4.5 8.2L1.5 5.5L5.5 5.2Z"
            fill="#f59e0b"
            stroke-width="0"
          />
        </svg>
        {{ t('common.unfavorite') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  transition: all 0.22s ease;
}
.tool-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.13);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
  transform: translateY(-2px);
}
.tool-card--community .card-header {
  align-items: center;
}
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
}
.tool-icon {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.icon-placeholder {
  color: #737373;
  font-size: 20px;
  font-weight: 600;
}
.tool-meta {
  flex: 1;
  min-width: 0;
}
.title-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
  min-width: 0;
  width: 100%;
}
.name-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.tool-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.title-stack > .tool-name {
  width: 100%;
}
.name-status-row .tool-name {
  flex: 1;
  min-width: 0;
  width: auto;
}
.status-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  box-sizing: border-box;
}
.status-draft {
  background: rgba(0, 0, 0, 0.06);
  color: #737373;
}
.status-published {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}
.status-offline {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
.status-rejected {
  background: rgba(168, 85, 247, 0.08);
  color: #9333ea;
}
.sub-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.category-tag {
  align-self: flex-start;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  box-sizing: border-box;
}
.tool-author {
  font-size: 13px;
  color: #737373;
}
.date-item {
  font-size: 13px;
  color: #a3a3a3;
}
.tool-description {
  font-size: 14px;
  color: #525252;
  margin: 0;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.stat-item {
  font-size: 13px;
  color: #737373;
}
.stat-favorited {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #92400e;
  font-size: 12px;
}
.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}
.card-actions--favorite {
  display: flex;
  gap: 8px;
}
.action-btn {
  padding: 9px 6px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
  color: #525252;
  transition: all 0.2s ease;
}
.btn-edit:hover {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}
.btn-delete:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.35);
  color: #dc2626;
}
.detail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 12px;
  padding: 9px 14px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}
.detail-btn:hover,
.tool-card:hover .detail-btn {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}
.detail-btn--flex {
  flex: 1;
  margin-top: 0;
}
.unfav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #92400e;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.unfav-btn:hover {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
}
</style>
