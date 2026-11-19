<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  search: [keyword: string, status: string]
  reset: []
}>()

const { t } = useI18n()
const searchKeyword = ref('')
const selectedStatus = ref('all')

const statusOptions = [
  { labelKey: 'common.all', value: 'all' },
  { labelKey: 'common.latest', value: 'latest' },
  { labelKey: 'dashboard.important', value: 'important' },
]

const handleSearch = () => {
  emit('search', searchKeyword.value, selectedStatus.value)
}

const handleReset = () => {
  searchKeyword.value = ''
  selectedStatus.value = 'all'
  emit('reset')
}

const handleKeywordChange = () => {
  emit('search', searchKeyword.value, selectedStatus.value)
}

const handleStatusChange = () => {
  emit('search', searchKeyword.value, selectedStatus.value)
}
</script>

<template>
  <div class="filter-bar">
    <div class="filter-content">
      <div class="search-group">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 12L15.5 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            :placeholder="t('announcementsPage.searchPlaceholder')"
            @input="handleKeywordChange"
            @keyup.enter="handleSearch"
          />
        </div>

        <div class="status-select-wrapper">
          <select
            v-model="selectedStatus"
            class="status-select"
            @change="handleStatusChange"
          >
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ t(option.labelKey) }}
            </option>
          </select>
        </div>
      </div>

      <div class="action-group">
        <button class="reset-btn" @click="handleReset">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13 8C13 10.7614 10.7614 13 8 13C5.23858 13 3 10.7614 3 8C3 5.23858 5.23858 3 8 3C9.87 3 11.5 4.04 12.35 5.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M10 3H13V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ t('common.reset') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 24px;
}

.filter-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: #a3a3a3;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 42px;
  padding: 0 16px 0 44px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
}

.search-input::placeholder {
  color: #a3a3a3;
}

.search-input:focus {
  outline: none;
  background: #ffffff;
  border-color: #2d2d2d;
}

.status-select-wrapper {
  flex-shrink: 0;
}

.status-select {
  height: 42px;
  padding: 0 36px 0 16px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.status-select:hover {
  background-color: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
}

.status-select:focus {
  outline: none;
  background-color: #ffffff;
  border-color: #2d2d2d;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 18px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.reset-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

@media (max-width: 768px) {
  .filter-bar {
    padding: 20px;
  }

  .filter-content {
    flex-direction: column;
    gap: 12px;
  }

  .search-group {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .search-input-wrapper {
    width: 100%;
  }

  .status-select-wrapper {
    width: 100%;
  }

  .status-select {
    width: 100%;
  }

  .action-group {
    width: 100%;
  }

  .reset-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
