<script setup lang="ts">
import PluginPagination from '@/components/community/plugins/PluginPagination.vue'

interface Props {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ pageChange: [page: number] }>()
</script>

<template>
  <PluginPagination
    v-bind="props"
    @page-change="(page) => emit('pageChange', page)"
  />
</template>
