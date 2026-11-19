<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { skillCategoryZhCardLabel } from '@/constants/skillCategoryCodes'
import { resolvePluginSystemIconSrc } from '@/constants/systemAssetIcons'
import type { SkillListItem } from '@/api/skill'

const props = defineProps<{ skill: SkillListItem }>()
const router = useRouter()
const { t } = useI18n()
const imgError = ref(false)

watch(
  () => props.skill.iconUrl,
  () => {
    imgError.value = false
  },
)

const resolvedIconSrc = computed(() => resolvePluginSystemIconSrc(props.skill.iconUrl))
const categoryLabel = computed(() => t('category.skillType', { category: t(skillCategoryZhCardLabel(props.skill.categoryCode)) }))

const handleImgError = () => {
  imgError.value = true
}

const fmt = (n?: number) => {
  const value = n || 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
}

const handleViewDetail = (e: Event) => {
  e.stopPropagation()
  router.push({ path: '/skills/create', query: { id: String(props.skill.id), from: 'community' } })
}
</script>

<template>
  <div class="skill-card">
    <div class="card-header">
      <div class="skill-icon">
        <img
          v-if="resolvedIconSrc && !imgError"
          :src="resolvedIconSrc"
          :alt="skill.name"
          class="icon-img"
          @error="handleImgError"
        />
        <div v-else class="icon-placeholder">S</div>
      </div>
      <div class="skill-meta">
        <div class="title-stack">
          <h3 class="skill-name">{{ skill.name }}</h3>
          <span class="category-tag">{{ categoryLabel }}</span>
        </div>
        <div class="skill-meta-row">
          <span class="skill-author">@{{ skill.authorName || t('common.unknownAuthor') }}</span>
        </div>
      </div>
    </div>

    <p class="skill-description">{{ skill.description || t('common.noDescription') }}</p>

    <div class="card-stats">
      <span class="stat-item">{{ t('common.favorite') }} {{ fmt(skill.favoriteCount) }}</span>
      <span class="stat-item">{{ t('common.views') }} {{ fmt(skill.viewCount) }}</span>
    </div>

    <button class="detail-btn" @click="handleViewDetail">
      {{ t('common.viewDetails') }}
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M4.5 2.5L8.5 6.5L4.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.skill-card { display: flex; flex-direction: column; gap: 14px; padding: 24px; background: #fafafa; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; transition: all 0.22s ease; }
.skill-card:hover { background: #ffffff; border-color: rgba(0, 0, 0, 0.13); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07); transform: translateY(-2px); }
.card-header { display: flex; align-items: center; gap: 14px; }
.skill-icon { width: 56px; height: 56px; border-radius: 10px; background: #fff; border: 1px solid rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.icon-img { width: 100%; height: 100%; object-fit: contain; }
.icon-placeholder { color: #737373; font-size: 20px; font-weight: 600; }
.skill-meta { flex: 1; min-width: 0; }
.title-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
  min-width: 0;
}
.skill-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  width: 100%;
  min-width: 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.category-tag {
  align-self: flex-start;
  padding: 3px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  box-sizing: border-box;
}
.skill-meta-row { display: flex; align-items: center; gap: 8px; }
.skill-author { font-size: 13px; color: #737373; }
.skill-description {
  font-size: 14px;
  color: #525252;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.stat-item {
  font-size: 13px;
  color: #737373;
}
.detail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 14px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}
.detail-btn:hover,
.skill-card:hover .detail-btn { background: #2d2d2d; border-color: #2d2d2d; color: #ffffff; }
</style>
