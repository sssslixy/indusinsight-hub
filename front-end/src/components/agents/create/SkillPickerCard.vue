<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SkillListItem } from '@/api/skill'
import { skillCategoryLabelKey } from '@/constants/skillCategoryCodes'
import { resolvePluginSystemIconSrc } from '@/constants/systemAssetIcons'

const props = defineProps<{
  skill: SkillListItem
  selected: boolean
  /** 「我的」「收藏」与社区列表信息密度略有不同，与 MySkillCard / 社区 SkillCard 对齐 */
  listSource: 'mine' | 'community' | 'favorite' | 'run_config'
}>()

const emit = defineEmits<{ toggle: [] }>()

const { t } = useI18n()
const imgError = ref(false)
watch(
  () => props.skill.iconUrl,
  () => {
    imgError.value = false
  },
)

const fmt = (n?: number) => {
  const value = n || 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
}

const fmtDate = (dt?: string) => (dt ? dt.slice(0, 10) : '--')

const resolvedIconSrc = computed(() => resolvePluginSystemIconSrc(props.skill.iconUrl))

const handleClick = () => emit('toggle')
</script>

<template>
  <div
    :class="[
      'skill-picker-card',
      { 'skill-picker-card--selected': selected, 'skill-picker-card--run-config': listSource === 'run_config' },
    ]"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter.space.prevent="handleClick"
  >
    <div class="card-header">
      <div class="skill-icon">
        <img
          v-if="resolvedIconSrc && !imgError"
          :src="resolvedIconSrc"
          :alt="skill.name"
          class="icon-img"
          @error="imgError = true"
        />
        <div v-else class="icon-placeholder">S</div>
      </div>

      <div class="skill-meta">
        <template v-if="listSource === 'mine'">
          <div class="name-row">
            <h3 class="skill-name">{{ skill.name }}</h3>
          </div>
          <div class="sub-row">
            <span class="category-tag">{{ t(skillCategoryLabelKey(skill.categoryCode)) }}</span>
            <span class="date-item">{{ t('agentCreate.picker.updated') }} {{ fmtDate(skill.updatedAt) }}</span>
          </div>
        </template>
        <template v-else>
          <div class="name-row">
            <h3 class="skill-name">{{ skill.name }}</h3>
          </div>
          <div v-if="listSource !== 'run_config'" class="sub-row">
            <span class="category-tag">{{ t(skillCategoryLabelKey(skill.categoryCode)) }}</span>
            <span class="skill-author">@{{ skill.authorName || t('agentCreate.picker.unknownAuthor') }}</span>
          </div>
        </template>
      </div>
    </div>

    <p class="skill-description">{{ skill.description || t('agentCreate.picker.noDescription') }}</p>

    <div v-if="listSource !== 'run_config'" class="card-stats">
      <template v-if="listSource === 'mine'">
        <span class="stat-item">{{ t('agentCreate.picker.favorite') }} {{ fmt(skill.favoriteCount) }}</span>
        <span class="stat-item">{{ t('agentCreate.picker.views') }} {{ fmt(skill.viewCount) }}</span>
      </template>
      <template v-else>
        <span class="stat-item">{{ t('agentCreate.picker.favorite') }} {{ fmt(skill.favoriteCount) }}</span>
        <span class="stat-item">{{ t('agentCreate.picker.views') }} {{ fmt(skill.viewCount) }}</span>
      </template>
    </div>

    <div class="select-indicator">
      <span v-if="selected" class="check">{{ t('agentCreate.picker.selected') }}</span>
      <span v-else class="hint">{{ t('agentCreate.picker.clickToSelect') }}</span>
    </div>
  </div>
</template>

<style scoped>
.skill-picker-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
  text-align: left;
}

.skill-picker-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.13);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
}

.skill-picker-card--selected {
  background: #f5f5f5;
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
}

.skill-picker-card--selected:hover {
  background: #f3f4f6;
  border-color: rgba(37, 99, 235, 0.55);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.skill-icon {
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
  object-fit: cover;
}

.icon-placeholder {
  color: #737373;
  font-size: 20px;
  font-weight: 600;
}

.skill-meta {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.skill-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-picker-card--run-config .name-row {
  margin-bottom: 0;
}

.category-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
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

.date-item {
  font-size: 13px;
  color: #a3a3a3;
}

.skill-author {
  font-size: 13px;
  color: #737373;
}

.skill-description {
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
  margin-top: 2px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.stat-item {
  font-size: 13px;
  color: #737373;
}

.select-indicator {
  padding-top: 8px;
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
