<script setup lang="ts">
import MyToolCard from '@/components/my-tools/MyToolCard.vue'
import type { FavoriteToolItem } from '@/api/myContent'
import type { ToolListItem } from '@/api/tool'

defineProps<{ tools: FavoriteToolItem[] }>()
const emit = defineEmits<{ cancelFavorite: [id: number] }>()

function toListItem(f: FavoriteToolItem): ToolListItem {
  return {
    id: f.id,
    name: f.toolName,
    description: f.toolDescription,
    iconUrl: f.toolIcon,
    categoryCode: f.categoryCode,
    status: 'published',
    favoriteCount: f.favoriteCount,
    viewCount: f.viewCount,
    authorName: f.authorName,
  }
}
</script>

<template>
  <div class="card-grid">
    <MyToolCard
      v-for="t in tools"
      :key="t.id"
      variant="favorite"
      :tool="toListItem(t)"
      :favorited-at="t.favoritedAt"
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
