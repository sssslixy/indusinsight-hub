<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { ToolCommunityHeader, ToolFilterBar, SkillPagination, ToolCardList } from './components'
import { useToolCommunityList } from './hooks/useToolCommunityList'

const { t } = useI18n()

const {
  loading,
  error,
  tools,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  isEmpty,
  isSearchResult,
  handleSearch,
  handleReset,
  handlePageChange,
} = useToolCommunityList()
</script>

<template>
  <div class="community-tools-page">
    <DashboardHeader />

    <main class="page-main">
      <div class="page-container">
        <ToolCommunityHeader />
        <ToolFilterBar @search="handleSearch" @reset="handleReset" />

        <div v-if="error && !loading" class="error-banner">
          {{ error }}
          <button class="retry-btn" @click="handleReset">{{ t('common.retry') }}</button>
        </div>

        <ToolCardList
          :tools="tools"
          :loading="loading"
          :is-empty="isEmpty"
          :is-search-result="isSearchResult"
        />

        <SkillPagination
          v-if="!loading && !error && totalCount > 0"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-count="totalCount"
          :page-size="pageSize"
          @page-change="handlePageChange"
        />
      </div>
    </main>

  </div>
</template>

<style scoped>
.community-tools-page {
  min-height: 100vh;
  background: var(--app-color-bg-page);
  display: flex;
  flex-direction: column;
}
.page-main {
  flex: 1;
  padding-top: var(--app-page-top-desktop);
  padding-bottom: var(--app-page-bottom-desktop);
}
.page-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 48px 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  font-size: 14px;
  color: #dc2626;
}
.retry-btn {
  margin-left: auto;
  padding: 4px 13px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 6px;
  font-size: 13px;
  color: #dc2626;
  cursor: pointer;
}
@media (max-width: 768px) {
  .page-main {
    padding-top: var(--app-page-top-mobile);
    padding-bottom: var(--app-page-bottom-mobile);
  }
  .page-container {
    padding: 32px 20px 0;
    gap: 24px;
  }
}
</style>
