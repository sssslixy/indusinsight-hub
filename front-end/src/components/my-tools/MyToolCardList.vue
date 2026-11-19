<script setup lang="ts">
import MyToolCard from './MyToolCard.vue'
import type { ToolListItem } from '@/api/tool'

defineProps<{ tools: ToolListItem[] }>()
defineEmits<{ delete: [id: number] }>()
</script>

<template>
  <div class="card-list">
    <MyToolCard
      v-for="t in tools"
      :key="t.id"
      :tool="t"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>

<style scoped>
.card-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (max-width: 900px) {
  .card-list {
    grid-template-columns: 1fr;
  }
}
</style>
