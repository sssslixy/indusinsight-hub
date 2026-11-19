<script setup lang="ts">
import MyPluginCard from './MyPluginCard.vue'
import type { MyPluginItem } from '@/api/myContent'

defineProps<{ plugins: MyPluginItem[] }>()
const emit = defineEmits<{ delete: [id: number] }>()
</script>

<template>
  <div class="card-list">
    <MyPluginCard
      v-for="plugin in plugins"
      :key="plugin.id"
      :plugin="plugin"
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
