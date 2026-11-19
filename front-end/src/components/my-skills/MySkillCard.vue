<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { skillCategoryZhCardLabel } from '@/constants/skillCategoryCodes'
import { resolvePluginSystemIconSrc } from '@/constants/systemAssetIcons'
import type { SkillListItem } from '@/api/skill'

const props = defineProps<{ skill: SkillListItem }>()
const emit = defineEmits<{ delete: [id: number] }>()
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

const fmt = (n?: number) => {
  const value = n || 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
}
const fmtDate = (dt?: string) => (dt ? dt.slice(0, 10) : '--')
const handleImgError = () => {
  imgError.value = true
}
const handleEdit = () => router.push(`/skills/create?id=${props.skill.id}`)
const handleDelete = () => emit('delete', props.skill.id)

const statusClass = (status?: number) => {
  const map: Record<number, string> = {
    0: 'status-draft',
    1: 'status-pending',
    2: 'status-published',
    3: 'status-offline',
    4: 'status-rejected',
  }
  return map[status || 0] || 'status-draft'
}
const statusLabel = (status?: number) => {
  const map: Record<number, string> = {
    0: t('dashboard.statusFilter.draft'),
    1: t('dashboard.statusFilter.pending'),
    2: t('dashboard.statusFilter.published'),
    3: t('dashboard.statusFilter.offline'),
    4: t('dashboard.statusFilter.rejected'),
  }
  return map[status || 0] || t('dashboard.statusFilter.draft')
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
          <div class="title-row">
            <h3 class="skill-name">{{ skill.name }}</h3>
            <span :class="['status-tag', statusClass(skill.status)]">{{ statusLabel(skill.status) }}</span>
          </div>
          <span class="category-tag">{{ categoryLabel }}</span>
        </div>
        <div class="sub-row">
          <span class="date-item">{{ t('common.update') }} {{ fmtDate(skill.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <p class="skill-description">{{ skill.description || t('common.noDescription') }}</p>

    <div class="card-stats">
      <span class="stat-item">{{ t('common.favorite') }} {{ fmt(skill.favoriteCount) }}</span>
      <span class="stat-item">{{ t('common.views') }} {{ fmt(skill.viewCount) }}</span>
    </div>

    <div class="card-actions">
      <button type="button" class="action-btn btn-edit" @click="handleEdit">{{ t('common.edit') }}</button>
      <button type="button" class="action-btn btn-delete" @click="handleDelete">{{ t('common.delete') }}</button>
    </div>
  </div>
</template>

<style scoped>
.skill-card { display: flex; flex-direction: column; padding: 24px; background: #fafafa; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; transition: all 0.22s ease; }
.skill-card:hover { background: #ffffff; border-color: rgba(0, 0, 0, 0.13); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07); transform: translateY(-2px); }
.card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
.skill-icon { width: 54px; height: 54px; border-radius: 10px; background: #fff; border: 1px solid rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; overflow: hidden; }
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
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.skill-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-tag { flex-shrink: 0; display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; line-height: 1.25; box-sizing: border-box; }
.status-draft { background: rgba(0,0,0,0.06); color: #737373; }
.status-pending { background: rgba(249,115,22,0.1); color: #ea580c; }
.status-published { background: rgba(34,197,94,0.1); color: #16a34a; }
.status-offline { background: rgba(239,68,68,0.1); color: #dc2626; }
.status-rejected { background: rgba(168,85,247,0.08); color: #9333ea; }
.sub-row { display: flex; align-items: center; gap: 8px; }
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
.date-item { font-size: 13px; color: #a3a3a3; }
.skill-description { font-size: 14px; color: #525252; margin: 0; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-stats { display: flex; align-items: center; gap: 14px; padding-top: 12px; margin-top: 14px; border-top: 1px solid rgba(0,0,0,0.06); }
.stat-item { font-size: 13px; color: #737373; }
.card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.action-btn { padding: 9px 6px; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid rgba(0,0,0,0.1); background: #fff; color: #525252; transition: all 0.2s ease; }
.btn-edit:hover { background: #2d2d2d; border-color: #2d2d2d; color: #ffffff; }
.btn-delete:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.35); color: #dc2626; }
</style>
