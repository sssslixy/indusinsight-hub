<script setup lang="ts">
import MyAgentCard from './MyAgentCard.vue'
import type { MyAgentItem } from '@/api/myContent'

defineProps<{ agents: MyAgentItem[] }>()
const emit = defineEmits<{ delete: [id: number] }>()
</script>

<template>
  <div class="card-list">
    <MyAgentCard
      v-for="agent in agents"
      :key="agent.id"
      :agent="agent"
      @delete="(id) => emit('delete', id)"
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
  .card-list { grid-template-columns: 1fr; }
}
</style>
