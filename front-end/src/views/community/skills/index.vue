<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { SkillCommunityHeader, SkillFilterBar, SkillPagination, SkillCardList } from './components'
import { useSkillCommunityList } from './hooks/useSkillCommunityList'
import SkillPublishLeaderboard from './components/SkillPublishLeaderboard.vue'

const { t } = useI18n()
const heading = ref<HTMLElement | null>(null)
const headingHeight = ref(102)
let headingObserver: ResizeObserver | undefined

onMounted(() => {
  if (!heading.value || typeof ResizeObserver === 'undefined') return
  // Keep the fixed panel aligned with the filter row when translated headings wrap.
  headingObserver = new ResizeObserver(() => {
    if (heading.value) headingHeight.value = heading.value.getBoundingClientRect().height
  })
  headingObserver.observe(heading.value)
})
onBeforeUnmount(() => headingObserver?.disconnect())

const {
  loading,
  error,
  skills,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  isEmpty,
  isSearchResult,
  handleSearch,
  handleReset,
  handlePageChange,
} = useSkillCommunityList()
</script>

<template>
  <div class="community-skills-page">
    <DashboardHeader />

    <main class="page-main">
      <div class="community-layout" :style="{ '--community-heading-height': `${headingHeight}px` }">
        <div ref="heading" class="community-heading">
          <SkillCommunityHeader />
        </div>
        <aside class="leaderboard-rail" :aria-label="t('skillLeaderboard.title')">
          <SkillPublishLeaderboard class="leaderboard-panel" />
        </aside>
        <div class="catalogue-column">
          <SkillFilterBar @search="handleSearch" @reset="handleReset" />

          <div v-if="error && !loading" class="error-banner">
            {{ error }}
            <button class="retry-btn" @click="handleReset">{{ t('common.retry') }}</button>
          </div>

          <SkillCardList
            :skills="skills"
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
      </div>
    </main>

  </div>
</template>

<style scoped>
.community-skills-page { min-height: 100vh; background: var(--app-color-bg-page); display: flex; flex-direction: column; }
.page-main { flex: 1; padding-top: var(--app-page-top-desktop); padding-bottom: var(--app-page-bottom-desktop); }
.community-layout {
  --community-top-gap: 48px;
  --community-row-gap: 32px;
  --leaderboard-top: calc(var(--app-page-top-desktop) + var(--community-top-gap) + var(--community-heading-height) + var(--community-row-gap));
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  max-width: 1384px;
  margin: 0 auto;
  align-items: start;
  column-gap: 32px;
  row-gap: var(--community-row-gap);
  padding: var(--community-top-gap) 24px 0;
}
.community-heading { grid-column: 2; min-width: 0; }
.leaderboard-rail {
  grid-column: 1;
  grid-row: 2;
  width: 300px;
  height: min(720px, calc(100dvh - var(--leaderboard-top) - 24px));
  min-height: 240px;
  min-width: 0;
  align-self: start;
}
/* The rail reserves its grid column; the panel stays put even at the last page row. */
.leaderboard-panel { position: fixed; top: var(--leaderboard-top); width: inherit; height: inherit; }
.catalogue-column { grid-column: 2; grid-row: 2; display: flex; flex-direction: column; gap: 32px; min-width: 0; container-type: inline-size; container-name: skill-catalogue; }
@container skill-catalogue (max-width: 850px) {
  .catalogue-column :deep(.filter-content) { flex-wrap: wrap; }
  .catalogue-column :deep(.search-group) { display: contents; }
  .catalogue-column :deep(.search-input-wrapper) { flex-basis: 100%; }
  .catalogue-column :deep(.action-group) { margin-left: auto; }
  .catalogue-column :deep(.skill-grid) { grid-template-columns: minmax(0, 1fr); }
}
.error-banner { display: flex; align-items: center; gap: 10px; padding: 13px 18px; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; font-size: 14px; color: #dc2626; }
.retry-btn { margin-left: auto; padding: 4px 13px; background: transparent; border: 1px solid rgba(239,68,68,0.4); border-radius: 6px; font-size: 13px; color: #dc2626; cursor: pointer; }
@media (min-width: 901px) and (max-width: 1199px) {
  .community-layout { --community-top-gap: 32px; --community-row-gap: 24px; grid-template-columns: 280px minmax(0, 1fr); column-gap: 24px; }
  .leaderboard-rail { width: 280px; }
  .catalogue-column { gap: 24px; }
}
@media (max-width: 900px), (max-height: 600px) {
  .community-layout { grid-template-columns: minmax(0, 1fr); max-width: 1100px; margin: 0 auto; padding: 32px 20px 0; gap: 24px; }
  .community-heading, .catalogue-column { grid-column: 1; grid-row: auto; }
  .leaderboard-rail { grid-column: 1; grid-row: auto; position: static; width: 100%; height: 420px; min-height: 0; }
  .leaderboard-panel { position: static; }
  .catalogue-column { gap: 24px; }
}
@media (max-width: 768px) {
  .page-main { padding-top: var(--app-page-top-mobile); padding-bottom: var(--app-page-bottom-mobile); }
}
</style>
