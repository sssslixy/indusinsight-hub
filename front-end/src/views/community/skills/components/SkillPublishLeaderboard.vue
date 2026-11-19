<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Avatar } from '@/components/base'
import { useSkillPublishLeaderboard } from '../hooks/useSkillPublishLeaderboard'

const { t, locale } = useI18n()
const {
  loading, error, refreshFailed, hasLoaded, entries, total,
  myEntry, revision, refresh, retry,
} = useSkillPublishLeaderboard()
const panelId = `skill-leaderboard-${useId()}`
const scrollArea = ref<HTMLElement | null>(null)
const formatNumber = (value: number) => new Intl.NumberFormat(locale.value).format(value)

watch(revision, async () => {
  await nextTick()
  if (scrollArea.value) scrollArea.value.scrollTop = 0
})
</script>

<template>
  <section class="publish-leaderboard" :aria-labelledby="`${panelId}-title`">
    <header class="leaderboard-header">
      <div class="heading-row">
        <h2 :id="`${panelId}-title`" class="leaderboard-title">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 16V10H7V16M8 16V4H12V16M13 16V7H17V16M2 16.5H18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ t('skillLeaderboard.title') }}
        </h2>
        <button class="refresh-button" type="button" :disabled="loading" :aria-label="t('skillLeaderboard.refresh')" :title="t('skillLeaderboard.refresh')" @click="refresh">
          <svg :class="{ spinning: loading }" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M12.4 5.5A5 5 0 1 0 13 9M12.5 2.5V5.5H9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <p class="leaderboard-subtitle" :title="t('skillLeaderboard.rules')">{{ t('skillLeaderboard.subtitle') }}</p>
      <div class="board-meta">
        <span class="board-label">{{ t('skillLeaderboard.top100') }}</span>
        <span v-if="hasLoaded">{{ t('skillLeaderboard.shownAuthors', { count: formatNumber(entries.length) }) }}</span>
      </div>
      <span :id="`${panelId}-rules`" class="sr-only">{{ t('skillLeaderboard.rules') }}</span>
      <div v-if="error && !loading" class="error-notice" :role="refreshFailed ? 'status' : 'alert'">
        <p>{{ error }}</p>
        <button type="button" class="retry-button" @click="retry">{{ t('skillLeaderboard.retry') }}</button>
      </div>
    </header>

    <div :id="panelId" ref="scrollArea" class="leaderboard-scroll" role="region" tabindex="0" :aria-label="t('skillLeaderboard.scrollList')" :aria-describedby="`${panelId}-rules`" :aria-busy="loading">
      <span v-if="loading" class="sr-only" role="status">{{ t('skillLeaderboard.loading') }}</span>
      <div v-if="!hasLoaded && loading" aria-hidden="true">
        <div v-for="index in 6" :key="index" class="skeleton-entry">
          <span class="skeleton skeleton-avatar"></span>
          <span class="skeleton skeleton-name"></span>
          <span class="skeleton skeleton-count"></span>
        </div>
      </div>
      <template v-else-if="hasLoaded">
        <div v-if="total === 0" class="empty-state">
          <p class="empty-title">{{ t('skillLeaderboard.emptyTitle') }}</p>
          <p>{{ t('skillLeaderboard.emptyDescription') }}</p>
        </div>
        <ol v-else class="ranking-list" :aria-label="t('skillLeaderboard.title')">
          <li v-for="entry in entries" :key="entry.authorId" class="ranking-row" :class="{ 'my-row': entry.isCurrentUser }">
            <span class="rank-badge" :class="{ 'first-rank': entry.rank === 1 }" :aria-label="t('skillLeaderboard.rankValue', { rank: formatNumber(entry.rank) })">{{ formatNumber(entry.rank) }}</span>
            <Avatar :src="entry.avatar" :size="30" decorative :enable-profile-fallback="false" />
            <div class="author-summary">
              <span class="author-name" :title="entry.authorName">{{ entry.authorName }}</span>
              <span v-if="entry.isCurrentUser" class="me-label">{{ t('skillLeaderboard.me') }}</span>
            </div>
            <div class="published-count" :aria-label="t('skillLeaderboard.myPublished', { count: formatNumber(entry.publishedCount) })">
              <strong>{{ formatNumber(entry.publishedCount) }}</strong>
              <span aria-hidden="true">{{ t('skillLeaderboard.countUnit') }}</span>
            </div>
          </li>
        </ol>
        <p v-if="entries.length" class="list-end">{{ t('skillLeaderboard.endOfList') }}</p>
      </template>
    </div>

    <footer class="leaderboard-footer">
      <div v-if="hasLoaded" class="my-ranking" aria-live="polite">
        <div class="my-rank-row">
          <span>{{ t('skillLeaderboard.myRank') }}</span>
          <strong>{{ myEntry ? t('skillLeaderboard.rankValue', { rank: formatNumber(myEntry.rank) }) : t('skillLeaderboard.unranked') }}</strong>
        </div>
        <div class="my-count-row">
          <span>{{ t('skillLeaderboard.myPublished', { count: formatNumber(myEntry?.publishedCount ?? 0) }) }}</span>
          <RouterLink v-if="!myEntry" class="publish-link" to="/skills/create">{{ t('skillLeaderboard.publish') }} <span aria-hidden="true">→</span></RouterLink>
        </div>
      </div>
      <div v-else class="footer-placeholder">{{ t('skillLeaderboard.scrollHint') }}</div>
    </footer>
  </section>
</template>

<style scoped>
.publish-leaderboard { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; min-width: 0; overflow: hidden; border: 1px solid var(--app-color-border-soft); border-radius: var(--app-radius-lg); background: #fff; }
.leaderboard-header { padding: 16px 16px 12px; border-bottom: 1px solid var(--app-color-border-soft); }
.heading-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.leaderboard-title { display: flex; align-items: center; gap: 7px; margin: 0; min-width: 0; font-size: 15px; line-height: 1.4; font-weight: 600; color: var(--app-color-text-primary); }
.leaderboard-title svg { flex-shrink: 0; color: #737373; }
.refresh-button { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 28px; height: 28px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: #737373; cursor: pointer; }
.refresh-button:hover:not(:disabled) { background: #fafafa; border-color: var(--app-color-border-soft); color: #1a1a1a; }
.leaderboard-subtitle { margin: 6px 0 12px; font-size: 11px; line-height: 1.5; color: var(--app-color-text-secondary); }
.board-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #8a8a8a; font-size: 11px; }
.board-label { color: #525252; padding: 2px 7px; border-radius: 4px; background: #f5f5f5; }
.leaderboard-scroll { min-height: 0; overflow-y: auto; overscroll-behavior-y: contain; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: #d4d4d4 transparent; padding: 12px 8px 0 14px; }
.leaderboard-scroll:focus-visible { outline: 2px solid #737373; outline-offset: -3px; border-radius: 4px; }
.ranking-list { list-style: none; padding: 0; margin: 0; }
.ranking-row { display: grid; grid-template-columns: minmax(22px, auto) 30px minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 72px; padding: 12px 10px; border-bottom: 1px solid rgba(0,0,0,.05); }
.ranking-row:last-child { border-bottom: 0; }
.list-end { margin: 0; padding: 12px 0 16px; color: #a3a3a3; font-size: 11px; text-align: center; }
.rank-badge { display: inline-flex; justify-content: center; align-items: center; min-width: 22px; min-height: 24px; padding: 2px; border-radius: 5px; color: #8a8a8a; font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums; }
.first-rank { color: #916a24; background: #faf3e6; }
.author-summary { min-width: 0; }
.author-name { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; color: #333; font-size: 12px; line-height: 1.5; }
.me-label { display: inline-block; margin-top: 3px; padding: 0 4px; border-radius: 3px; background: #eaeaea; color: #737373; font-size: 10px; }
.my-row { background: #f7f7f7; border-radius: 7px; border-bottom-color: transparent; }
.published-count { display: flex; align-items: baseline; justify-content: flex-end; gap: 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.published-count strong { color: #1a1a1a; font-size: 15px; line-height: 1.4; font-weight: 600; }
.published-count > span { color: #8a8a8a; font-size: 10px; }
.leaderboard-footer { padding: 12px 14px 14px; border-top: 1px solid var(--app-color-border-soft); background: #fff; }
button:disabled { opacity: .38; cursor: not-allowed; }
.my-ranking { padding: 10px; border-radius: 7px; background: #f7f7f7; font-size: 11px; color: #737373; }
.my-rank-row, .my-count-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 8px; }
.my-rank-row strong { color: #333; font-size: 13px; font-weight: 600; }
.my-count-row { margin-top: 5px; font-variant-numeric: tabular-nums; }
.publish-link { color: #525252; font-size: 11px; text-decoration: none; }
.publish-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.publish-link:focus-visible { outline: 2px solid #525252; outline-offset: 3px; }
.error-notice { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin: 12px 0 0; padding: 10px; border: 1px solid rgba(239,68,68,.18); border-radius: 8px; color: #c04747; background: #fff8f8; font-size: 11px; line-height: 1.6; }
.error-notice p { margin: 0; }
.retry-button { padding: 3px 10px; border: 1px solid rgba(239,68,68,.25); border-radius: 5px; color: inherit; background: #fff; font-size: 12px; cursor: pointer; }
.empty-state { padding: 34px 6px; color: #8a8a8a; text-align: center; font-size: 12px; line-height: 1.7; }
.empty-state p { margin: 0; }
.empty-state .empty-title { margin-bottom: 8px; color: #525252; font-weight: 500; }
.skeleton-entry { display: flex; align-items: center; gap: 10px; height: 72px; }
.skeleton { background: #f1f1f1; border-radius: 4px; }
.skeleton-avatar { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; }
.skeleton-name { flex: 1; height: 12px; }
.skeleton-count { width: 24px; height: 18px; }
.footer-placeholder { color: #a3a3a3; text-align: center; font-size: 11px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.spinning { animation: leaderboard-spin 1s linear infinite; }
@keyframes leaderboard-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinning { animation: none; } }
</style>
