<script setup lang="ts">
import type { TaskHistoryItem } from '@/api/task'
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus'
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  items: TaskHistoryItem[]
  loading: boolean
  detailLoading: boolean
  selectedSessionId: string | null
}>()

const emit = defineEmits<{
  select: [item: TaskHistoryItem]
  newSession: []
  rename: [item: TaskHistoryItem]
  delete: [item: TaskHistoryItem]
}>()

const { t } = useI18n()

const isScrolling = ref(false)
let scrollEndTimer: ReturnType<typeof setTimeout> | null = null

function handleBodyScroll(): void {
  isScrolling.value = true
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer)
  }
  scrollEndTimer = setTimeout(() => {
    isScrolling.value = false
    scrollEndTimer = null
  }, 320)
}

onBeforeUnmount(() => {
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer)
    scrollEndTimer = null
  }
})

function formatLastMessageTime(value?: string | null): string {
  if (!value) return t('workbench.common.noMessage')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('workbench.common.noMessage')

  const now = new Date()
  const isSameYear = date.getFullYear() === now.getFullYear()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  if (isToday) return `${t('workbench.common.today')} ${hh}:${mm}`
  if (isYesterday) return `${t('workbench.common.yesterday')} ${hh}:${mm}`

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return isSameYear ? `${month}-${day} ${hh}:${mm}` : `${date.getFullYear()}-${month}-${day}`
}
</script>

<template>
  <div class="history-sidebar" :class="{ 'history-sidebar--loading': detailLoading }">
    <div class="history-sidebar__new">
      <button class="new-session-btn" type="button" @click="emit('newSession')">
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
    <div
      class="history-sidebar__body"
      :class="{ 'history-sidebar__body--scrolling': isScrolling }"
      @scroll="handleBodyScroll"
    >
      <div v-if="loading && !items.length" class="history-sidebar__hint">{{ t('workbench.history.loading') }}</div>
      <ul v-else-if="items.length" class="history-list">
        <li
          v-for="item in items"
          :key="item.sessionId"
          class="history-item"
          :class="{ 'history-item--active': selectedSessionId === String(item.sessionId) }"
          @click="emit('select', item)"
        >
          <div class="history-item__main">
            <div class="history-item__head">
              <span class="history-item__title" :title="item.sessionTitle || t('workbench.common.unnamedSession')">{{ item.sessionTitle || t('workbench.common.unnamedSession') }}</span>
              <span class="history-item__time">{{ formatLastMessageTime(item.lastMessageAt) }}</span>
              <div class="history-item__actions" @click.stop>
                <ElDropdown
                  class="history-item__dropdown"
                  trigger="hover"
                  :show-timeout="80"
                  :hide-timeout="220"
                  placement="bottom-end"
                  popper-class="history-sidebar-dropdown-popper"
                >
                  <button
                    type="button"
                    class="history-item__more-btn"
                    :aria-label="t('workbench.common.moreActions')"
                    aria-haspopup="menu"
                    @click.stop
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <circle cx="8" cy="3.5" r="1.35" />
                      <circle cx="8" cy="8" r="1.35" />
                      <circle cx="8" cy="12.5" r="1.35" />
                    </svg>
                  </button>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem class="history-dropdown-item history-dropdown-item--rename" @click="emit('rename', item)">
                        <span class="history-dropdown-item__inner">
                          <svg class="history-dropdown-item__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path
                              d="M9.2 3.2l3.6 3.6M10 2.5l3 3L6.2 12.3l-3.1.5.4-3.2L10 2.5z"
                              stroke="currentColor"
                              stroke-width="1.25"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                          {{ t('workbench.common.rename') }}
                        </span>
                      </ElDropdownItem>
                      <ElDropdownItem class="history-dropdown-item history-dropdown-item--danger" @click="emit('delete', item)">
                        <span class="history-dropdown-item__inner">
                          <svg class="history-dropdown-item__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path
                              d="M4 4.5h8M6.5 4.5V3.5a1 1 0 011-1h1a1 1 0 011 1v1M12.5 4.5v8a1 1 0 01-1 1h-7a1 1 0 01-1-1v-8M6.5 7v4.5M9.5 7v4.5"
                              stroke="currentColor"
                              stroke-width="1.25"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                          {{ t('workbench.common.delete') }}
                        </span>
                      </ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </div>
          </div>
        </li>
      </ul>
      <div v-else class="history-sidebar__hint">{{ t('workbench.history.empty') }}</div>
    </div>
  </div>
</template>

<style scoped>
.history-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 0;
  overflow: hidden;
}

.history-sidebar--loading {
  cursor: progress;
}

.history-sidebar__new {
  flex-shrink: 0;
  padding: 12px 12px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.new-session-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid #111827;
  background: #111827;
  color: #ffffff;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.new-session-btn:hover {
  background: #020617;
  border-color: #020617;
}

.history-sidebar__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 10px 10px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.history-sidebar__body::-webkit-scrollbar {
  width: 8px;
}

.history-sidebar__body::-webkit-scrollbar-track {
  background: transparent;
}

.history-sidebar__body::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 999px;
}

.history-sidebar__body--scrolling {
  scrollbar-color: rgba(100, 116, 139, 0.7) transparent;
}

.history-sidebar__body--scrolling::-webkit-scrollbar {
  width: 8px;
}

.history-sidebar__body--scrolling::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.7);
}

.history-sidebar__hint {
  text-align: center;
  color: #6b7280;
  padding: 24px 12px;
  font-size: 14px;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.history-item {
  padding: 8px 10px 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.18s ease;
  margin-bottom: 0;
}

.history-sidebar--loading .history-item {
  pointer-events: none;
}

.history-item:hover {
  background: #eef2f7;
  border-color: rgba(15, 23, 42, 0.08);
}

.history-item--active {
  background: transparent;
  border-color: rgba(17, 24, 39, 0.24);
  box-shadow: none;
}

.history-item--active:hover {
  background: #eef2f7;
}

.history-item__main {
  min-width: 0;
  width: 100%;
}

/* 标题最多 9 字宽；时间占剩余宽度右对齐；更多固定在最右侧，可压在时间上（不压标题） */
.history-item__head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.history-item__title {
  flex: 0 0 auto;
  width: 9em;
  max-width: 9em;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item__time {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.2;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item__actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.history-item:hover .history-item__actions {
  opacity: 1;
}

/* 去掉浏览器 / Element Plus 在触发器上的 focus 轮廓（悬浮三点时出现的黑框） */
.history-item__actions :deep(.history-item__dropdown.el-dropdown),
.history-item__actions :deep(.history-item__dropdown .el-tooltip__trigger) {
  outline: none;
}

.history-item__more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: rgba(248, 250, 252, 0.96);
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  box-shadow: -12px 0 16px -4px rgba(248, 250, 252, 1);
  outline: none;
}

.history-item__more-btn:focus,
.history-item__more-btn:focus-visible {
  outline: none;
  /* 避免焦点环使用额外 box-shadow，保持与常态一致的左侧渐变遮罩 */
  box-shadow: -12px 0 16px -4px rgba(248, 250, 252, 1);
}

.history-item:hover .history-item__more-btn {
  background: rgba(238, 242, 247, 0.98);
  box-shadow: -12px 0 16px -4px rgba(238, 242, 247, 1);
}

.history-item__more-btn:hover {
  background: rgba(15, 23, 42, 0.08);
  color: #111827;
}
</style>

<!-- popper 挂载到 body，需非 scoped 才能命中 popper-class -->
<style>
.history-sidebar-dropdown-popper.el-popper {
  --history-dropdown-bg: #ffffff;
  --history-dropdown-border: rgba(15, 23, 42, 0.1);
  --history-dropdown-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.18), 0 4px 12px -4px rgba(15, 23, 42, 0.08);

  border-radius: 10px !important;
  border: 1px solid var(--history-dropdown-border) !important;
  background: var(--history-dropdown-bg) !important;
  box-shadow: var(--history-dropdown-shadow) !important;
  padding: 5px !important;
  margin-top: 4px !important;
}

.history-sidebar-dropdown-popper .el-dropdown-menu {
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 8px !important;
  background: transparent !important;
  box-shadow: none !important;
  min-width: 140px;
}

.history-sidebar-dropdown-popper .el-dropdown-menu__item {
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 7px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  line-height: 1.35 !important;
  color: #334155 !important;
  transition: background 0.15s ease, color 0.15s ease;
}

.history-sidebar-dropdown-popper .history-dropdown-item__inner {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  box-sizing: border-box;
}

.history-sidebar-dropdown-popper .history-dropdown-item__icon {
  flex-shrink: 0;
  opacity: 0.88;
}

.history-sidebar-dropdown-popper .history-dropdown-item--rename:not(.is-disabled):hover {
  background: #f1f5f9 !important;
  color: #0f172a !important;
}

.history-sidebar-dropdown-popper .history-dropdown-item--rename:not(.is-disabled):hover .history-dropdown-item__icon {
  color: #0f172a;
}

.history-sidebar-dropdown-popper .history-dropdown-item--danger {
  color: #b91c1c !important;
}

.history-sidebar-dropdown-popper .history-dropdown-item--danger .history-dropdown-item__icon {
  color: #dc2626;
}

.history-sidebar-dropdown-popper .history-dropdown-item--danger:not(.is-disabled):hover {
  background: #fef2f2 !important;
  color: #991b1b !important;
}

.history-sidebar-dropdown-popper .history-dropdown-item--danger:not(.is-disabled):hover .history-dropdown-item__icon {
  color: #b91c1c;
}
</style>
