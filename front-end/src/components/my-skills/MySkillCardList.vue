<script setup lang="ts">
import MySkillCard from './MySkillCard.vue'
import type { SkillListItem } from '@/api/skill'

defineProps<{ skills: SkillListItem[] }>()
defineEmits<{ delete: [id: number] }>()
</script>

<template>
  <div class="card-list">
    <MySkillCard
      v-for="skill in skills"
      :key="skill.id"
      :skill="skill"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>

<style scoped>
.card-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 900px) { .card-list { grid-template-columns: 1fr; } }
</style>
