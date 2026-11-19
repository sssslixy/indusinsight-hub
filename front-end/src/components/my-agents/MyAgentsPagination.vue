<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
}>()

const emit = defineEmits<{ pageChange: [page: number] }>()
const { t } = useI18n()

const handlePrev = () => {
  if (props.currentPage > 1) emit('pageChange', props.currentPage - 1)
}

const handleNext = () => {
  if (props.currentPage < props.totalPages) emit('pageChange', props.currentPage + 1)
}

const handlePage = (page: number | string) => {
  if (typeof page === 'number' && page !== props.currentPage) emit('pageChange', page)
}

const getPages = (): (number | string)[] => {
  const pages: (number | string)[] = []
  const total = props.totalPages
  const cur = props.currentPage
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else if (cur <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...', total)
  } else if (cur >= total - 3) {
    pages.push(1, '...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1, '...')
    for (let i = cur - 1; i <= cur + 1; i++) pages.push(i)
    pages.push('...', total)
  }
  return pages
}

const startItem = () => (props.currentPage - 1) * props.pageSize + 1
const endItem = () => Math.min(props.currentPage * props.pageSize, props.totalCount)
</script>

<template>
  <div class="pagination">
    <span class="pagination-info">
      {{ t('common.paginationInfo', { start: startItem(), end: endItem(), total: totalCount }) }}
    </span>
    <div class="pagination-controls">
      <button class="page-btn" :disabled="currentPage === 1" @click="handlePrev">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M9 11.5L5 7.5L9 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('common.previousPage') }}
      </button>

      <div class="page-numbers">
        <button
          v-for="(page, i) in getPages()"
          :key="i"
          class="page-num"
          :class="{ active: page === currentPage, ellipsis: page === '...' }"
          :disabled="page === '...'"
          @click="handlePage(page)"
        >
          {{ page }}
        </button>
      </div>

      <button class="page-btn" :disabled="currentPage === totalPages" @click="handleNext">
        {{ t('common.nextPage') }}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M6 3.5L10 7.5L6 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagination { display: flex; align-items: center; justify-content: space-between; padding: 24px 0 8px; gap: 16px; }
.pagination-info { font-size: 13px; color: #737373; white-space: nowrap; }
.pagination-controls { display: flex; align-items: center; gap: 8px; }
.page-btn { display: flex; align-items: center; gap: 5px; padding: 7px 14px; background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 7px; font-size: 13px; font-weight: 500; color: #525252; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
.page-btn:hover:not(:disabled) { background: rgba(0,0,0,0.04); border-color: #2d2d2d; color: #1a1a1a; }
.page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
.page-numbers { display: flex; align-items: center; gap: 4px; }
.page-num { min-width: 34px; height: 34px; padding: 0 6px; background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 7px; font-size: 13px; font-weight: 500; color: #525252; cursor: pointer; transition: all 0.2s ease; }
.page-num:hover:not(:disabled):not(.active) { background: rgba(0,0,0,0.04); border-color: #2d2d2d; color: #1a1a1a; }
.page-num.active { background: #2d2d2d; border-color: #2d2d2d; color: #ffffff; }
.page-num.ellipsis { border: none; background: transparent; cursor: default; color: #a3a3a3; }
@media (max-width: 640px) {
  .pagination { flex-direction: column; align-items: stretch; }
  .pagination-info { text-align: center; }
  .pagination-controls { justify-content: center; flex-wrap: wrap; }
  .page-btn { flex: 1; justify-content: center; }
}
</style>
