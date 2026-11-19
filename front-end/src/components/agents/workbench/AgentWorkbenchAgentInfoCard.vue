<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { WorkbenchAgentInfo } from '@/types/modules/agentWorkbench'
import { AgentExternalAccessTag } from '@/components/business'
import { AgentIcon } from '@/components/base'

const props = withDefaults(
  defineProps<{
    agent: WorkbenchAgentInfo
    /** platform：流程工作台 copy；external：对话式外部服务 copy */
    workspaceVariant?: 'platform' | 'external'
    /** 是否显示已发布/草稿标签（从社区进入时隐藏；不展示版本号） */
    showVersionAndStatus?: boolean
    /** 紧凑样式（侧栏小卡片） */
    compact?: boolean
    /** 是否显示返回 */
    showBack?: boolean
    /** 在无历史侧栏时显示「新建会话」 */
    showNewSession?: boolean
    /** 从社区进入他人的资源时显示收藏 */
    showFavorite?: boolean
    isFavorited?: boolean
    favoriteLoading?: boolean
    /** 使用页顶栏：全宽、操作按钮靠右、名称加大、图标垂直居中 */
    pageTop?: boolean
  }>(),
  {
    workspaceVariant: 'platform',
    showVersionAndStatus: true,
    compact: false,
    showBack: true,
    showNewSession: false,
    showFavorite: false,
    isFavorited: false,
    favoriteLoading: false,
    pageTop: false,
  }
)

const emit = defineEmits<{
  newSession: []
  favorite: []
}>()

const { t } = useI18n()

const router = useRouter()

const iconSize = computed(() => {
  if (props.pageTop) return 56
  return props.compact ? 40 : 52
})

const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/my/agents')
  }
}

/** 简介悬浮层跟随鼠标（避免 ElTooltip 出现在块中间） */
const descTipVisible = ref(false)
const descTipX = ref(0)
const descTipY = ref(0)

const DESC_TIP_OFFSET = 12

function onDescTipEnter(e: MouseEvent) {
  if (!props.agent.description?.trim()) return
  descTipVisible.value = true
  moveDescTip(e)
}

function onDescTipMove(e: MouseEvent) {
  if (!descTipVisible.value) return
  moveDescTip(e)
}

function moveDescTip(e: MouseEvent) {
  descTipX.value = e.clientX + DESC_TIP_OFFSET
  descTipY.value = e.clientY + DESC_TIP_OFFSET
}

function onDescTipLeave() {
  descTipVisible.value = false
}
</script>

<template>
  <div
    class="agent-info-card"
    :class="{
      'agent-info-card--compact': compact,
      'agent-info-card--page-top': pageTop,
    }"
  >
    <div class="agent-info-layout">
      <div class="agent-icon-wrap">
        <AgentIcon
          :src="agent.agentIcon"
          :agent-id="agent.id"
          :size="iconSize"
          enable-edit-fallback
          fallback-source="public"
        />
      </div>

      <!-- 顶栏：名称与标签、简介；操作在右侧 -->
      <template v-if="pageTop">
        <div class="agent-info-column">
          <div class="agent-title-row agent-title-row--page-top">
            <span class="agent-name agent-name--page-top">{{ agent.name }}</span>
            <AgentExternalAccessTag v-if="workspaceVariant === 'external'" :agent="agent" />
            <template v-if="showVersionAndStatus">
              <span
                class="status-tag"
                :class="{
                  'status-tag--published': agent.status === 'published',
                  'status-tag--draft': agent.status === 'draft',
                }"
              >
                {{ agent.statusLabel }}
              </span>
            </template>
          </div>
          <p
            v-if="agent.description"
            class="agent-desc agent-desc--page-top"
            @mouseenter="onDescTipEnter"
            @mousemove="onDescTipMove"
            @mouseleave="onDescTipLeave"
          >
            {{ agent.description }}
          </p>
        </div>
        <div class="agent-info-actions">
          <button
            v-if="showBack"
            class="toolbar-btn toolbar-btn--ghost"
            type="button"
            @click="handleBack"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M12 7.5H3M3 7.5L6.5 4M3 7.5L6.5 11"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ t('workbench.common.back') }}
          </button>
          <button
            v-if="showFavorite"
            class="toolbar-btn toolbar-btn--ghost toolbar-btn--favorite"
            type="button"
            :disabled="favoriteLoading"
            @click="emit('favorite')"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              :class="{ 'icon-filled': isFavorited }"
            >
              <path
                d="M7.5 2L9.2 5.5L13 6L10.2 8.7L10.9 12.5L7.5 10.6L4.1 12.5L4.8 8.7L2 6L5.8 5.5L7.5 2Z"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linejoin="round"
                :fill="isFavorited ? 'currentColor' : 'none'"
              />
            </svg>
            {{ isFavorited ? t('workbench.common.unfavorite') : t('workbench.common.favorite') }}
          </button>
          <button
            v-if="showNewSession"
            class="toolbar-btn toolbar-btn--primary"
            type="button"
            @click="emit('newSession')"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2V12M2 7H12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            {{ t('workbench.common.newSession') }}
          </button>
        </div>
      </template>

      <!-- 非顶栏：沿用原一行内排布 -->
      <template v-else>
        <div class="agent-info-column">
          <div class="agent-title-row">
            <button
              v-if="showBack"
              class="toolbar-btn toolbar-btn--ghost"
              type="button"
              @click="handleBack"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path
                  d="M12 7.5H3M3 7.5L6.5 4M3 7.5L6.5 11"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ t('workbench.common.back') }}
            </button>
            <span class="agent-name">{{ agent.name }}</span>
            <AgentExternalAccessTag v-if="workspaceVariant === 'external'" :agent="agent" />
            <template v-if="showVersionAndStatus">
              <span
                class="status-tag"
                :class="{
                  'status-tag--published': agent.status === 'published',
                  'status-tag--draft': agent.status === 'draft',
                }"
              >
                {{ agent.statusLabel }}
              </span>
            </template>
            <button
              v-if="showFavorite"
              class="toolbar-btn toolbar-btn--ghost toolbar-btn--favorite"
              type="button"
              :disabled="favoriteLoading"
              @click="emit('favorite')"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                :class="{ 'icon-filled': isFavorited }"
              >
                <path
                  d="M7.5 2L9.2 5.5L13 6L10.2 8.7L10.9 12.5L7.5 10.6L4.1 12.5L4.8 8.7L2 6L5.8 5.5L7.5 2Z"
                  stroke="currentColor"
                  stroke-width="1.2"
                  stroke-linejoin="round"
                  :fill="isFavorited ? 'currentColor' : 'none'"
                />
              </svg>
              {{ isFavorited ? t('workbench.common.unfavorite') : t('workbench.common.favorite') }}
            </button>
            <span v-if="showNewSession" class="title-row-spacer" />
            <button
              v-if="showNewSession"
              class="toolbar-btn toolbar-btn--primary"
              type="button"
              @click="emit('newSession')"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2V12M2 7H12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              {{ t('workbench.common.newSession') }}
            </button>
          </div>
          <p
            v-if="agent.description"
            class="agent-desc"
            @mouseenter="onDescTipEnter"
            @mousemove="onDescTipMove"
            @mouseleave="onDescTipLeave"
          >
            {{ agent.description }}
          </p>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <div
        v-if="descTipVisible && agent.description"
        class="agent-desc-follow-tip"
        :style="{ left: descTipX + 'px', top: descTipY + 'px' }"
      >
        {{ agent.description }}
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.agent-info-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 10px;
  padding: 14px 18px;
  flex-shrink: 0;
}

.agent-info-card--page-top {
  width: 100%;
  max-width: none;
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  padding: 16px 32px;
  box-sizing: border-box;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.agent-info-layout {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  width: 100%;
}

.agent-info-card--page-top .agent-info-layout {
  align-items: center;
  gap: 16px;
}

.agent-icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  align-self: center;
}

/* 工作台顶栏：图标略带圆角 */
.agent-icon-wrap :deep(.agent-icon) {
  border-radius: 10px;
}

.agent-info-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.agent-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.agent-title-row--page-top {
  flex-wrap: wrap;
  align-items: baseline;
}

.agent-info-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.title-row-spacer {
  flex: 1;
  min-width: 8px;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
  font-family: inherit;
  border: 1px solid transparent;
  line-height: 1;
}

.agent-info-card:not(.agent-info-card--compact) .toolbar-btn {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
}

.toolbar-btn--ghost {
  background: transparent;
  border-color: rgba(0, 0, 0, 0.11);
  color: #6b7280;
}

.toolbar-btn--ghost:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #374151;
  color: #1f2937;
}

.toolbar-btn--primary {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
}

.toolbar-btn--primary:hover {
  background: #020617;
  border-color: #020617;
}

.toolbar-btn--favorite.icon-filled,
.toolbar-btn--favorite .icon-filled {
  color: #eab308;
}

.toolbar-btn--favorite:disabled {
  opacity: 0.7;
  cursor: wait;
}

.agent-name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  min-width: 0;
}

.agent-name--page-top {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.agent-info-card--compact {
  padding: 12px 14px;
  border-radius: 10px;
}

.agent-info-card--compact .agent-name {
  font-size: 14px;
}

.agent-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  cursor: default;
}

.agent-desc--page-top {
  font-size: 15px;
  line-height: 1.55;
  /* 顶栏：单行省略，限制最大展示宽度，避免长无空格串撑开整行 */
  display: block;
  min-width: 0;
  width: 100%;
  max-width: min(720px, 100%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-info-card--compact .agent-desc {
  font-size: 12px;
}

.status-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-tag--published {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.status-tag--draft {
  background: rgba(0, 0, 0, 0.06);
  color: #6b7280;
}

@media (max-width: 768px) {
  .agent-info-card--page-top {
    padding: 12px 16px;
  }

  .agent-name--page-top {
    font-size: 18px;
  }

  .agent-desc--page-top {
    font-size: 14px;
    max-width: min(100%, 100vw - 120px);
  }
}
</style>

<style>
.agent-desc-follow-tip {
  position: fixed;
  z-index: 5000;
  max-width: min(360px, 86vw);
  padding: 8px 12px;
  background: rgba(17, 24, 39, 0.92);
  color: #f9fafb;
  font-size: 13px;
  line-height: 1.55;
  border-radius: 8px;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
}
</style>
