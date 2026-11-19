<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import KnowledgeBaseCommunityHeader from '@/components/community/knowledge-base/KnowledgeBaseCommunityHeader.vue'
import KnowledgeBaseCommunityFilterBar from '@/components/community/knowledge-base/KnowledgeBaseCommunityFilterBar.vue'
import SkillPagination from '@/components/community/skills/SkillPagination.vue'
import KnowledgeBaseCommunityCardList from './components/KnowledgeBaseCommunityCardList.vue'
import { useKnowledgeBaseCommunityList } from './hooks/useKnowledgeBaseCommunityList'

const { t } = useI18n()

const {
  loading,
  error,
  items,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  isEmpty,
  isSearchResult,
  fetchList,
  handleSearch,
  handleReset,
  handlePageChange,
} = useKnowledgeBaseCommunityList()

onMounted(() => {
  fetchList()
})
</script>

<template>
  <div class="community-knowledge-page">
    <DashboardHeader />

    <main class="page-main">
      <div class="page-container">
        <KnowledgeBaseCommunityHeader />
        <KnowledgeBaseCommunityFilterBar @search="handleSearch" @reset="handleReset" />

        <div v-if="error && !loading" class="error-banner">
          {{ error }}
          <button type="button" class="retry-btn" @click="handleReset">{{ t('common.retry') }}</button>
        </div>

        <KnowledgeBaseCommunityCardList
          :items="items"
          :loading="loading"
          :is-empty="isEmpty"
          :is-search-result="isSearchResult"
        />

        <SkillPagination
          v-if="!error && totalCount > 0"
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
.community-knowledge-page {
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
  .page-container {
    padding: 24px 16px 0;
  }
}
</style>
