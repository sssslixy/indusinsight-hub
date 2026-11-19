<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import multimdTable from 'markdown-it-multimd-table'
import { katex } from '@mdit/plugin-katex'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'
import { useI18n } from 'vue-i18n'

import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { BackButton } from '@/components/base'

import userManualSource from '@/docs/用户手册.md?raw'
import skillStandardSource from '@/docs/Skill标准开发规范.md?raw'
import userManualEnSource from '@/docs/UserManual.en.md?raw'
import skillStandardEnSource from '@/docs/SkillStandard.en.md?raw'

type ManualDocumentId = 'user-manual' | 'skill-standard'

type HeadingItem = {
  id: string
  title: string
  level: number
}

type ManualDocument = {
  id: ManualDocumentId
  title: string
  description: string
  source: string
}

type MarkdownEnv = {
  headingIds?: string[]
}

const { locale, t } = useI18n()

const documents = computed<[ManualDocument, ManualDocument]>(() => {
  const isEnglish = locale.value === 'en-US'
  return [
    {
      id: 'user-manual',
      title: t('manual.userManualTitle'),
      description: t('manual.userManualDesc'),
      source: isEnglish ? userManualEnSource : userManualSource,
    },
    {
      id: 'skill-standard',
      title: t('manual.skillStandardTitle'),
      description: t('manual.skillStandardDesc'),
      source: isEnglish ? skillStandardEnSource : skillStandardSource,
    },
  ]
})

const activeDocumentId = ref<ManualDocumentId>('user-manual')
const activeHeadingId = ref('')
const articleRef = ref<HTMLElement | null>(null)
let headingObserver: IntersectionObserver | null = null
let activeHeadingFrame: number | null = null

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})
  .use(multimdTable)
  .use(katex, {
    throwOnError: false,
    errorColor: '#cc0000',
  })

markdownRenderer.renderer.rules.heading_open = (tokens, idx, options, env: MarkdownEnv, self) => {
  const token = tokens[idx]
  if (!token) return ''

  const id = env.headingIds?.shift()
  if (id) {
    token.attrSet('id', id)
    token.attrJoin('class', 'manual-heading')
  }
  return self.renderToken(tokens, idx, options)
}

markdownRenderer.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (!token) return ''

  const href = token.attrGet('href') || ''
  if (/^https?:\/\//i.test(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return self.renderToken(tokens, idx, options)
}

const normalizeHeadingId = (text: string, index: number, usedIds: Map<string, number>) => {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/`/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || `section-${index + 1}`

  const count = usedIds.get(base) ?? 0
  usedIds.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

const extractHeadings = (source: string): HeadingItem[] => {
  const tokens = markdownRenderer.parse(source, {})
  const usedIds = new Map<string, number>()
  const headings: HeadingItem[] = []

  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') return

    const nextToken = tokens[index + 1]
    const title = nextToken?.type === 'inline' ? nextToken.content.trim() : ''
    if (!title) return

    const level = Number(token.tag.replace('h', ''))
    if (!Number.isFinite(level) || level < 1 || level > 4) return

    headings.push({
      id: normalizeHeadingId(title, headings.length, usedIds),
      title,
      level,
    })
  })

  return headings
}

const activeDocument = computed<ManualDocument>(
  () => documents.value.find((doc) => doc.id === activeDocumentId.value) ?? documents.value[0],
)
const headingItems = computed(() => extractHeadings(activeDocument.value.source))
const mainHeading = computed(
  () => headingItems.value.find((item) => item.level === 1)?.title ?? activeDocument.value.title,
)
const visibleHeadings = computed(() => headingItems.value.filter((item) => item.level >= 2))

const renderedHtml = computed(() => {
  const env: MarkdownEnv = {
    headingIds: headingItems.value.map((item) => item.id),
  }
  const rendered = markdownRenderer.render(activeDocument.value.source, env)
  return DOMPurify.sanitize(rendered, {
    ADD_ATTR: ['target', 'rel', 'id', 'class'],
  })
})

const disconnectHeadingObserver = () => {
  headingObserver?.disconnect()
  headingObserver = null
  if (activeHeadingFrame != null) {
    cancelAnimationFrame(activeHeadingFrame)
    activeHeadingFrame = null
  }
}

const setActiveHeading = (id: string) => {
  if (!id || id === activeHeadingId.value) return
  if (activeHeadingFrame != null) cancelAnimationFrame(activeHeadingFrame)
  activeHeadingFrame = requestAnimationFrame(() => {
    activeHeadingId.value = id
    activeHeadingFrame = null
  })
}

const setupHeadingObserver = () => {
  disconnectHeadingObserver()
  const root = articleRef.value
  if (!root || typeof IntersectionObserver === 'undefined') {
    activeHeadingId.value = visibleHeadings.value[0]?.id ?? headingItems.value[0]?.id ?? ''
    return
  }

  const candidates = visibleHeadings.value.length > 0 ? visibleHeadings.value : headingItems.value
  activeHeadingId.value = candidates[0]?.id ?? ''

  headingObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visibleEntry?.target.id) {
        setActiveHeading(visibleEntry.target.id)
      }
    },
    {
      root,
      rootMargin: '-28px 0px -70% 0px',
      threshold: [0, 1],
    },
  )

  candidates.forEach((heading) => {
    const node = document.getElementById(heading.id)
    if (node) headingObserver?.observe(node)
  })
}

const switchDocument = async (id: ManualDocumentId) => {
  if (activeDocumentId.value === id) return
  activeDocumentId.value = id
  await nextTick()
  articleRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  setupHeadingObserver()
}

const scrollToHeading = (id: string) => {
  const node = document.getElementById(id)
  if (!node) return
  activeHeadingId.value = id
  node.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  () => renderedHtml.value,
  async () => {
    await nextTick()
    setupHeadingObserver()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  disconnectHeadingObserver()
})
</script>

<template>
  <div class="manual-page">
    <DashboardHeader />

    <main class="manual-main">
      <div class="manual-container">
        <section class="manual-layout">
          <aside class="document-panel" :aria-label="t('manual.documentSwitch')">
            <div class="panel-title">{{ t('manual.documents') }}</div>
            <button
              v-for="doc in documents"
              :key="doc.id"
              class="document-tab"
              :class="{ active: activeDocumentId === doc.id }"
              type="button"
              @click="switchDocument(doc.id)"
            >
              <span class="document-icon" aria-hidden="true">
                <svg
                  v-if="doc.id === 'user-manual'"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                >
                  <path
                    d="M4 2.5H12.5C13.3284 2.5 14 3.17157 14 4V15.5H5C4.17157 15.5 3.5 14.8284 3.5 14V3C3.5 2.72386 3.72386 2.5 4 2.5Z"
                    stroke="currentColor"
                    stroke-width="1.4"
                  />
                  <path
                    d="M5 12.5H14"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                  <path
                    d="M6.5 5.5H11M6.5 8H10"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M5.25 2.5H12.75L15 4.75V15.5H3V2.5H5.25Z"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M12.5 2.75V5H14.75"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M6 8H12M6 10.5H12M6 13H9.5"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              <span class="document-text">
                <span class="document-title">{{ doc.title }}</span>
                <span class="document-desc">{{ doc.description }}</span>
              </span>
            </button>
          </aside>

          <aside class="toc-panel" :aria-label="t('manual.toc')">
            <div class="panel-title">{{ t('manual.toc') }}</div>
            <nav v-if="visibleHeadings.length > 0" class="toc-list">
              <button
                v-for="heading in visibleHeadings"
                :key="heading.id"
                class="toc-item"
                :class="[`level-${heading.level}`, { active: activeHeadingId === heading.id }]"
                type="button"
                :title="heading.title"
                @click="scrollToHeading(heading.id)"
              >
                {{ heading.title }}
              </button>
            </nav>
            <div v-else class="toc-empty">{{ t('manual.noHeadings') }}</div>
          </aside>

          <section class="content-panel">
            <header class="content-header">
              <h1 class="content-title">{{ mainHeading }}</h1>
              <BackButton />
            </header>

            <article ref="articleRef" class="manual-article markdown-body" v-html="renderedHtml" />
          </section>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.manual-page {
  height: 100vh;
  background: var(--app-color-bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.manual-main {
  flex: 1;
  padding-top: var(--app-page-top-desktop);
  padding-bottom: 0;
  min-height: 0;
}

.manual-container {
  --manual-panel-height: calc(100vh - var(--app-page-top-desktop) - 48px);

  max-width: 1580px;
  height: 100%;
  margin: 0 auto;
  padding: 24px 40px 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.manual-layout {
  display: grid;
  grid-template-columns: 310px 300px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  min-height: 0;
}

.document-panel,
.toc-panel,
.content-panel {
  position: sticky;
  top: 112px;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  background: #ffffff;
  height: var(--manual-panel-height);
  max-height: var(--manual-panel-height);
  min-height: 420px;
}

.document-panel,
.toc-panel {
  padding: 14px;
}

.panel-title {
  padding: 3px 4px 14px;
  color: #1a1a1a;
  font-size: 15px;
  font-weight: 900;
}

.document-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.toc-panel {
  display: flex;
  flex-direction: column;
}

.content-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-shrink: 0;
  padding: 15px 22px 15px 30px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  background: #ffffff;
}

.content-title {
  min-width: 0;
  margin: 0;
  color: #1a1a1a;
  font-size: 23px;
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-tab {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  padding: 14px;
  color: #3f3f46;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.document-tab:hover {
  background: #fafafa;
  border-color: rgba(0, 0, 0, 0.06);
}

.document-tab.active {
  background: #f5f5f5;
  border-color: rgba(0, 0, 0, 0.1);
  color: #1a1a1a;
}

.document-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #f1f5f9;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.document-tab.active .document-icon {
  background: #2d2d2d;
  color: #ffffff;
}

.document-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.document-title {
  color: inherit;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
}

.document-desc {
  color: #666666;
  font-size: 13px;
  line-height: 1.55;
}

.manual-article {
  min-width: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scroll-behavior: auto;
  contain: content;
  padding: 38px 64px 60px;
}

.toc-list {
  height: calc(100% - 35px);
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scroll-behavior: auto;
}

.toc-item {
  width: 100%;
  min-height: 38px;
  display: block;
  border: 0;
  border-left: 2px solid transparent;
  background: transparent;
  padding: 8px 10px;
  color: #5f6368;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.48;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}

.toc-item:hover {
  color: #1a1a1a;
  background: #fafafa;
}

.toc-item.active {
  color: #1a1a1a;
  border-left-color: #2d2d2d;
  background: #f5f5f5;
}

.toc-item.level-3 {
  padding-left: 22px;
}

.toc-item.level-4 {
  padding-left: 34px;
  font-size: 13px;
}

.toc-empty {
  padding: 18px 4px;
  color: #a3a3a3;
  font-size: 14px;
}

.document-panel,
.toc-list,
.manual-article {
  scrollbar-width: thin;
  scrollbar-color: rgba(115, 115, 115, 0.42) transparent;
}

.document-panel::-webkit-scrollbar,
.toc-list::-webkit-scrollbar,
.manual-article::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.document-panel::-webkit-scrollbar-track,
.toc-list::-webkit-scrollbar-track,
.manual-article::-webkit-scrollbar-track {
  background: transparent;
}

.document-panel::-webkit-scrollbar-thumb,
.toc-list::-webkit-scrollbar-thumb,
.manual-article::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background-color: rgba(115, 115, 115, 0.34);
  background-clip: content-box;
}

.document-panel::-webkit-scrollbar-thumb:hover,
.toc-list::-webkit-scrollbar-thumb:hover,
.manual-article::-webkit-scrollbar-thumb:hover {
  background-color: rgba(82, 82, 82, 0.52);
}

.document-panel::-webkit-scrollbar-corner,
.toc-list::-webkit-scrollbar-corner,
.manual-article::-webkit-scrollbar-corner {
  background: transparent;
}

.markdown-body {
  color: #262626;
  font-size: 16.5px;
  line-height: 1.88;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.markdown-body :deep(.manual-heading) {
  scroll-margin-top: 28px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  color: #1a1a1a;
  letter-spacing: 0;
  line-height: 1.35;
}

.markdown-body :deep(h1) {
  display: none;
}

.markdown-body :deep(h2) {
  margin: 44px 0 18px;
  padding-top: 6px;
  font-size: 25px;
  font-weight: 900;
}

.markdown-body :deep(h3) {
  margin: 32px 0 13px;
  font-size: 20px;
  font-weight: 850;
}

.markdown-body :deep(h4) {
  margin: 26px 0 10px;
  font-size: 17px;
  font-weight: 800;
}

.markdown-body :deep(p) {
  margin: 0 0 18px;
  color: #303030;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 18px 22px;
  padding: 0;
  color: #303030;
}

.markdown-body :deep(li) {
  margin: 7px 0;
  padding-left: 2px;
}

.markdown-body :deep(li::marker) {
  color: #737373;
}

.markdown-body :deep(a) {
  color: #2563eb;
  text-decoration: none;
  font-weight: 650;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(blockquote) {
  margin: 22px 0;
  padding: 14px 18px;
  border-left: 3px solid #64748b;
  border-radius: 0 8px 8px 0;
  background: #f8fafc;
  color: #525252;
}

.markdown-body :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(code) {
  border-radius: 5px;
  background: #f1f5f9;
  padding: 2px 6px;
  color: #334155;
  font-size: 0.92em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.markdown-body :deep(pre) {
  overflow: auto;
  margin: 20px 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: #0f172a;
  padding: 16px 18px;
}

.markdown-body :deep(pre code) {
  display: block;
  background: transparent;
  padding: 0;
  color: #e5e7eb;
  font-size: 13px;
  line-height: 1.72;
}

.markdown-body :deep(table) {
  width: 100%;
  display: block;
  overflow-x: auto;
  margin: 22px 0;
  border-collapse: collapse;
  white-space: nowrap;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
}

.markdown-body :deep(th) {
  background: #f8fafc;
  color: #1a1a1a;
  font-weight: 800;
}

.markdown-body :deep(td) {
  color: #3f3f46;
}

.markdown-body :deep(hr) {
  height: 1px;
  margin: 32px 0;
  border: 0;
  background: rgba(0, 0, 0, 0.08);
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

@media (max-width: 1280px) {
  .manual-layout {
    grid-template-columns: 280px 260px minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .manual-page {
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }

  .manual-main {
    min-height: auto;
    padding-bottom: var(--app-page-bottom-mobile);
  }

  .manual-layout {
    grid-template-columns: 1fr;
  }

  .document-panel,
  .toc-panel,
  .content-panel {
    position: static;
    height: auto;
    min-height: 0;
  }

  .document-panel,
  .toc-panel {
    max-height: 360px;
  }

  .content-panel {
    max-height: none;
  }

  .document-panel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .document-panel .panel-title {
    grid-column: 1 / -1;
  }

  .toc-list {
    max-height: 300px;
  }

  .manual-article {
    max-height: calc(100vh - 230px);
    padding: 32px 28px 40px;
  }
}

@media (max-width: 768px) {
  .manual-main {
    padding-top: var(--app-page-top-mobile);
  }

  .manual-container {
    padding: 24px 18px 0;
  }

  .content-header {
    min-height: 58px;
    padding: 12px 14px 12px 18px;
  }

  .content-title {
    font-size: 18px;
  }

  .document-panel {
    grid-template-columns: 1fr;
  }

  .manual-article {
    padding: 26px 20px 34px;
  }

  .markdown-body {
    font-size: 15px;
  }

  .markdown-body :deep(h1) {
    font-size: 24px;
  }

  .markdown-body :deep(h2) {
    font-size: 20px;
  }
}
</style>
