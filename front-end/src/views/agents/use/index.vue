<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import LlmBindingPicker from '@/components/agents/LlmBindingPicker.vue'
import type { LlmBindings } from '@/api/llm'
import { useLlmBindings } from '@/composables/useLlmBindings'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import AgentWorkbenchAgentInfoCard from '@/components/agents/workbench/AgentWorkbenchAgentInfoCard.vue'
import {
  AgentHistorySidebar,
  AgentConversationPanel,
  AgentInputBar,
  InterruptConfirmDialog,
  DeleteSessionDialog,
  RenameSessionDialog,
} from './components'
import { getAgentDetail } from '@/api/agent'
import {
  addFavoriteAgent,
  cancelFavoriteAgent,
  checkFavoriteAgent,
  resolveAgentSourceType,
} from '@/api/myContent'
import {
  runTaskStreamCompat,
  TASK_DATA_FILE_ACCEPT,
  uploadTaskFile,
  resumeTaskStreamCompat,
  getTaskHistory,
  getTaskHistoryDetail,
  getTaskFiles,
  deleteTaskHistorySession,
  renameTaskHistorySession,
} from '@/api/task'
import { sendExternalAgentMessage } from '@/api/externalAgent'
import {
  getUserFacingTaskFailureMessage,
  type RunTaskResponse,
  type TaskStreamEvent,
  type TaskHistoryItem,
  type TaskHistoryDetail,
  type TaskFileItem,
  type PipelineMode,
} from '@/api/task'
import type { WorkbenchMessage, WorkbenchAgentInfo } from '@/types/modules/agentWorkbench'
import {
  buildMessagesFromHistory,
  createMessageId,
  formatClockTime,
  isAutomlOutputBundleName,
  isTaskActuallyCompleted,
} from './hooks/workbenchUtils'
import { mapEventToProgressPillLabel, type ProgressPillContext } from './workbenchRuntimeLabel'

const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

const agentId = computed(() => {
  const id = route.params?.id
  return Array.isArray(id) ? id[0] || '' : (id || '')
})

const fromCommunity = computed(() => route.query?.from === 'community')

const agentInfo = ref<WorkbenchAgentInfo>({
  id: Number(agentId.value) || 0,
  name: '',
  description: '',
  agentIcon: '',
  versionNo: 1,
  status: 'published',
  statusLabel: '',
  sourceType: '',
  source_type: '',
})

const isExternalServiceAgent = computed(
  () => resolveAgentSourceType({ sourceType: agentInfo.value.sourceType }) === 'external_service',
)

const workspaceMessages = computed(() => messages.value)
const currentUserDisplayName = computed(() => userStore.userInfo?.username?.trim() || t('common.user'))
const currentAgentDisplayName = computed(() => agentInfo.value.name?.trim() || t('workbench.common.agent'))

const messages = ref<WorkbenchMessage[]>([])

/** 平台智能体：选择文件后仅本地暂存（含 file），点击发送时再上传并与需求一并提交 */
const uploadedFiles = ref<{ name: string; size: string; path?: string; file?: File; fileId?: number }[]>([])
const inputBarRef = ref<InstanceType<typeof AgentInputBar> | null>(null)

const isSending = ref(false)

const externalUpstreamSessionId = ref<string | null>(null)
const externalStreamingHintShown = ref(false)

const currentSessionId = ref<string | null>(null)
const currentDataPath = ref<string | null>(null)
/** 与后端占位 mixed 消息 id 一致；多文件同轮上传、run 时合并需求正文 */
const draftUserMessageId = ref<number | null>(null)
const currentThreadId = ref<string | null>(null)
const currentRunId = ref<string | null>(null)

const isAwaitingUserChoice = ref(false)
const modelState = useLlmBindings(agentId, currentSessionId, computed(() => isAwaitingUserChoice.value ? currentThreadId.value : null), computed(() => !!agentInfo.value.name && !isExternalServiceAgent.value))

// 当前流式输出的主消息 id，整个 run → (interrupt → resume)* → complete 周期共用同一条
const streamingMessageId = ref<string | null>(null)

const isFavorited = ref(false)
const favoriteLoading = ref(false)
const authorKnown = computed(() => agentInfo.value.id === Number(agentId.value)
  && agentInfo.value.authorId != null && userStore.userInfo?.id != null)
const isMine = computed(() => authorKnown.value
  && String(agentInfo.value.authorId) === String(userStore.userInfo?.id))
const canFavorite = computed(() => fromCommunity.value && authorKnown.value && !isMine.value)
let favoriteRequest = 0
let detailRequest = 0

let streamAbortController: AbortController | null = null
const interruptVisible = ref(false)
const interruptType = ref<string | null>(null)
const interruptPayload = ref<Record<string, unknown> | null>(null)

const deleteSessionDialogVisible = ref(false)
const pendingDeleteSessionItem = ref<TaskHistoryItem | null>(null)
const deleteSessionLoading = ref(false)

const renameSessionDialogVisible = ref(false)
const pendingRenameSessionItem = ref<TaskHistoryItem | null>(null)
const renameSessionLoading = ref(false)
const historyList = ref<TaskHistoryItem[]>([])
const historyLoading = ref(false)
const historyDetailLoading = ref(false)
let historyRequest = 0
let historyRefreshTimer: ReturnType<typeof setTimeout> | null = null

const loading = ref(false)

async function loadHistoryList(options?: { silent?: boolean }) {
  if (isExternalServiceAgent.value) return
  const aid = Number(agentId.value)
  if (!Number.isFinite(aid) || aid <= 0) return
  const silent = options?.silent === true
  if (!silent) historyLoading.value = true
  try {
    const res = await getTaskHistory(aid, 0, 50)
    historyList.value = res.data || []
  } catch (e) {
    console.error(e)
    historyList.value = []
  } finally {
    if (!silent) historyLoading.value = false
  }
}

function scheduleHistoryRefresh() {
  if (isExternalServiceAgent.value) return
  if (historyRefreshTimer) clearTimeout(historyRefreshTimer)
  historyRefreshTimer = setTimeout(() => {
    historyRefreshTimer = null
    // 流式期间频繁刷新历史列表时，避免反复切换左侧“加载中”占位导致闪烁。
    void loadHistoryList({ silent: true })
  }, 120)
}

watch(agentId, (id) => {
  agentInfo.value = {
    ...agentInfo.value,
    id: Number(id) || 0,
    authorId: undefined,
    agentIcon: '',
    sourceType: '',
    source_type: '',
  }
  externalUpstreamSessionId.value = null
  externalStreamingHintShown.value = false
  currentSessionId.value = null
  currentThreadId.value = null
  currentRunId.value = null
  void loadHistoryList()
  void loadAgentDetail()
})

const loadAgentDetail = async () => {
  const request = ++detailRequest
  const idNum = Number(agentId.value)
  if (!Number.isFinite(idNum) || idNum <= 0) return
  try {
    loading.value = true
    const res = await getAgentDetail(idNum)
    if (request !== detailRequest || idNum !== Number(agentId.value)) return
    const d = res?.data
    if (!d) {
      ElMessage.error(t('workbench.messages.agentInfoMissing'))
      return
    }

    const st = (d.sourceType ?? d.source_type ?? '').trim() || 'platform'
    agentInfo.value = {
      id: d.id,
      authorId: d.authorId,
      name: d.agentName || '',
      description: d.agentDescription || '',
      agentIcon: d.agentIcon || '',
      versionNo: 1,
      status: d.status === 2 ? 'published' : 'draft',
      statusLabel: d.status === 2 ? t('workbench.common.published') : t('workbench.common.draft'),
      sourceType: st,
      source_type: st,
    }
  } catch (e: unknown) {
    if (request !== detailRequest) return
    const msg = e instanceof Error ? e.message : t('workbench.messages.agentLoadFailed')
    ElMessage.error(msg)
  } finally {
    if (request === detailRequest) loading.value = false
  }
}

async function loadFavoriteStatus() {
  const request = ++favoriteRequest
  isFavorited.value = false
  favoriteLoading.value = false
  if (!canFavorite.value) return
  const idNum = Number(agentId.value)
  if (!Number.isFinite(idNum) || idNum <= 0) return
  favoriteLoading.value = true
  try {
    const res = await checkFavoriteAgent(idNum)
    if (request === favoriteRequest) isFavorited.value = res?.data === true
  } catch {
    if (request === favoriteRequest) isFavorited.value = false
  } finally {
    if (request === favoriteRequest) favoriteLoading.value = false
  }
}

watch(
  [agentId, fromCommunity, () => agentInfo.value.authorId, () => userStore.userInfo?.id],
  loadFavoriteStatus,
  { immediate: true },
)

async function handleFavorite() {
  if (!canFavorite.value || favoriteLoading.value) return
  const request = favoriteRequest
  const idNum = Number(agentId.value)
  if (!Number.isFinite(idNum) || idNum <= 0) return
  try {
    favoriteLoading.value = true
    if (isFavorited.value) {
      await cancelFavoriteAgent(idNum)
      if (request === favoriteRequest) isFavorited.value = false
    } else {
      await addFavoriteAgent(idNum)
      if (request === favoriteRequest) isFavorited.value = true
    }
  } catch (e) {
    if (request !== favoriteRequest) return
    const err = e as { message?: string }
    console.error(isFavorited.value ? '取消收藏失败:' : '收藏失败:', err?.message)
  } finally {
    if (request === favoriteRequest) favoriteLoading.value = false
  }
}

loadAgentDetail().then(() => {
  void loadHistoryList()
})

/** 运行中的节点状态列表（附着在当前流式消息气泡底部） */
const activeStatuses = ref<{ nodeName: string; label: string }[]>([])
type RuntimeTimelineItem = {
  id: string
  time: string
  label: string
  kind: 'node' | 'status' | 'capability' | 'system'
}
const runtimeTimeline = ref<RuntimeTimelineItem[]>([])
/** 进度药丸文案映射上下文（与 mapEventToProgressPillLabel 同步） */
const progressPillCtx = ref<ProgressPillContext>({ preparingReplyShown: false })

/** 向主流式消息追加文本（首次调用时自动将 __thinking__ 占位清除，并去除起始空行） */
function appendToStreamingMsg(text: string) {
  if (!streamingMessageId.value) return
  const idx = messages.value.findIndex((m) => m.id === streamingMessageId.value)
  if (idx < 0) return
  const prev = messages.value[idx]!
  const prevContent = prev.content === '__thinking__' ? '' : prev.content
  const finalText = prevContent === '' ? text.replace(/^\n+/, '') : text
  messages.value[idx] = { ...prev, type: 'agent', content: prevContent + finalText }
}

function extractChunkText(
  payload: { token?: string; text?: string; content?: string; chunk?: string; delta?: string; message?: string } | null | undefined,
): string {
  return String(payload?.token || payload?.text || payload?.content || payload?.chunk || payload?.delta || payload?.message || '')
}

/**
 * 优先按后端显式语义过滤。visibility=internal 仅用于状态展示，不进主消息。
 * 兼容旧事件（缺 visibility）时，仅过滤 tool_result。
 */
function shouldAcceptAssistantChunk(payload: { role?: string; node?: string; visibility?: string } | null | undefined): boolean {
  const node = String(payload?.node || '').trim()
  if (node.startsWith('trace_')) return false
  const role = String(payload?.role || '').trim().toLowerCase()
  const visibility = String(payload?.visibility || '').trim().toLowerCase()
  if (visibility === 'internal') return false
  if (visibility === 'user') return true
  // 兼容不同后端/网关对 role 的标注差异：流式阶段优先保证文本可见。
  if (!role) return true
  if (role === 'tool_result') return false
  return true
}

/** 流结束时清空运行状态标签与进度药丸 */
function finalizeRunningStatuses() {
  activeStatuses.value = []
  runtimeTimeline.value = []
}

function resetRuntimeMeta() {
  runtimeTimeline.value = []
  progressPillCtx.value = { preparingReplyShown: false }
}

function applyProgressPillFromEvent(evt: TaskStreamEvent) {
  const { labelKey, params, nextCtx } = mapEventToProgressPillLabel(evt, progressPillCtx.value)
  progressPillCtx.value = nextCtx
  if (labelKey) {
    const resolvedParams = { ...(params || {}) }
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (value === '__currentStage__') resolvedParams[key] = t('workbench.runtime.currentStage')
      if (value === '__knowledgeBase__') resolvedParams[key] = t('dashboard.entity.knowledgeBase')
      if (value === '__unknownReason__') resolvedParams[key] = t('workbench.runtime.unknownReason')
      if (value === '__unnamedSkill__') resolvedParams[key] = t('workbench.runtime.unnamedSkill')
      if (value === '__unnamedTool__') resolvedParams[key] = t('workbench.runtime.unnamedTool')
      if (value === '__capability__') resolvedParams[key] = t('workbench.runtime.capability')
      if (key === 'actionKey' && typeof value === 'string') resolvedParams[key] = t(value)
    }
    pushRuntimeTimeline(t(labelKey, resolvedParams), 'status')
  }
}

function pushRuntimeTimeline(label: string, kind: RuntimeTimelineItem['kind'] = 'system') {
  const trimmed = label.trim()
  if (!trimmed) return
  // 仅保留最新一条，在智能体消息行旁展示
  runtimeTimeline.value = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: formatClockTime(),
      label: trimmed,
      kind,
    },
  ]
}

const handleSend = async (text: string, pipelineMode?: PipelineMode) => {
  const content = text.trim()
  if (!content || isSending.value || historyDetailLoading.value || modelState.applying.value) return

  const rawSourceType = (agentInfo.value.sourceType ?? agentInfo.value.source_type ?? '').trim()
  if (!rawSourceType) {
    ElMessage.error(t('workbench.messages.sourceTypeMissing'))
    return
  }

  /** 外部接入：专用 /api/agents/external/{id}/chat */
  if (resolveAgentSourceType(agentInfo.value) === 'external_service') {
    if (!externalStreamingHintShown.value) {
      ElMessage.info(t('workbench.messages.externalNonStreaming'))
      externalStreamingHintShown.value = true
    }
    messages.value.push({ id: createMessageId(), type: 'user', content, timestamp: formatClockTime() })
    if (uploadedFiles.value.length) {
      for (const f of uploadedFiles.value) {
        messages.value.push({ id: createMessageId(), type: 'file', content: f.name, fileName: f.name, fileSize: f.size, timestamp: formatClockTime() })
      }
      uploadedFiles.value = []
    }
    inputBarRef.value?.clearInput?.()
    const extThinkingId = createMessageId()
    streamingMessageId.value = extThinkingId
    messages.value.push({ id: extThinkingId, type: 'agent', content: '__thinking__', timestamp: formatClockTime() })
    if (!currentSessionId.value) {
      currentSessionId.value =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
    try {
      isSending.value = true
      const aid = agentInfo.value.id || Number(agentId.value)
      if (!Number.isFinite(aid) || aid <= 0) throw new Error(t('workbench.messages.invalidAgentId'))
      const res = await sendExternalAgentMessage(aid, {
        taskId: currentSessionId.value as string,
        message: content,
        messageType: 'text',
        externalSessionId: externalUpstreamSessionId.value || undefined,
      })
      const data = res.data
      if (data?.taskId) currentSessionId.value = String(data.taskId)
      if (data?.externalSessionId) externalUpstreamSessionId.value = data.externalSessionId
      const assistantText = (data?.assistantMessage ?? '').trim() || t('workbench.conversation.noReply')
      if (streamingMessageId.value) {
        const idx = messages.value.findIndex((m) => m.id === streamingMessageId.value)
        if (idx >= 0) messages.value[idx] = { ...messages.value[idx]!, type: 'agent', content: assistantText }
        streamingMessageId.value = null
      }
    } catch (e: unknown) {
      const errText = e instanceof Error ? e.message : t('workbench.messages.externalCallFailed')
      ElMessage.error(errText)
      if (streamingMessageId.value) {
        const idx = messages.value.findIndex((m) => m.id === streamingMessageId.value)
        if (idx >= 0) {
          messages.value[idx] = { ...messages.value[idx]!, type: 'error', content: errText }
        } else {
          messages.value.push({ id: createMessageId(), type: 'error', content: errText, timestamp: formatClockTime() })
        }
        streamingMessageId.value = null
      }
    } finally {
      isSending.value = false
    }
    return
  }

  // ─── 平台智能体流式执行 ───────────────────────────────────

  // 每次发送以服务端确认的待处理中断为准。
  let isResumeFlow = false
  let llmBindings: LlmBindings | undefined
  {
    isSending.value = true
    try {
      const checked = await modelState.forSend()
      if (!checked) return
      llmBindings = checked
      // A reopened paused session is resolved by the backend snapshot, not local UI history.
      const preflight = modelState.result.value
      if (preflight?.resumable === true && preflight.resumeThreadId) {
        currentThreadId.value = preflight.resumeThreadId
        isResumeFlow = true
      }
    } catch (e) { ElMessage.error(e instanceof Error ? e.message : '请选择可用模型'); return }
    finally { isSending.value = false }
  }

  // 平台智能体：待发送时才上传附件（与 TaskController.upload 内 ensureSession 对齐）
  if (!isExternalServiceAgent.value) {
    const pending = uploadedFiles.value.filter((f) => f.file)
    if (pending.length) {
      isSending.value = true
      let uploadKey = currentSessionId.value || currentThreadId.value
      if (!uploadKey) {
        const tid =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        currentThreadId.value = tid
        uploadKey = tid
      }
      const aid = agentInfo.value.id || Number(agentId.value)
      if (!Number.isFinite(aid) || aid <= 0) {
        isSending.value = false
        ElMessage.error(t('workbench.messages.invalidAgentId'))
        return
      }
      try {
        for (const item of pending) {
          const file = item.file!
          const res = await uploadTaskFile(uploadKey, aid, file, draftUserMessageId.value)
          const path = res.data?.path || ''
          const sid = res.data?.sessionId ?? res.data?.taskId
          if (sid != null) {
            currentSessionId.value = String(sid)
            uploadKey = currentSessionId.value
          }
          if (res.data?.userMessageId != null) draftUserMessageId.value = res.data.userMessageId
          item.path = path
          if (res.data?.fileId != null && res.data.fileId > 0) item.fileId = res.data.fileId
          currentDataPath.value = path || currentDataPath.value
          delete item.file
        }
        scheduleHistoryRefresh()
      } catch (e) {
        isSending.value = false
        messages.value.push({
          id: createMessageId(),
          type: 'error',
          content: (e as Error).message || t('workbench.messages.uploadDataFailed'),
          timestamp: formatClockTime(),
        })
        return
      }
    }
  }

  // 推送用户消息
  messages.value.push({ id: createMessageId(), type: 'user', content, timestamp: formatClockTime() })

  if (uploadedFiles.value.length) {
    for (const f of uploadedFiles.value) {
      messages.value.push({
        id: createMessageId(),
        type: 'file',
        content: f.name,
        fileName: f.name,
        fileSize: f.size,
        timestamp: formatClockTime(),
        ...(f.fileId != null && f.fileId > 0 ? { fileId: f.fileId } : {}),
      })
    }
    uploadedFiles.value = []
  }
  inputBarRef.value?.clearInput?.()

  if (isResumeFlow) {
    // ── resume：移除中断按钮，新开一个消息框 ──
    messages.value = messages.value.filter((m) => m.type !== 'interrupt_action')
    isAwaitingUserChoice.value = false
    interruptVisible.value = false
    interruptType.value = null
    interruptPayload.value = null
    activeStatuses.value = []
    const resumeMsgId = createMessageId()
    streamingMessageId.value = resumeMsgId
    messages.value.push({ id: resumeMsgId, type: 'agent', content: '__thinking__', timestamp: formatClockTime() })
  } else {
    // ── 非 resume：有历史线程则继续复用；仅在新会话首轮生成线程 ──
    if (!currentThreadId.value) {
      const threadId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      currentThreadId.value = threadId
    }

    const streamMsgId = createMessageId()
    streamingMessageId.value = streamMsgId
    messages.value.push({ id: streamMsgId, type: 'agent', content: '__thinking__', timestamp: formatClockTime() })
  }
  resetRuntimeMeta()
  runtimeTimeline.value = []

  try {
    isSending.value = true
    streamAbortController = new AbortController()

    let streamErrorHandled = false
    let completedAgentMsgId: string | null = null
    let receivedAnyChunk = false

    const onStreamEvent = (evt: TaskStreamEvent) => {
      applyProgressPillFromEvent(evt)

      // pipeline_start → 记录 thread_id
      if (evt.event === 'pipeline_start') {
        const payload = evt.data as TaskStreamEvent['data'] & { thread_id?: string }
        currentThreadId.value = payload.thread_id || currentThreadId.value
      }
      if (evt.event === 'run_context') {
        const payload = evt.data as TaskStreamEvent['data'] & { thread_id?: string; run_id?: string; session_id?: number }
        if (payload.thread_id) currentThreadId.value = payload.thread_id
        if (payload.run_id) currentRunId.value = payload.run_id
        if (payload.session_id != null) {
          currentSessionId.value = String(payload.session_id)
          scheduleHistoryRefresh()
        }
      }

      // ── LLM 流式 token → 直接追加到主消息（全量输出） ──
      if (evt.event === 'llm_chunk' && streamingMessageId.value) {
        const payload = evt.data as TaskStreamEvent['data'] & {
          token?: string
          text?: string
          content?: string
          chunk?: string
          delta?: string
          message?: string
          session_id?: number
          role?: string
          visibility?: string
        }
        if (!shouldAcceptAssistantChunk(payload)) return
        if (payload.session_id != null && !currentSessionId.value) {
          currentSessionId.value = String(payload.session_id)
          scheduleHistoryRefresh()
        }
        const token = extractChunkText(payload)
        if (token.length > 0) {
          receivedAnyChunk = true
          appendToStreamingMsg(token)
        }
      }
      if (evt.event === 'deep_chunk' && streamingMessageId.value) {
        const payload = evt.data as TaskStreamEvent['data'] & {
          token?: string
          text?: string
          content?: string
          chunk?: string
          delta?: string
          message?: string
          session_id?: number
          role?: string
          visibility?: string
        }
        if (!shouldAcceptAssistantChunk(payload)) return
        if (payload.session_id != null && !currentSessionId.value) {
          currentSessionId.value = String(payload.session_id)
          scheduleHistoryRefresh()
        }
        const token = extractChunkText(payload)
        if (token.length > 0) {
          receivedAnyChunk = true
          appendToStreamingMsg(token)
        }
      }
      if (evt.event === 'message' && streamingMessageId.value) {
        const payload = evt.data as TaskStreamEvent['data'] & {
          token?: string
          text?: string
          content?: string
          chunk?: string
          delta?: string
          message?: string
          session_id?: number
          role?: string
          visibility?: string
        }
        if (!shouldAcceptAssistantChunk(payload)) return
        if (payload.session_id != null && !currentSessionId.value) {
          currentSessionId.value = String(payload.session_id)
          scheduleHistoryRefresh()
        }
        const token = extractChunkText(payload)
        if (token.length > 0) {
          receivedAnyChunk = true
          appendToStreamingMsg(token)
        }
      }

      if (evt.event === 'complete') {
        const payload = evt.data as TaskStreamEvent['data'] & { session_id?: number; run_id?: string }
        if (payload.session_id != null) {
          currentSessionId.value = String(payload.session_id)
          scheduleHistoryRefresh()
        }
        if (payload.run_id) currentRunId.value = payload.run_id
      }

      // ── error → 追加到主消息 ──
      if (evt.event === 'error') {
        const payload = evt.data as TaskStreamEvent['data'] & {
          message?: string
          session_id?: number
        }
        if (payload.session_id != null && !currentSessionId.value) {
          currentSessionId.value = String(payload.session_id)
          scheduleHistoryRefresh()
        }
        const errText = String(payload.message || '').trim() || getUserFacingTaskFailureMessage()
        streamErrorHandled = true
        appendToStreamingMsg(`\n\n${errText}`)
      }
      if (evt.event === 'interrupt') {
        const payload = evt.data as TaskStreamEvent['data'] & { session_id?: number; run_id?: string }
        if (payload.session_id != null) {
          currentSessionId.value = String(payload.session_id)
          scheduleHistoryRefresh()
        }
        if (payload.run_id) currentRunId.value = payload.run_id
      }
    }

    const streamSignal = streamAbortController?.signal
    const draftForRun = draftUserMessageId.value ?? undefined

    const res = isResumeFlow
      ? await resumeTaskStreamCompat(currentThreadId.value as string, content, { onEvent: onStreamEvent, signal: streamSignal })
      : await runTaskStreamCompat(
          {
            taskId: currentThreadId.value as string,
            sessionId: currentSessionId.value ? Number(currentSessionId.value) : undefined,
            agentId: agentInfo.value.id,
            userRequirement: content,
            dataPath: currentDataPath.value || undefined,
            draftUserMessageId: draftForRun,
            pipelineMode,
            llmBindings,
          },
          { onEvent: onStreamEvent, signal: streamSignal },
        )

    draftUserMessageId.value = null

    const data = res.data as RunTaskResponse
    const ok = data?.success || false
    const hasInterrupt = !!data?.interrupt
    const hasPipelineError = data?.pipeline_error != null && String(data.pipeline_error).trim() !== ''
    if (data?.sessionId != null) currentSessionId.value = String(data.sessionId)
    if (data?.runId) currentRunId.value = data.runId

    if (streamErrorHandled && !ok && !hasInterrupt) {
      currentThreadId.value = null
      currentRunId.value = null
      isAwaitingUserChoice.value = false
      finalizeRunningStatuses()
      streamingMessageId.value = null
    } else if (hasPipelineError) {
      currentThreadId.value = null
      currentRunId.value = null
      isAwaitingUserChoice.value = false
      const terminatedText =
        String(data.message || '').trim() || getUserFacingTaskFailureMessage()
      appendToStreamingMsg(`\n\n${terminatedText}`)
      finalizeRunningStatuses()
      streamingMessageId.value = null
    } else if (hasInterrupt) {
      const raw: any = data.interrupt
      const payload = raw?.value?.value || raw?.value || raw

      currentThreadId.value = data?.thread_id || null
      isAwaitingUserChoice.value = true
      interruptType.value = data?.interrupt_type || null
      interruptPayload.value = payload && typeof payload === 'object' ? payload : null

      // interrupt message 已由后端以 llm_chunk 流式推送，此处不再重复追加

      const complexTypes = new Set(['target_column', 'scoring_metric', 'champion_model'])
      const needsDialog = complexTypes.has(data?.interrupt_type || '')

      const actions: { label: string; value: string; type?: 'primary' | 'default' | 'danger' }[] = [
        { label: t('workbench.interrupt.agree'), value: 'yes', type: 'primary' },
      ]
      if (needsDialog) actions.push({ label: t('workbench.interrupt.customChoice'), value: '__open_dialog__', type: 'default' })
      actions.push({ label: t('workbench.interrupt.cancelTask'), value: 'cancel', type: 'danger' })

      messages.value.push({
        id: createMessageId(),
        type: 'interrupt_action',
        content: t('workbench.interrupt.continueHint'),
        timestamp: formatClockTime(),
        interruptType: data?.interrupt_type || undefined,
        interruptData: payload && typeof payload === 'object' ? payload : undefined,
        actions,
      })
      // streamingMessageId 不清空，resume 后继续追加
    } else {
      isAwaitingUserChoice.value = false
      interruptVisible.value = false
      interruptType.value = null
      interruptPayload.value = null

      const completed = isTaskActuallyCompleted(data)
      if (completed) {
        appendToStreamingMsg(`\n\n${t('workbench.messages.taskCompleted')}`)
      } else if (hasPipelineError || (data?.pipeline_error && String(data.pipeline_error).trim())) {
        appendToStreamingMsg(
          `\n\n${String(data?.message || '').trim() || getUserFacingTaskFailureMessage()}`,
        )
      } else if (!ok && data?.message && data.message !== 'failed') {
        appendToStreamingMsg(`\n\n${data.message}`)
      } else if (!ok) {
        appendToStreamingMsg(`\n\n${t('workbench.messages.serverDisconnected')}`)
        } else if (!receivedAnyChunk && streamingMessageId.value) {
          const idx = messages.value.findIndex((m) => m.id === streamingMessageId.value)
          const current = idx >= 0 ? (messages.value[idx]?.content || '') : ''
          if (current === '__thinking__' || current.trim() === '') {
            const fallback = (data?.message || '').trim() || t('workbench.messages.emptyResponse')
            appendToStreamingMsg(fallback)
          }
      }
      completedAgentMsgId = streamingMessageId.value
      finalizeRunningStatuses()
      streamingMessageId.value = null
    }

    if (!hasPipelineError) {
      if (data?.thread_id) currentThreadId.value = data.thread_id
      const completed = isTaskActuallyCompleted(data)
      if (completed) {
        const sessionId = currentSessionId.value
        if (sessionId) {
          getTaskFiles(sessionId)
            .then((res) => {
              const list = (res.data || []) as TaskFileItem[]
              const outputs = list
                .filter(
                  (f) => f.fileRole === 'output' && isAutomlOutputBundleName(f.originFileName),
                )
                .map((f) => ({ id: f.id, name: f.originFileName || t('workbench.conversation.file') }))
              if (completedAgentMsgId && outputs.length) {
                const idx = messages.value.findIndex((m) => m.id === completedAgentMsgId)
                if (idx >= 0) {
                  messages.value[idx] = { ...messages.value[idx]!, outputFiles: outputs }
                }
              }
            })
            .catch(() => {
              if (Array.isArray(data.deliverables) && data.deliverables.length > 0) {
                const outputs = data.deliverables
                  .filter((d) => d.key === 'deployment_zip' || isAutomlOutputBundleName(d.name))
                  .map((d) => ({ id: Number(d.key) || 0, name: d.name }))
                  .filter((x) => x.id > 0)
                if (completedAgentMsgId && outputs.length) {
                  const idx = messages.value.findIndex((m) => m.id === completedAgentMsgId)
                  if (idx >= 0) {
                    messages.value[idx] = { ...messages.value[idx]!, outputFiles: outputs }
                  }
                }
              }
            })
        }
      }
    }
    scheduleHistoryRefresh()
  } catch (e: any) {
    if (e?.name === 'AbortError') return
    const errText = e?.message || t('workbench.messages.taskStartFailed')
    if (streamingMessageId.value) {
      appendToStreamingMsg(`\n\n${errText}`)
    } else {
      messages.value.push({ id: createMessageId(), type: 'error', content: errText, timestamp: formatClockTime() })
    }
    finalizeRunningStatuses()
    streamingMessageId.value = null
  } finally {
    isSending.value = false
    streamAbortController = null
  }
}

function handleInterruptConfirm(choice: string) {
  interruptVisible.value = false
  handleSend(choice || 'yes')
}

function handleInterruptCancel() {
  interruptVisible.value = false
  handleSend('cancel')
}

/** 内联中断按钮点击处理 */
function handleInlineInterruptAction(value: string) {
  if (value === '__open_dialog__') {
    interruptVisible.value = true
    return
  }
  handleSend(value)
}

const handleUploadFile = async (file: File) => {
  const aid = agentInfo.value?.id || Number(agentId.value)
  if (!Number.isFinite(aid) || aid <= 0) return

  if (!isExternalServiceAgent.value) {
    uploadedFiles.value.push({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      file,
    })
    return
  }

  const uploadKey =
    currentSessionId.value ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  try {
    const res = await uploadTaskFile(uploadKey, aid, file, draftUserMessageId.value)
    const path = res.data?.path || ''
    const sessionId = res.data?.sessionId ?? res.data?.taskId
    if (sessionId != null) currentSessionId.value = String(sessionId)
    if (res.data?.userMessageId != null) draftUserMessageId.value = res.data.userMessageId
    scheduleHistoryRefresh()
    currentDataPath.value = path || currentDataPath.value
    uploadedFiles.value.push({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      path,
      ...(res.data?.fileId != null && res.data.fileId > 0 ? { fileId: res.data.fileId } : {}),
    })
  } catch (e) {
    messages.value.push({
      id: createMessageId(),
      type: 'error',
      content: (e as Error).message || t('workbench.messages.uploadDataFailed'),
      timestamp: formatClockTime(),
    })
  }
}

const handleRemoveFile = (index: number) => {
  uploadedFiles.value.splice(index, 1)
}

function resetWorkbenchSessionState() {
  historyRequest++
  historyDetailLoading.value = false
  if (streamAbortController) {
    streamAbortController.abort()
    streamAbortController = null
  }
  messages.value = []
  uploadedFiles.value = []
  externalUpstreamSessionId.value = null
  currentSessionId.value = null
  currentDataPath.value = null
  draftUserMessageId.value = null
  currentThreadId.value = null
  currentRunId.value = null
  isAwaitingUserChoice.value = false
  streamingMessageId.value = null
  resetRuntimeMeta()
  runtimeTimeline.value = []
}

const handleNewSession = async () => {
  resetWorkbenchSessionState()
  void loadHistoryList({ silent: true })
}

const handleRenameHistory = (item: TaskHistoryItem) => {
  const key = item.sessionId ?? item.taskId
  if (key == null || String(key).trim() === '') return
  pendingRenameSessionItem.value = item
  renameSessionDialogVisible.value = true
}

const handleRenameSessionCancel = () => {
  renameSessionDialogVisible.value = false
  pendingRenameSessionItem.value = null
}

const handleRenameSessionConfirm = async (newTitle: string) => {
  const item = pendingRenameSessionItem.value
  if (item == null) return
  const key = item.sessionId ?? item.taskId
  if (key == null || String(key).trim() === '') {
    handleRenameSessionCancel()
    return
  }
  renameSessionLoading.value = true
  try {
    await renameTaskHistorySession(String(key), newTitle)
    ElMessage.success(t('workbench.messages.renamed'))
    renameSessionDialogVisible.value = false
    pendingRenameSessionItem.value = null
    await loadHistoryList({ silent: true })
  } catch (e) {
    const err = e as { message?: string }
    ElMessage.error(err?.message || t('workbench.messages.renameFailed'))
  } finally {
    renameSessionLoading.value = false
  }
}

const handleDeleteHistory = (item: TaskHistoryItem) => {
  const key = item.sessionId ?? item.taskId
  if (key == null || String(key).trim() === '') return
  pendingDeleteSessionItem.value = item
  deleteSessionDialogVisible.value = true
}

const handleDeleteSessionCancel = () => {
  deleteSessionDialogVisible.value = false
  pendingDeleteSessionItem.value = null
}

const handleDeleteSessionConfirm = async () => {
  const item = pendingDeleteSessionItem.value
  if (item == null) return
  const key = item.sessionId ?? item.taskId
  if (key == null || String(key).trim() === '') {
    handleDeleteSessionCancel()
    return
  }
  deleteSessionLoading.value = true
  try {
    await deleteTaskHistorySession(String(key))
    ElMessage.success(t('workbench.messages.deletedSession'))
    deleteSessionDialogVisible.value = false
    pendingDeleteSessionItem.value = null
    if (currentSessionId.value === String(key)) {
      resetWorkbenchSessionState()
    }
    await loadHistoryList({ silent: true })
  } catch (e) {
    const err = e as { message?: string }
    ElMessage.error(err?.message || t('workbench.messages.deleteFailed'))
  } finally {
    deleteSessionLoading.value = false
  }
}

const handleSelectHistory = async (item: TaskHistoryItem) => {
  if (item == null || isSending.value) return
  const historyKey = item.sessionId ?? item.taskId
  if (historyKey == null || String(historyKey).trim() === '') return
  const ticket = ++historyRequest
  historyDetailLoading.value = true
  try {
    const res = await getTaskHistoryDetail(String(historyKey))
    if (ticket !== historyRequest) return
    const detail: TaskHistoryDetail | undefined = res.data
    if (!detail?.task) {
      ElMessage.error(res.message || t('workbench.messages.emptyHistoryDetail'))
      return
    }
    isAwaitingUserChoice.value = false
    currentSessionId.value = String(detail.task.sessionId)
    currentThreadId.value = detail.task.threadId || null
    currentRunId.value = detail.task.runId || null
    externalUpstreamSessionId.value = null
    draftUserMessageId.value = null
    messages.value = buildMessagesFromHistory(detail.messages, detail.files, t('workbench.conversation.file'))
    resetRuntimeMeta()
    runtimeTimeline.value = []
  } catch (e) {
    console.error(e)
    if (ticket === historyRequest) ElMessage.error(t('workbench.messages.loadHistoryFailed'))
  } finally {
    if (ticket === historyRequest) historyDetailLoading.value = false
  }
}

onBeforeUnmount(() => {
  detailRequest++
  favoriteRequest++
  historyRequest++
  if (historyRefreshTimer) {
    clearTimeout(historyRefreshTimer)
    historyRefreshTimer = null
  }
  if (streamAbortController) {
    streamAbortController.abort()
    streamAbortController = null
  }
})
</script>

<template>
  <div class="agent-use-page">
    <main class="page-main">
      <AgentWorkbenchAgentInfoCard
        page-top
        class="workbench-page-agent"
        :agent="agentInfo"
        :workspace-variant="isExternalServiceAgent ? 'external' : 'platform'"
        :show-version-and-status="!fromCommunity"
        :show-new-session="isExternalServiceAgent"
        :show-favorite="canFavorite"
        :is-favorited="isFavorited"
        :favorite-loading="favoriteLoading"
        @new-session="handleNewSession"
        @favorite="handleFavorite"
      />

      <div class="page-container">
        <div
          class="workbench-layout"
          :class="{ 'workbench-layout--external': isExternalServiceAgent }"
        >
          <!-- 左侧：历史会话（仅平台原生） -->
          <aside v-if="!isExternalServiceAgent" class="workbench-sidebar">
            <AgentHistorySidebar
              :items="historyList"
              :loading="historyLoading"
              :detail-loading="historyDetailLoading"
              :selected-session-id="currentSessionId"
              @select="handleSelectHistory"
              @new-session="handleNewSession"
              @rename="handleRenameHistory"
              @delete="handleDeleteHistory"
            />
          </aside>

          <section class="workbench-center">
            <div class="center-card">
              <div class="center-card__scroll">
                <AgentConversationPanel
                  :messages="workspaceMessages"
                  :user-display-name="currentUserDisplayName"
                  :agent-display-name="currentAgentDisplayName"
                  :thread-id="currentThreadId"
                  :runtime-timeline="runtimeTimeline"
                  :show-task-panel="!isExternalServiceAgent"
                  :workspace-variant="isExternalServiceAgent ? 'external' : 'platform'"
                  :active-statuses="activeStatuses"
                  :streaming-message-id="streamingMessageId"
                  @interrupt-action="handleInlineInterruptAction"
                />
              </div>
              <div class="center-card__input">
                <AgentInputBar
                  ref="inputBarRef"
                  :disabled="isSending"
                  :uploaded-files="uploadedFiles"
                  :placeholder="
                    isExternalServiceAgent ? t('workbench.input.externalPlaceholder') : t('workbench.input.placeholder')
                  "
                  :upload-accept="
                    isExternalServiceAgent ? '*' : TASK_DATA_FILE_ACCEPT
                  "
                  :show-pipeline-mode-switch="!isExternalServiceAgent"
                  :send-fallback-with-files-only="
                    isExternalServiceAgent
                      ? t('workbench.input.externalFileOnlyFallback')
                      : t('workbench.input.fileOnlyFallback')
                  "
                  @send="handleSend"
                  @upload-file="handleUploadFile"
                  @remove-file="handleRemoveFile"
                >
                  <template #before-send>
                    <LlmBindingPicker v-if="!isExternalServiceAgent" :agent-id="agentId" :result="modelState.result.value" :application-result="modelState.applicationResult.value" :application-error="modelState.applicationError.value" :models="modelState.models.value" :error="modelState.error.value" :models-error="modelState.modelsError.value" :checking="modelState.checking.value" :refreshing="modelState.refreshing.value" :applying="modelState.applying.value" :disabled="isSending" v-model:open="modelState.dialogOpen.value" @check="modelState.check()" @refresh="modelState.refreshModels()" @apply="modelState.apply" />
                  </template>
                </AgentInputBar>
              </div>
            </div>
          </section>
        </div>
      </div>

      <InterruptConfirmDialog
        :visible="interruptVisible"
        :interrupt-type="interruptType"
        :interrupt="interruptPayload"
        @confirm="handleInterruptConfirm"
        @cancel="handleInterruptCancel"
      />

      <DeleteSessionDialog
        :visible="deleteSessionDialogVisible"
        :session-title="pendingDeleteSessionItem?.sessionTitle?.trim() || t('workbench.common.unnamedSession')"
        :confirm-loading="deleteSessionLoading"
        @confirm="handleDeleteSessionConfirm"
        @cancel="handleDeleteSessionCancel"
      />

      <RenameSessionDialog
        :visible="renameSessionDialogVisible"
        :initial-title="(pendingRenameSessionItem?.sessionTitle || '').trim() || t('workbench.common.unnamedSession')"
        :confirm-loading="renameSessionLoading"
        @confirm="handleRenameSessionConfirm"
        @cancel="handleRenameSessionCancel"
      />
    </main>
  </div>
</template>

<style scoped>
.agent-use-page {
  height: 100vh;
  background: var(--app-color-bg-workbench);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-main {
  width: 100%;
  flex: 1;
  min-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-container {
  width: 100%;
  max-width: none;
  margin: 0;
  /* 与顶栏紧贴；底部不再预留空隙，避免露出一条工作台底色横带 */
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.workbench-page-agent {
  flex-shrink: 0;
  width: 100%;
  align-self: stretch;
}

.workbench-layout {
  width: 100%;
  display: grid;
  /* 约 9em 标题 + 时间 + 内边距；与侧栏内 .history-item__title 的 9em 对齐 */
  grid-template-columns: minmax(232px, 248px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  align-items: stretch;
  align-content: stretch;
  flex: 1;
  min-height: 0;
  overflow: visible;
}

.workbench-layout--external {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

.workbench-sidebar {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 历史会话：顶栏已有底边，此处无上边；与聊天区仅一条竖线；占满格高，内部列表滚动 */
.workbench-sidebar :deep(.history-sidebar) {
  flex: 1;
  min-height: 0;
  border-radius: 0;
  border: none;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}

.workbench-sidebar :deep(.history-sidebar__overlay) {
  border-radius: 0;
}

.workbench-center {
  min-width: 0;
  width: 100%;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.center-card {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border: none;
  /* 与右侧贴齐；与历史区之间仅靠侧栏右边线分隔 */
  border-radius: 0;
  display: flex;
  flex-direction: column;
  /* 允许底部输入条阴影露出 */
  overflow: visible;
  flex: 1;
  min-height: 0;
}

.workbench-layout--external .center-card {
  border-radius: 0;
}

.center-card__scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.center-card__scroll > :deep(.conversation-panel) {
  flex: 1;
  min-height: 0;
}

.center-card__input {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 24px 32px;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

@media(max-width:768px) { .center-card__input { padding:12px 16px 24px; } }

.center-card__input :deep(.input-bar) {
  width: 100%;
  max-width: 960px;
  min-width: 0;
  box-sizing: border-box;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow:
    0 4px 6px -1px rgba(15, 23, 42, 0.07),
    0 10px 24px -4px rgba(15, 23, 42, 0.12);
  padding: 14px 16px;
}

@media (max-width: 1280px) {
  .workbench-layout {
    grid-template-columns: minmax(228px, 244px) minmax(0, 1fr);
  }
  .workbench-layout--external {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1024px) {
  .workbench-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }
  .workbench-sidebar {
    max-height: 220px;
    height: auto;
  }
  .workbench-sidebar :deep(.history-sidebar) {
    border-radius: 0;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-top: none;
    border-bottom: none;
  }
  .workbench-sidebar :deep(.history-sidebar__overlay) {
    border-radius: 0;
  }
  .workbench-layout:not(.workbench-layout--external) .center-card {
    border-radius: 0;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-top: none;
    border-bottom: none;
  }
  .workbench-layout--external {
    grid-template-columns: 1fr;
  }
  .workbench-layout--external .workbench-center {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 0;
    gap: 0;
  }
  .workbench-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
  }
}

</style>
