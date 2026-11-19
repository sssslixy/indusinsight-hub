<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ pageChange: [page: number] }>()
const { t } = useI18n()

const handlePrev = () => {
  if (props.currentPage > 1) emit('pageChange', props.currentPage - 1)
}

const handleNext = () => {
  if (props.currentPage < props.totalPages) emit('pageChange', props.currentPage + 1)
}

const handleClick = (page: number | string) => {
  if (typeof page === 'number' && page !== props.currentPage) emit('pageChange', page)
}

const pages = (): (number | string)[] => {
  const t = props.totalPages
  const c = props.currentPage
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  if (c <= 4) return [1, 2, 3, 4, 5, '...', t]
  if (c >= t - 3) return [1, '...', t - 4, t - 3, t - 2, t - 1, t]
  return [1, '...', c - 1, c, c + 1, '...', t]
}

const startItem = () => (props.currentPage - 1) * props.pageSize + 1
const endItem = () => Math.min(props.currentPage * props.pageSize, props.totalCount)
</script>

<template>
  <div class="pagination">
    <span class="page-info">
      {{ t('common.paginationInfo', { start: startItem(), end: endItem(), total: totalCount }) }}
    </span>
    <div class="page-controls">
      <button class="page-btn" :disabled="currentPage === 1" @click="handlePrev">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M9.5 12L5.5 7.5L9.5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('common.previousPage') }}
      </button>
      <button
        v-for="(p, i) in pages()"
        :key="i"
        class="page-num"
        :class="{ active: p === currentPage, ellipsis: p === '...' }"
        :disabled="p === '...'"
        @click="handleClick(p)"
      >{{ p }}</button>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="handleNext">
        {{ t('common.nextPage') }}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M5.5 3L9.5 7.5L5.5 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 0;
  gap: 16px;
}

.page-info { font-size: 13px; color: #737373; }

.page-controls { display: flex; align-items: center; gap: 8px; }

.page-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.page-btn:disabled { opacity: 0.38; cursor: not-allowed; }

.page-num {
  min-width: 34px;
  height: 34px;
  padding: 0 6px;
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-num:hover:not(:disabled):not(.active) {
  background: rgba(0,0,0,0.04);
  border-color: #2d2d2d;
}

.page-num.active { background: #2d2d2d; border-color: #2d2d2d; color: #ffffff; }
.page-num.ellipsis { border: none; background: transparent; cursor: default; }

@media (max-width: 768px) {
  .pagination { flex-direction: column; align-items: center; padding: 20px 0; }
}
</style>
