<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SkillCard from './SkillCard.vue'
import type { SkillListItem } from '@/api/skill'

interface Props {
  skills: SkillListItem[]
  loading?: boolean
  isEmpty?: boolean
  isSearchResult?: boolean
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="skill-card-list">
    <div v-if="loading" class="skill-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card"></div>
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      <p class="empty-text">{{ isSearchResult ? t('community.noSearchSkills') : t('community.noSkills') }}</p>
      <p v-if="isSearchResult" class="empty-hint">{{ t('community.adjustSearchOrReset') }}</p>
    </div>

    <div v-else class="skill-grid">
      <SkillCard v-for="skill in skills" :key="skill.id" :skill="skill" />
    </div>
  </div>
</template>

<style scoped>
.skill-card-list { min-height: 360px; }
.skill-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.skeleton-card { height: 220px; background: #f2f2f2; border-radius: 12px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 14px; }
.empty-text { font-size: 15px; font-weight: 500; color: #525252; margin: 0; }
.empty-hint { font-size: 13px; color: #a3a3a3; margin: 0; }
@media (max-width: 900px) { .skill-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
