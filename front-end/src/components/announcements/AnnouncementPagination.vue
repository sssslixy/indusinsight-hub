<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  pageChange: [page: number]
}>()
const { t } = useI18n()

const handlePrevPage = () => {
  if (props.currentPage > 1) {
    emit('pageChange', props.currentPage - 1)
  }
}

const handleNextPage = () => {
  if (props.currentPage < props.totalPages) {
    emit('pageChange', props.currentPage + 1)
  }
}

const handlePageClick = (page: number) => {
  if (page !== props.currentPage) {
    emit('pageChange', page)
  }
}

const getPageNumbers = () => {
  const pages: (number | string)[] = []
  const maxVisible = 7

  if (props.totalPages <= maxVisible) {
    for (let i = 1; i <= props.totalPages; i++) {
      pages.push(i)
    }
  } else {
    if (props.currentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(props.totalPages)
    } else if (props.currentPage >= props.totalPages - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = props.totalPages - 4; i <= props.totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = props.currentPage - 1; i <= props.currentPage + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(props.totalPages)
    }
  }

  return pages
}

const startItem = () => {
  return (props.currentPage - 1) * props.pageSize + 1
}

const endItem = () => {
  return Math.min(props.currentPage * props.pageSize, props.totalCount)
}
</script>

<template>
  <div class="pagination">
    <div class="pagination-info">
      {{ t('common.paginationInfo', { start: startItem(), end: endItem(), total: totalCount }) }}
    </div>

    <div class="pagination-controls">
      <button
        class="page-btn prev-btn"
        :disabled="currentPage === 1"
        @click="handlePrevPage"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('common.previousPage') }}
      </button>

      <div class="page-numbers">
        <button
          v-for="(page, index) in getPageNumbers()"
          :key="index"
          class="page-number"
          :class="{
            active: page === currentPage,
            ellipsis: page === '...'
          }"
          :disabled="page === '...'"
          @click="typeof page === 'number' ? handlePageClick(page) : null"
        >
          {{ page }}
        </button>
      </div>

      <button
        class="page-btn next-btn"
        :disabled="currentPage === totalPages"
        @click="handleNextPage"
      >
        {{ t('common.nextPage') }}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
  padding: 32px 0;
  gap: 24px;
}

.pagination-info {
  font-size: 14px;
  color: #737373;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-number {
  min-width: 38px;
  height: 38px;
  padding: 0 8px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-number:hover:not(:disabled):not(.active) {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.page-number.active {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #ffffff;
}

.page-number.ellipsis {
  border: none;
  background: transparent;
  cursor: default;
}

.page-number.ellipsis:hover {
  background: transparent;
}

@media (max-width: 768px) {
  .pagination {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 24px 0;
  }

  .pagination-info {
    text-align: center;
  }

  .pagination-controls {
    flex-direction: column;
    gap: 12px;
  }

  .page-btn {
    width: 100%;
    justify-content: center;
  }

  .page-numbers {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
