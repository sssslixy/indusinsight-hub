<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  search: [keyword: string, sort: string]
  reset: []
}>()

const { t } = useI18n()
const searchKeyword = ref('')
const selectedSort = ref('latest')

const sortOptions = [
  { labelKey: 'community.latestPublished', value: 'latest' },
  { labelKey: 'dashboard.sort.mostFavorited', value: 'favorite' },
]

const emitSearch = () => emit('search', searchKeyword.value, selectedSort.value)

const handleReset = () => {
  searchKeyword.value = ''
  selectedSort.value = 'latest'
  emit('reset')
}
</script>

<template>
  <div class="filter-bar">
    <div class="filter-content">
      <div class="search-group">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="17" height="17" viewBox="0 0 17 17" fill="none">
            <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" stroke-width="1.5" />
            <path d="M11 11L14.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            :placeholder="t('dashboard.searchKnowledgeBaseName')"
            @keyup.enter="emitSearch"
          />
        </div>

        <div class="select-wrapper">
          <select v-model="selectedSort" class="filter-select" @change="emitSearch">
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              {{ t(opt.labelKey) }}
            </option>
          </select>
        </div>
      </div>

      <div class="action-group">
        <button type="button" class="search-btn" @click="emitSearch">{{ t('common.search') }}</button>
        <button type="button" class="reset-btn" @click="handleReset">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M12 7.5C12 10.0376 9.98528 12 7.5 12C5.01472 12 3 10.0376 3 7.5C3 5.23858 4.79086 3.35576 7 3.05V4L9.5 2.5L7 1V2.03C4.24386 2.33 2 4.67 2 7.5C2 10.5376 4.46243 13 7.5 13C10.5376 13 13 10.5376 13 7.5H12Z"
              fill="currentColor"
            />
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
  padding: 20px 24px;
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
  gap: 10px;
  min-width: 0;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.search-icon {
  position: absolute;
  left: 13px;
  color: #a3a3a3;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 14px 0 40px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: #a3a3a3;
}

.search-input:focus {
  background: #ffffff;
  border-color: #2d2d2d;
}

.select-wrapper {
  flex-shrink: 0;
}

.filter-select {
  height: 40px;
  padding: 0 32px 0 14px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3.5 5.25L7 8.75L10.5 5.25' stroke='%23737373' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: all 0.2s ease;
  outline: none;
  min-width: 140px;
}

.filter-select:hover {
  border-color: rgba(0, 0, 0, 0.14);
  background-color: #fff;
}

.filter-select:focus {
  border-color: #2d2d2d;
  background-color: #fff;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.search-btn {
  height: 40px;
  padding: 0 20px;
  background: #2d2d2d;
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.search-btn:hover {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
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
    padding: 16px;
  }
  .filter-content {
    flex-direction: column;
    gap: 10px;
  }
  .search-group {
    width: 100%;
    flex-direction: column;
  }
  .search-input-wrapper {
    width: 100%;
  }
  .filter-select {
    width: 100%;
  }
  .select-wrapper {
    width: 100%;
  }
  .action-group {
    width: 100%;
  }
  .search-btn {
    flex: 1;
  }
  .reset-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
