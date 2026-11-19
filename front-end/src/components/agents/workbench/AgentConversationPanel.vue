<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import multimdTable from 'markdown-it-multimd-table'
import { katex } from '@mdit/plugin-katex'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'
import { useI18n } from 'vue-i18n'
import type { WorkbenchMessage } from '@/types/modules/agentWorkbench'
import { WORKBENCH_STEP_NAME_KEYS } from '@/types/modules/agentWorkbench'

const props = withDefaults(
  defineProps<{
    messages: WorkbenchMessage[]
    exampleQuestions?: string[]
    /** 当前运行线程 ID */
    threadId?: string | null
    /** 是否展示顶部运行信息栏（平台流程用；外部服务隐藏） */
    showTaskPanel?: boolean
    /** 空态与气泡标签：platform 偏分析流程；external 偏通用对话 */
    workspaceVariant?: 'platform' | 'external'
    /** 智能体气泡内小标题，默认「分析结果」 */
    agentBubbleLabel?: string
    /** 当前正在运行的节点状态列表 */
    activeStatuses?: { nodeName: string; label: string }[]
    /** 当前正在流式输出的消息 ID */
    streamingMessageId?: string | null
    /** 仅最新一条实时轨迹文案（与智能体消息行并排展示） */
    runtimeTimeline?: { id: string; label: string; time: string; kind?: string }[]
    /** 消息头展示名：当前用户 */
    userDisplayName?: string
    /** 消息头展示名：当前智能体 */
    agentDisplayName?: string
  }>(),
  {
    showTaskPanel: true,
    workspaceVariant: 'platform',
    agentBubbleLabel: '',
    activeStatuses: () => [],
    streamingMessageId: null,
    runtimeTimeline: () => [],
    userDisplayName: '',
    agentDisplayName: '',
  }
)

const emit = defineEmits<{
  interruptAction: [value: string]
}>()

const { t } = useI18n()

const resolvedUserDisplayName = computed(() => props.userDisplayName?.trim() || t('common.user'))
const resolvedAgentDisplayName = computed(() => props.agentDisplayName?.trim() || t('workbench.common.agent'))

const effectiveBubbleLabel = computed(() => {
  if (props.agentBubbleLabel) return props.agentBubbleLabel
  return props.workspaceVariant === 'external'
    ? t('workbench.conversation.reply')
    : t('workbench.conversation.analysisResult')
})

/** 空态标题：欢迎使用 + 智能体名称 */
const welcomeTitleName = computed(() => {
  return resolvedAgentDisplayName.value
})

const chatEndRef = ref<HTMLDivElement | null>(null)
const chatAreaRef = ref<HTMLDivElement | null>(null)
const shouldFollowStream = ref(true)
/** 父组件整表替换 messages（如加载历史）后的首次条数变化：不自动滚到底 */
const suppressScrollForArrayReplace = ref(false)
let scrollTicking = false
/** 用于流式阶段区分「内容增高导致暂时离底」与「用户主动上滚」 */
const lastChatScrollTop = ref(0)

const isNearBottom = () => {
  const el = chatAreaRef.value
  if (!el) return true
  const threshold = 96
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
}

function scrollChatContainerToBottom() {
  const el = chatAreaRef.value
  if (el) {
    el.scrollTop = el.scrollHeight - el.clientHeight
    lastChatScrollTop.value = el.scrollTop
    return
  }
  chatEndRef.value?.scrollIntoView({ behavior: 'auto' })
}

const scheduleScrollToBottom = () => {
  if (!shouldFollowStream.value) return
  if (scrollTicking) return
  scrollTicking = true
  requestAnimationFrame(() => {
    scrollTicking = false
    scrollChatContainerToBottom()
  })
}

/** 发送消息等场景：无视当前 shouldFollowStream，强制滚到底（双帧等待布局） */
function scrollToBottomForced() {
  shouldFollowStream.value = true
  requestAnimationFrame(() => {
    scrollChatContainerToBottom()
    requestAnimationFrame(() => {
      scrollChatContainerToBottom()
    })
  })
}

const onChatScroll = () => {
  const el = chatAreaRef.value
  if (!el) {
    shouldFollowStream.value = true
    return
  }
  const st = el.scrollTop
  const streaming = Boolean(props.streamingMessageId)

  if (streaming) {
    // 流式时仅 scrollTop 不变 / 被程序拉底却「算离底」是内容增高所致，不能把跟滚关掉
    if (isNearBottom()) {
      shouldFollowStream.value = true
    } else if (st < lastChatScrollTop.value - 4) {
      shouldFollowStream.value = false
    }
  } else {
    shouldFollowStream.value = isNearBottom()
  }
  lastChatScrollTop.value = st
}

watch(
  () => props.streamingMessageId,
  (id) => {
    if (!id) return
    shouldFollowStream.value = true
    nextTick(() => {
      const el = chatAreaRef.value
      lastChatScrollTop.value = el?.scrollTop ?? 0
    })
  },
)

watch(
  () => props.messages,
  (newMsgs, oldMsgs) => {
    if (oldMsgs !== undefined && newMsgs !== oldMsgs) {
      suppressScrollForArrayReplace.value = true
      nextTick(() => {
        if (suppressScrollForArrayReplace.value) {
          suppressScrollForArrayReplace.value = false
        }
      })
    }
  },
  { flush: 'sync' },
)

// 消息条数增加：同数组上增量追加（用户发送、流式占位）一律跟滚；整表替换后的首次变化跳过；大批量插入不跟滚
watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    if (newLen <= oldLen) return
    const delta = newLen - oldLen

    if (suppressScrollForArrayReplace.value) {
      suppressScrollForArrayReplace.value = false
      if (delta > 5) {
        shouldFollowStream.value = false
      }
      return
    }

    if (delta > 5) {
      shouldFollowStream.value = false
      return
    }
    // 同一会话内连续 push：不依赖 isNearBottom（新内容增高瞬间可能误判为未在底部）
    shouldFollowStream.value = true
    nextTick(() => {
      scrollToBottomForced()
    })
  },
  { flush: 'post' },
)

// 运行状态变化时自动滚到底部
watch(
  () => props.activeStatuses.length,
  () => scheduleScrollToBottom(),
  { flush: 'post' }
)

// 流式 token 追加时，按 streamingMessageId 跟踪具体消息，避免末尾插入 interrupt_action 时丢滚动
watch(
  () => {
    const streamId = props.streamingMessageId
    if (!streamId) return ''
    const current = props.messages.find((m) => m.id === streamId)
    return current?.content || ''
  },
  () => {
    scheduleScrollToBottom()
  },
  { flush: 'post' }
)

const stepName = (stepId: string) => {
  const key = WORKBENCH_STEP_NAME_KEYS[stepId]
  return key ? t(key) : stepId
}

const downloadingFileId = ref<number | null>(null)
const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: false,
})
  .use(multimdTable)
  .use(katex, {
    throwOnError: false,
    errorColor: '#cc0000',
  })
markdownRenderer.renderer.rules.link_open = () => ''
markdownRenderer.renderer.rules.link_close = () => ''

const domPurifyKatexConfig: Parameters<typeof DOMPurify.sanitize>[1] = {
  ADD_TAGS: ['math', 'annotation', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mspace', 'mtext', 'menclose', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mtable', 'mtr', 'mtd', 'mlabeledtr', 'msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover'],
  ADD_ATTR: ['class', 'style', 'aria-hidden', 'aria-label', 'role', 'xmlns', 'encoding'],
}

function renderMarkdown(content: string): string {
  const raw = String(content || '').trim()
  if (!raw) return ''
  const source = raw.replace(/\n{3,}/g, '\n\n')
  const rendered = markdownRenderer.render(source)
  const sanitized = DOMPurify.sanitize(rendered, domPurifyKatexConfig)
  const parser = new DOMParser()
  const doc = parser.parseFromString(sanitized, 'text/html')
  doc.querySelectorAll('p').forEach((p) => {
    if (p.querySelector('img, svg, math, table, pre, iframe, video, audio')) return
    if (!p.textContent?.trim()) p.remove()
  })
  doc.querySelectorAll('a').forEach((anchor) => {
    anchor.replaceWith(doc.createTextNode(anchor.textContent || ''))
  })
  doc.querySelectorAll('table').forEach((table) => {
    if (table.parentElement?.classList.contains('markdown-table-wrap')) return
    const wrap = doc.createElement('div')
    wrap.className = 'markdown-table-wrap'
    table.parentNode?.insertBefore(wrap, table)
    wrap.appendChild(table)
  })
  doc.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return
    const btn = doc.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy-btn'
    btn.setAttribute('data-copy-code-btn', 'true')
    btn.setAttribute('aria-label', t('workbench.conversation.copyCode'))
    btn.setAttribute('title', t('workbench.conversation.copyCode'))
    btn.innerHTML =
      '<span class="code-copy-icon code-copy-icon--copy" aria-hidden="true"></span>' +
      '<span class="code-copy-icon code-copy-icon--check" aria-hidden="true"></span>'
    pre.prepend(btn)
  })
  return doc.body.innerHTML
}

function isStreamingAgentMessage(message: WorkbenchMessage): boolean {
  return message.type === 'agent' && message.id === props.streamingMessageId && message.content !== '__thinking__'
}

function renderStreamingText(content: string): string {
  const source = String(content || '').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n')
  return source.trimEnd()
}


async function handleBubbleContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const btn = target?.closest('.code-copy-btn') as HTMLButtonElement | null
  if (!btn) return
  const pre = btn.closest('pre')
  const code = pre?.querySelector('code')
  const text = code?.textContent || ''
  if (!text.trim()) return
  try {
    await navigator.clipboard.writeText(text)
    btn.dataset.copied = 'true'
    btn.setAttribute('aria-label', t('workbench.conversation.copySuccess'))
    btn.setAttribute('title', t('workbench.conversation.copySuccess'))
    setTimeout(() => {
      btn.dataset.copied = 'false'
      btn.setAttribute('aria-label', t('workbench.conversation.copyCode'))
      btn.setAttribute('title', t('workbench.conversation.copyCode'))
    }, 1200)
  } catch {
    btn.dataset.copied = 'false'
    setTimeout(() => {
      btn.setAttribute('aria-label', t('workbench.conversation.copyCode'))
      btn.setAttribute('title', t('workbench.conversation.copyCode'))
    }, 1200)
  }
}

async function handleDownloadOutputFile(file: { id: number; name: string }) {
  if (!file.id || file.id <= 0) return
  try {
    downloadingFileId.value = file.id
    const { downloadTaskFileById } = await import('@/api/task')
    await downloadTaskFileById(file.id, file.name)
  } catch (e) {
    console.error(e)
  } finally {
    downloadingFileId.value = null
  }
}

function userFileDownloadable(file: WorkbenchMessage): boolean {
  return typeof file.fileId === 'number' && file.fileId > 0
}

function onUserFileClick(file: WorkbenchMessage) {
  if (!userFileDownloadable(file) || downloadingFileId.value !== null) return
  const name = file.fileName || file.content || t('workbench.conversation.file')
  void handleDownloadOutputFile({ id: file.fileId!, name })
}

type MessageGroup = {
  primary: WorkbenchMessage
  attachments: WorkbenchMessage[]
}

const groupedMessages = computed<MessageGroup[]>(() => {
  const groups: MessageGroup[] = []

  for (const msg of props.messages) {
    if (msg.type === 'file') {
      const last = groups[groups.length - 1]
      // 将紧邻的文件消息并入上一条用户消息，作为附件
      if (last && last.primary.type === 'user') {
        last.attachments.push(msg)
        continue
      }
      groups.push({ primary: msg, attachments: [] })
    } else {
      groups.push({ primary: msg, attachments: [] })
    }
  }

  return groups
})

/** 当前流式轮次：气泡右侧药丸仅展示 runtimeTimeline（与 workbenchRuntimeLabel 映射一致，不回落到节点栈） */
const streamingSidePillText = computed(() => {
  if (!props.streamingMessageId) return ''
  return props.runtimeTimeline?.[0]?.label?.trim() ?? ''
})

defineExpose({ scrollToBottom: scrollToBottomForced })
</script>

<template>
  <div class="conversation-panel">
    <div ref="chatAreaRef" class="chat-area" @scroll.passive="onChatScroll">
      <!-- 空状态 -->
      <div v-if="!messages.length" class="chat-empty">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect
              x="6"
              y="6"
              width="28"
              height="24"
              rx="6"
              stroke="#d1d5db"
              stroke-width="1.5"
            />
            <path
              d="M12 34L16 30H34"
              stroke="#d1d5db"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 14h16M12 20h12M12 26h8"
              stroke="#d1d5db"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="empty-text">
          <div class="empty-title">{{ t('workbench.conversation.welcome', { name: welcomeTitleName }) }}</div>
          <p v-if="workspaceVariant === 'external'" class="empty-desc">
            {{ t('workbench.conversation.emptyHint') }}
          </p>
        </div>
      </div>

      <!-- 消息流：居中列，避免气泡贴齐屏幕左右边缘 -->
      <template v-else>
        <div class="chat-area__inner">
        <div
          v-for="group in groupedMessages"
          :key="group.primary.id"
          class="message-wrap"
          :class="`message-wrap--${group.primary.type}`"
        >
          <!-- 用户消息 -->
          <template v-if="group.primary.type === 'user'">
            <div class="msg-row msg-row--user">
              <div class="msg-meta msg-meta--user">
                <span class="msg-time">{{ group.primary.timestamp }}</span>
                <span class="msg-role">{{ resolvedUserDisplayName }}</span>
              </div>
              <div class="msg-bubble msg-bubble--user">
                {{ group.primary.content }}
              </div>
              <div
                v-if="group.attachments.length"
                class="attachment-list"
              >
                <div
                  v-for="file in group.attachments"
                  :key="file.id"
                  class="attachment-card"
                  :class="{
                    'attachment-card--clickable': userFileDownloadable(file),
                    'attachment-card--downloading': downloadingFileId === file.fileId,
                  }"
                  :role="userFileDownloadable(file) ? 'button' : undefined"
                  :tabindex="userFileDownloadable(file) ? 0 : undefined"
                  :title="userFileDownloadable(file) ? t('workbench.conversation.clickToDownload') : undefined"
                  @click="onUserFileClick(file)"
                  @keydown.enter.prevent="onUserFileClick(file)"
                >
                  <div class="attachment-icon">
                    <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                      <rect
                        x="2"
                        y="1"
                        width="9"
                        height="11"
                        rx="2"
                        stroke="currentColor"
                        stroke-width="1.2"
                      />
                      <path
                        d="M4 4.5H9M4 6.5H9M4 8.5H7"
                        stroke="currentColor"
                        stroke-width="1.2"
                        stroke-linecap="round"
                      />
                    </svg>
                  </div>
                  <div class="attachment-info">
                    <div class="attachment-name">
                      {{ file.fileName || file.content }}
                    </div>
                    <div
                      v-if="file.fileSize"
                      class="attachment-size"
                    >
                      {{ file.fileSize }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 智能体回复 -->
          <template v-else-if="group.primary.type === 'agent'">
            <div
              class="msg-row msg-row--agent"
              :class="{
                'msg-row--has-traj':
                  group.primary.id === streamingMessageId &&
                  (streamingSidePillText || group.primary.content === '__thinking__'),
              }"
            >
              <div class="msg-meta msg-meta--agent">
                <span class="msg-role">{{ resolvedAgentDisplayName }}</span>
                <span class="msg-time">{{ group.primary.timestamp }}</span>
              </div>
              <div class="msg-agent-body">
                <div
                  v-if="group.primary.content === '__thinking__'"
                  class="msg-bubble msg-bubble--agent msg-bubble--thinking"
                >
                  <span class="thinking-dot" />
                  <span class="thinking-dot" />
                  <span class="thinking-dot" />
                </div>
                <div v-else class="msg-bubble msg-bubble--agent">
                  <div
                    v-if="isStreamingAgentMessage(group.primary)"
                    class="bubble-content bubble-content--streaming"
                  >{{ renderStreamingText(group.primary.content) }}</div>
                  <div
                    v-else
                    class="bubble-content markdown-body"
                    v-html="renderMarkdown(group.primary.content)"
                    @click="handleBubbleContentClick"
                  />
                </div>
                <!-- 最新轨迹：与思考/内容气泡同一行右侧（仅一条） -->
                <div
                  v-if="
                    group.primary.id === streamingMessageId &&
                    (streamingSidePillText || group.primary.content === '__thinking__')
                  "
                  class="msg-traj-pill"
                >
                  <span class="status-spinner" />
                  <span class="msg-traj-pill__text">{{ streamingSidePillText || t('workbench.conversation.preparing') }}</span>
                </div>
              </div>
              <div
                v-if="group.primary.outputFiles?.length"
                class="msg-output-files"
              >
                <div class="msg-output-files__label">{{ t('workbench.conversation.outputFiles') }}</div>
                <ul class="msg-output-files__list">
                  <li
                    v-for="f in group.primary.outputFiles"
                    :key="f.id"
                    class="msg-output-files__item"
                  >
                    <span class="msg-output-files__name">{{ f.name }}</span>
                    <button
                      type="button"
                      class="msg-output-files__btn"
                      :disabled="downloadingFileId !== null || f.id <= 0"
                      @click="handleDownloadOutputFile(f)"
                    >
                      {{
                        downloadingFileId === f.id ? t('workbench.result.downloading') : t('workbench.result.download')
                      }}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </template>

          <!-- 系统执行消息 -->
          <template v-else-if="group.primary.type === 'system'">
            <div class="msg-row msg-row--system">
              <div class="msg-sys-bubble">
                <span class="sys-dot" />
                <span class="sys-text">{{ group.primary.content }}</span>
              </div>
            </div>
          </template>

          <!-- 步骤状态消息 -->
          <template v-else-if="group.primary.type === 'step'">
            <div class="msg-row msg-row--step">
              <div class="msg-step-bubble">
                <span class="step-icon">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <span class="step-text">{{ stepName(group.primary.stepId || '') }}：{{ group.primary.content }}</span>
              </div>
            </div>
          </template>

          <!-- 文件消息（没有主消息时，仍然单独展示） -->
          <template v-else-if="group.primary.type === 'file'">
            <div class="msg-row msg-row--user msg-row--file">
              <div class="msg-meta msg-meta--user">
                <span class="msg-time">{{ group.primary.timestamp }}</span>
                <span class="msg-role">{{ resolvedUserDisplayName }}</span>
              </div>
              <div
                class="msg-bubble msg-bubble--file"
                :class="{
                  'msg-bubble--file-clickable': userFileDownloadable(group.primary),
                  'msg-bubble--file-downloading': downloadingFileId === group.primary.fileId,
                }"
                :role="userFileDownloadable(group.primary) ? 'button' : undefined"
                :tabindex="userFileDownloadable(group.primary) ? 0 : undefined"
                :title="userFileDownloadable(group.primary) ? t('workbench.conversation.clickToDownload') : undefined"
                @click="onUserFileClick(group.primary)"
                @keydown.enter.prevent="onUserFileClick(group.primary)"
              >
                <div class="file-icon">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="2"
                      y="1"
                      width="10"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      stroke-width="1.2"
                    />
                    <path
                      d="M4 4.5H10M4 6.5H10M4 8.5H7"
                      stroke="currentColor"
                      stroke-width="1.2"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>
                <div class="file-info">
                  <div class="file-name">{{ group.primary.fileName || group.primary.content }}</div>
                  <div v-if="group.primary.fileSize" class="file-size">{{ group.primary.fileSize }}</div>
                </div>
              </div>
            </div>
          </template>

          <!-- 错误消息（占位） -->
          <template v-else-if="group.primary.type === 'error'">
            <div class="msg-row msg-row--error">
              <div class="msg-error-bubble">
                <span class="error-icon">!</span>
                <span class="error-text">{{ group.primary.content }}</span>
              </div>
            </div>
          </template>

          <!-- 人机中断操作按钮 -->
          <template v-else-if="group.primary.type === 'interrupt_action'">
            <div class="msg-row msg-row--interrupt">
              <div class="msg-interrupt-bubble">
                <div class="interrupt-hint">{{ group.primary.content }}</div>
                <div v-if="group.primary.actions?.length" class="interrupt-actions">
                  <button
                    v-for="(act, ai) in group.primary.actions"
                    :key="ai"
                    class="interrupt-btn"
                    :class="{
                      'interrupt-btn--primary': act.type === 'primary',
                      'interrupt-btn--danger': act.type === 'danger',
                    }"
                    @click="emit('interruptAction', act.value)"
                  >
                    {{ act.label }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div ref="chatEndRef" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.conversation-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}


.task-panel {
  flex-shrink: 0;
  margin-bottom: 8px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-bottom: none;
  border-radius: 0;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-panel__head {
  padding: 0 4px 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.task-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.task-panel__id {
  white-space: nowrap;
}

.task-panel__placeholder {
  font-size: 13px;
  font-weight: 400;
  color: #9ca3af;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  /* 适度留白，避免整页挤成窄条 */
  padding: 16px clamp(12px, 3vw, 40px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  scrollbar-gutter: stable;
}

.chat-area__inner {
  max-width: min(1400px, 100%);
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-area::-webkit-scrollbar {
  width: 10px;
}

.chat-area::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.06);
  border-radius: 999px;
}

.chat-area::-webkit-scrollbar-thumb {
  background: rgba(55, 65, 81, 0.45);
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.9);
}

.chat-area::-webkit-scrollbar-thumb:hover {
  background: rgba(31, 41, 55, 0.62);
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 24px;
}

.empty-icon {
  color: #9ca3af;
}

.empty-text {
  max-width: 360px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.empty-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.suggest-list {
  margin: 8px 0 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggest-item {
  font-size: 13px;
  color: #6b7280;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  line-height: 1.5;
}

.suggest-item::before {
  content: '•';
  color: #9ca3af;
  margin-right: 4px;
}

.message-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(96%, 1000px);
}

.msg-row--user {
  align-self: flex-end;
  align-items: flex-end;
  /* 相对内容区略靠右，拉开与智能体侧的视觉距离 */
  transform: translateX(4px);
}

.msg-row--agent,
.msg-row--system,
.msg-row--step,
.msg-row--file,
.msg-row--error {
  align-self: flex-start;
}

.msg-row--agent {
  /* 相对内容区略靠左 */
  transform: translateX(-34px);
}

.msg-output-files {
  margin-top: 4px;
  padding: 10px 12px;
  background: #f3f4f6;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  max-width: 100%;
  align-self: flex-start;
}

.msg-output-files__label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
}

.msg-output-files__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg-output-files__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.msg-output-files__name {
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.msg-output-files__btn {
  flex-shrink: 0;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
  cursor: pointer;
  color: #374151;
}

.msg-output-files__btn:hover:not(:disabled) {
  background: #f9fafb;
}

.msg-output-files__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.msg-meta--user {
  align-self: flex-end;
  justify-content: flex-end;
  text-align: right;
}

.msg-meta--agent {
  align-self: flex-start;
}

.msg-role {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
  line-height: 1.2;
}

.msg-time {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  line-height: 1.2;
}

.msg-bubble {
  padding: 14px 18px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.msg-bubble--user {
  background: #111827;
  color: #ffffff;
  border-bottom-right-radius: 6px;
  max-width: 100%;
}

.msg-bubble--agent {
  background: #f9fafb;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-bottom-left-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 100%;
}

.msg-bubble--thinking {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 14px 18px;
}

.thinking-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: dot-pulse 1.2s ease-in-out infinite;
}

.thinking-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-pulse {
  0%,
  80%,
  100% {
    transform: scale(0.65);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.bubble-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.bubble-content {
  color: #111827;
}

.bubble-content.markdown-body {
  white-space: normal;
  word-break: break-word;
  line-height: 1.75;
}

.bubble-content--streaming {
  white-space: pre-wrap;
  line-height: 1.6;
}

.streaming-md-fallback {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.bubble-content > :deep(:first-child) {
  margin-top: 0;
}

.bubble-content > :deep(:last-child) {
  margin-bottom: 0;
}

.bubble-content :deep(h1),
.bubble-content :deep(h2),
.bubble-content :deep(h3),
.bubble-content :deep(h4) {
  margin: 0.85em 0 0.5em;
  line-height: 1.42;
}

.bubble-content :deep(p) {
  margin: 0 0 0.85em;
}

.bubble-content :deep(li) {
  line-height: 1.7;
}

.bubble-content :deep(li + li) {
  margin-top: 0.4em;
}

.bubble-content :deep(p:empty) {
  display: none;
  margin: 0;
}

.bubble-content :deep(ul),
.bubble-content :deep(ol) {
  margin: 0.4em 0 0.75em;
  padding-left: 1.35em;
}

.bubble-content :deep(hr) {
  margin: 1.1em 0;
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.bubble-content :deep(pre) {
  margin: 0.24em 0 0.55em;
  padding: 34px 12px 10px;
  border-radius: 8px;
  background: #0f172a;
  color: #f8fafc;
  overflow-x: auto;
  position: relative;
}

.bubble-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.92em;
}

.bubble-content :deep(.code-copy-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.85);
  color: #e2e8f0;
  border-radius: 6px;
  padding: 0;
  cursor: pointer;
}

.bubble-content :deep(.code-copy-btn:hover) {
  background: rgba(30, 41, 59, 0.92);
}

.bubble-content :deep(.code-copy-icon) {
  position: absolute;
  width: 15px;
  height: 15px;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.bubble-content :deep(.code-copy-btn[data-copied='true'] .code-copy-icon--check),
.bubble-content :deep(.code-copy-btn:not([data-copied='true']) .code-copy-icon--copy) {
  opacity: 1;
  transform: scale(1);
}

.bubble-content :deep(.code-copy-icon--copy) {
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='13' height='13' rx='2'/%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/%3E%3C/svg%3E")
    center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='13' height='13' rx='2'/%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.bubble-content :deep(.code-copy-icon--check) {
  background: #22c55e;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E")
    center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.bubble-content :deep(:not(pre) > code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.bubble-content :deep(a) {
  color: #1d4ed8;
  text-decoration: underline;
}

.bubble-content :deep(.katex-display) {
  overflow-x: auto;
  max-width: 100%;
  padding: 0.25rem 0;
}

.bubble-content :deep(.markdown-table-wrap) {
  margin: 0.35em 0 0.55em;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.bubble-content :deep(.markdown-table-wrap table) {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 0.95em;
  background: #fff;
}

.bubble-content :deep(.markdown-table-wrap th),
.bubble-content :deep(.markdown-table-wrap td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 8px 10px;
  vertical-align: top;
  text-align: left;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.bubble-content :deep(.markdown-table-wrap thead th) {
  background: #eef2f7;
  font-weight: 600;
  color: #111827;
}

.bubble-content :deep(.markdown-table-wrap tbody tr:nth-child(even)) {
  background: rgba(249, 250, 251, 0.9);
}

.msg-sys-bubble,
.msg-step-bubble,
.msg-error-bubble {
  max-width: 80%;
}

/* 文件附件区域：宽度按内容收缩，高度保持居中 */
.attachment-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: max-content;
  max-width: 100%;
  align-self: flex-end;
}

.attachment-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #f5f5f6;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: none;
  width: max-content;
  max-width: 100%;
  box-sizing: border-box;
}

.attachment-card--clickable {
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.attachment-card--clickable:hover {
  background: #ebebed;
  border-color: rgba(0, 0, 0, 0.1);
}

.attachment-card--clickable:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.attachment-card--downloading {
  opacity: 0.75;
  pointer-events: none;
}

.attachment-icon {
  flex-shrink: 0;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attachment-icon svg {
  display: block;
  width: 12px;
  height: 12px;
}

.attachment-info {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.attachment-name {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  line-height: 1.3;
  word-break: break-all;
}

.attachment-size {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.msg-sys-bubble,
.msg-step-bubble,
.msg-file-bubble,
.msg-error-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.msg-sys-bubble {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: #6b7280;
}

.sys-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  flex-shrink: 0;
}

.msg-step-bubble {
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.15);
  color: #374151;
}

.step-icon {
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.msg-bubble--file {
  background: #f3f4f6;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  width: max-content;
  padding: 6px 10px;
}

.msg-bubble--file-clickable {
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.msg-bubble--file-clickable:hover {
  background: #e5e7eb;
  border-color: rgba(0, 0, 0, 0.12);
}

.msg-bubble--file-clickable:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.msg-bubble--file-downloading {
  opacity: 0.75;
  pointer-events: none;
}

.file-icon {
  flex-shrink: 0;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  font-size: 13px;
  word-break: break-all;
}

.file-size {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.msg-error-bubble {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #b91c1c;
}

.error-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-text,
.error-text {
  flex: 1;
  min-width: 0;
}

/* ── 智能体消息体（气泡 + 状态标签水平排列） ── */
.msg-agent-body {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  min-width: 0;
}

.msg-agent-body > .msg-bubble--agent:not(.msg-bubble--thinking) {
  flex: 1;
  min-width: 0;
}

.msg-bubble--thinking {
  flex: 0 0 auto;
}

.msg-row--has-traj {
  max-width: min(98%, 1080px);
}

.msg-traj-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.3;
  color: #2563eb;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.2);
  white-space: nowrap;
  max-width: min(52vw, 320px);
  flex-shrink: 0;
}

.msg-traj-pill__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.status-spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid rgba(37, 99, 235, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 人机中断操作 ── */
.msg-row--interrupt {
  align-self: flex-start;
}

.msg-interrupt-bubble {
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.2);
  max-width: min(100%, 560px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.interrupt-hint {
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
}

.interrupt-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
}

.interrupt-btn {
  flex: 0 0 auto;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  transition: all 0.15s;
  white-space: nowrap;
}

.interrupt-btn:hover {
  background: #f3f4f6;
}

.interrupt-btn--primary {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.interrupt-btn--primary:hover {
  background: #1f2937;
}

.interrupt-btn--danger {
  color: #dc2626;
  border-color: #fca5a5;
}

.interrupt-btn--danger:hover {
  background: #fef2f2;
}
</style>
