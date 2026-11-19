<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { skillCategoryLabelKey } from '@/constants/skillCategoryCodes'
import { resolvePluginSystemIconSrc } from '@/constants/systemAssetIcons'

type CardPlugin = {
  id: string | number
  pluginName?: string
  pluginDescription?: string
  pluginIcon?: string
  pluginCategory?: number
  categoryCode?: string
  authorName?: string
  favoriteCount?: number
  viewCount?: number
  updatedAt?: string
  status?: string
  /** 兼容历史字段名称 */
  name?: string
  description?: string
  icon?: string
  categoryId?: number
}

const props = defineProps<{
  plugin: CardPlugin
  selected: boolean
  /** 「我的」「收藏」与社区 tool 卡片分支一致 */
  listSource: 'mine' | 'community' | 'favorite'
}>()

const emit = defineEmits<{ toggle: [] }>()
const { t } = useI18n()

const imgError = ref(false)

const rawIcon = computed(
  () => (props.plugin.icon || props.plugin.pluginIcon || '').trim(),
)

const resolvedIconSrc = computed(() => resolvePluginSystemIconSrc(rawIcon.value))

watch(rawIcon, () => {
  imgError.value = false
})

const onIconError = () => {
  imgError.value = true
}

const displayName = computed(() =>
  String(props.plugin.name || props.plugin.pluginName || '').trim(),
)

const descriptionText = computed(() => props.plugin.description || props.plugin.pluginDescription || '')

const categoryZh = computed(() =>
  t(skillCategoryLabelKey(props.plugin.categoryCode ?? String(props.plugin.pluginCategory ?? props.plugin.categoryId ?? 'other'))),
)

const fmt = (n?: number) => {
  const value = n || 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
}

const fmtDate = (dt?: string) => (dt ? dt.slice(0, 10) : '--')

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
    draft: 'dashboard.toolStatus.draft',
    published: 'dashboard.toolStatus.published',
    disabled: 'dashboard.toolStatus.disabled',
    validation_failed: 'dashboard.toolStatus.validationFailed',
  }
  const key = map[status || '']
  return key ? t(key) : status || t('dashboard.toolStatus.draft')
}

const isManage = computed(() => props.listSource === 'mine')

const handleClick = () => emit('toggle')
</script>

<template>
  <div
    :class="['tool-card tool-picker-card', { 'tool-picker-card--selected': selected }]"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter.space.prevent="handleClick"
  >
    <div class="card-header">
      <div class="tool-icon">
        <img
          v-if="resolvedIconSrc && !imgError"
          :src="resolvedIconSrc"
          :alt="displayName"
          class="icon-img"
          @error="onIconError"
        />
        <div v-else class="icon-placeholder">T</div>
      </div>

      <div class="tool-meta">
        <template v-if="isManage">
          <div class="title-stack">
            <div class="name-status-row">
              <h3 class="tool-name">{{ displayName }}</h3>
              <span :class="['status-tag', statusClass(plugin.status)]">{{ statusLabel(plugin.status) }}</span>
            </div>
            <span class="category-tag">{{ categoryZh }}</span>
          </div>
          <div class="sub-row">
            <span class="date-item">{{ t('agentCreate.picker.updated') }} {{ fmtDate(plugin.updatedAt) }}</span>
          </div>
        </template>
        <template v-else>
          <div class="title-stack">
            <h3 class="tool-name">{{ displayName }}</h3>
            <span class="category-tag">{{ categoryZh }}</span>
          </div>
          <div class="sub-row">
            <span class="tool-author">@{{ plugin.authorName || t('agentCreate.picker.unknownAuthor') }}</span>
          </div>
        </template>
      </div>
    </div>

    <p class="tool-description">{{ descriptionText || t('agentCreate.picker.noDescription') }}</p>

    <div class="card-stats">
      <span class="stat-item">{{ t('agentCreate.picker.favorite') }} {{ fmt(plugin.favoriteCount) }}</span>
      <span class="stat-item">{{ t('agentCreate.picker.views') }} {{ fmt(plugin.viewCount) }}</span>
    </div>

    <div class="select-indicator">
      <span v-if="selected" class="check">{{ t('agentCreate.picker.selected') }}</span>
      <span v-else class="hint">{{ t('agentCreate.picker.clickToSelect') }}</span>
    </div>
  </div>
</template>

<style scoped>
.tool-picker-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  transition: all 0.22s ease;
  cursor: pointer;
  text-align: left;
}

.tool-picker-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.13);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
}

.tool-picker-card--selected {
  background: #f5f5f5;
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
}

.tool-picker-card--selected:hover {
  background: #f3f4f6;
  border-color: rgba(37, 99, 235, 0.55);
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
  flex-shrink: 0;
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

.status-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
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
}

.sub-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

.select-indicator {
  padding-top: 8px;
  margin-top: 0;
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
