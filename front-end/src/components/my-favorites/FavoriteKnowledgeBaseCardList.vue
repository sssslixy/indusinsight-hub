<script setup lang="ts">
import FavoriteKnowledgeBaseCard from './FavoriteKnowledgeBaseCard.vue'
import type { FavoriteKnowledgeBaseItem } from '@/api/myContent'

defineProps<{ items: FavoriteKnowledgeBaseItem[] }>()
const emit = defineEmits<{ cancelFavorite: [id: number] }>()
</script>

<template>
  <div class="card-grid">
    <FavoriteKnowledgeBaseCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      @cancel-favorite="emit('cancelFavorite', $event)"
    />
  </div>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
