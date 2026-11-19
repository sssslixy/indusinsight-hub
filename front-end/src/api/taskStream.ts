import { nextTick } from 'vue'
import type { ApiResponse } from '@/types/api'
import { fetchTaskApi, fetchTaskSse } from '@/api/taskShared'
import { i18n } from '@/i18n'
import type {
  RunTaskRequest,
  RunTaskResponse,
  TaskStreamCompatOptions,
  TaskStreamEvent,
  TaskStreamEventMap,
  TaskStreamEventType,
  TaskStreamHandlers,
} from '@/api/taskTypes'
import { getUserFacingTaskFailureMessage } from '@/api/taskTypes'

const tr = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params || {})

export function localizeLlmFailure<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload
  const data = payload as Record<string, unknown>
  const code = String(data.failure_class || data.pipeline_error || '')
  const key = `llm.errors.${code}`
  if (/^llm_[a-z_]+$/.test(code) && i18n.global.te(key)) {
    data.message = tr(key)
    data.user_actionable_hint = data.message
  }
  return payload
}

const KNOWN_STREAM_EVENT_TYPES: TaskStreamEventType[] = [
  'run_context',
  'pipeline_start',
  'node_start',
  'node_end',
  'node_progress',
  'llm_start',
  'llm_chunk',
  'deep_chunk',
  'message',
  'llm_end',
  'agent_status',
  'skill_start',
  'skill_end',
  'tool_start',
  'tool_end',
  'capability_start',
  'capability_end',
  'capability_invalid',
  'kb_retrieval_start',
  'kb_retrieval',
  'kb_retrieval_end',
  'kb_retrieval_skipped',
  'kb_context_attached',
  'codegen_profile_start',
  'codegen_profile_end',
  'codegen_stage_start',
  'codegen_stage_plan',
  'codegen_stage_skipped',
  'codegen_skill_read',
  'codegen_kb_retrieved',
  'codegen_stage_code_generated',
  'codegen_pipeline_compose_start',
  'codegen_pipeline_composed',
  'codegen_quality_check_start',
  'codegen_quality_check_completed',
  'codegen_quality_repair_start',
  'codegen_quality_repair_end',
  'codegen_validation_sample_start',
  'codegen_validation_sample_created',
  'codegen_pipeline_validation_start',
  'codegen_pipeline_validation_end',
  'codegen_pipeline_validation_final_failed',
  'codegen_pipeline_repair_start',
  'codegen_pipeline_repair_end',
  'codegen_llm_review_start',
  'codegen_llm_review_completed',
  'codegen_llm_review_repair_start',
  'codegen_llm_review_repair_end',
  'codegen_report_start',
  'codegen_report_generated',
  'codegen_zip_start',
  'codegen_zip_generated',
  'artifact_ready',
  'interrupt',
  'complete',
  'error',
  'heartbeat',
]

function isKnownEventType(eventName: string): eventName is TaskStreamEventType {
  return KNOWN_STREAM_EVENT_TYPES.includes(eventName as TaskStreamEventType)
}

function hasChunkText(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as Record<string, unknown>
  return [record.token, record.text, record.content, record.chunk, record.delta, record.message].some(
    (v) => typeof v === 'string' && v.length > 0,
  )
}

function normalizeStreamEventType(rawEvent: string | undefined, parsed: unknown): TaskStreamEventType {
  const eventName = String(rawEvent || '').trim()
  const eventType = isKnownEventType(eventName) ? eventName : 'message'
  // 部分代理会将 chunk 放在 data-only message 事件中，这里提升为 llm_chunk 以复用上层逻辑。
  if (eventType === 'message' && hasChunkText(parsed)) {
    return 'llm_chunk'
  }
  return eventType
}

function syncRunRefsFromEvent(data: RunTaskResponse, evt: TaskStreamEvent) {
  const payload = (evt.data || {}) as Record<string, unknown>
  if (typeof payload.thread_id === 'string' && payload.thread_id) data.thread_id = payload.thread_id
  if (typeof payload.run_id === 'string' && payload.run_id) data.runId = payload.run_id
  if (typeof payload.session_id === 'number') data.sessionId = payload.session_id
}

async function streamTaskRequest(
  url: string,
  body: Record<string, unknown>,
  handlers: TaskStreamHandlers = {},
): Promise<void> {
  const payload = JSON.stringify(body)
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: payload,
    signal: handlers.signal,
  }
  const res = await fetchTaskSse(url, requestOptions)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || tr('common.requestFailedWithStatus', { status: res.status }))
  }
  if (!res.body) {
    throw new Error(tr('workbench.messages.sseBodyEmpty'))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const frames = buffer.split('\n\n')
      buffer = frames.pop() || ''

      for (const frame of frames) {
        const lines = frame
          .split('\n')
          .map((line) => line.trimEnd())
          .filter((line) => line.length > 0 && !line.startsWith(':'))

        let currentEvent = ''
        let currentId: string | undefined
        const dataLines: string[] = []

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('id:')) {
            currentId = line.slice(3).trim()
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim())
          }
        }

        if (dataLines.length > 0) {
          const raw = dataLines.join('\n')
          try {
            const parsed = localizeLlmFailure(JSON.parse(raw)) as TaskStreamEventMap[TaskStreamEventType]
            const eventType = normalizeStreamEventType(currentEvent, parsed)
            handlers.onEvent?.({
              event: eventType,
              id: currentId,
              data: parsed as TaskStreamEventMap[typeof eventType],
            })
            // 同一次 reader.read() 可能带回多帧 SSE；不在此处让出则会话栈内连续改 reactivity，
            // Vue 会合并为一次 DOM 更新，表现为整段“弹出”而非流式。
            if (eventType === 'llm_chunk' || eventType === 'deep_chunk') {
              await nextTick()
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
            }
          } catch {
            // 忽略单条事件解析失败，继续消费后续流
            if (import.meta.env.DEV) {
              console.warn('[taskStream] failed to parse SSE frame', { currentEvent, raw })
            }
          }
        }
      }
    }
    handlers.onDone?.()
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    handlers.onError?.(err)
    throw err
  } finally {
    reader.releaseLock()
  }
}

export async function runTask(
  params: RunTaskRequest
): Promise<ApiResponse<RunTaskResponse>> {
  const result = await fetchTaskApi<RunTaskResponse>(
    '/api/tasks/run',
    {
      method: 'POST',
      body: JSON.stringify({
        taskId: params.taskId,
        sessionId: params.sessionId,
        agentId: params.agentId,
        userRequirement: params.userRequirement,
        dataPath: params.dataPath || undefined,
        draftUserMessageId: params.draftUserMessageId,
        pipelineMode: params.pipelineMode,
      llmBindings: params.llmBindings,
      }),
    },
    tr('workbench.messages.startTaskFailed')
  )
  localizeLlmFailure(result.data)
  return result
}

/**
 * 运行任务（SSE 流式）
 * - 请求体与 runTask 一致
 * - 响应通过 handlers.onEvent 按事件推送
 */
export async function runTaskStream(
  params: RunTaskRequest,
  handlers: TaskStreamHandlers = {},
): Promise<void> {
  await streamTaskRequest(
    '/api/tasks/run/stream',
    {
      taskId: params.taskId,
      sessionId: params.sessionId,
      agentId: params.agentId,
      userRequirement: params.userRequirement,
      dataPath: params.dataPath || undefined,
      draftUserMessageId: params.draftUserMessageId,
      pipelineMode: params.pipelineMode,
      llmBindings: params.llmBindings,
    },
    handlers,
  )
}

export async function resumeTask(
  threadId: string,
  userChoice: string
): Promise<ApiResponse<RunTaskResponse>> {
  const result = await fetchTaskApi<RunTaskResponse>(
    '/api/tasks/resume',
    {
      method: 'POST',
      body: JSON.stringify({ threadId, userChoice }),
    },
    tr('workbench.messages.resumeTaskFailed')
  )
  localizeLlmFailure(result.data)
  return result
}

/**
 * 人机确认后继续运行（SSE 流式）
 * - 必须传入 interrupt 返回的同一个 threadId
 */
export async function resumeTaskStream(
  threadId: string,
  userChoice: string,
  handlers: TaskStreamHandlers = {},
): Promise<void> {
  await streamTaskRequest(
    '/api/tasks/resume/stream',
    { threadId, userChoice },
    handlers,
  )
}

/**
 * 流式兼容封装：内部消费 SSE，输出接近旧 runTask/resumeTask 的结构，便于页面渐进改造
 */
function createDefaultRunTaskResponse(): RunTaskResponse {
  return {
    success: false,
    message: '',
    deliverables: [],
  }
}

export async function runTaskStreamCompat(
  params: RunTaskRequest,
  options: TaskStreamCompatOptions = {},
): Promise<ApiResponse<RunTaskResponse>> {
  const data = createDefaultRunTaskResponse()

  await streamTaskRequest(
    '/api/tasks/run/stream',
    {
      taskId: params.taskId,
      sessionId: params.sessionId,
      agentId: params.agentId,
      userRequirement: params.userRequirement,
      dataPath: params.dataPath || undefined,
      draftUserMessageId: params.draftUserMessageId,
      pipelineMode: params.pipelineMode,
      llmBindings: params.llmBindings,
    },
    {
      signal: options.signal,
      onEvent: (evt) => {
        options.onEvent?.(evt)
        syncRunRefsFromEvent(data, evt)
        if (evt.event === 'pipeline_start') {
          const payload = evt.data as TaskStreamEventMap['pipeline_start']
          if (payload.thread_id) data.thread_id = payload.thread_id
        }
        if (evt.event === 'interrupt') {
          const payload = evt.data as TaskStreamEventMap['interrupt']
          data.success = true
          data.thread_id = payload.thread_id || data.thread_id
          data.interrupt_type = payload.interrupt_type
          data.interrupt = payload.interrupt
          data.message = tr('workbench.messages.taskWaitingConfirm')
        }
        if (evt.event === 'complete') {
          const payload = evt.data as TaskStreamEventMap['complete']
          data.success = !!payload.success
          data.thread_id = payload.thread_id || data.thread_id
          if (payload.session_id != null) data.sessionId = Number(payload.session_id)
          if (payload.run_id) data.runId = payload.run_id
          data.deliverables = Array.isArray(payload.deliverables) ? payload.deliverables : []
          data.pipeline_error = payload.pipeline_error
          data.failure_class = payload.failure_class
          data.user_actionable_hint = payload.user_actionable_hint
          data.final_report_path = payload.final_report_path
          data.deployment_zip_path = payload.deployment_zip_path
          data.message =
            payload.message ||
            (payload.success ? tr('workbench.messages.taskCompleteShort') : getUserFacingTaskFailureMessage())
        }
        if (evt.event === 'error') {
          const payload = evt.data as TaskStreamEventMap['error'] & { error?: string }
          data.success = false
          data.thread_id = payload.thread_id || data.thread_id
          const legacy = payload.error != null && String(payload.error) !== '' ? String(payload.error) : undefined
          data.pipeline_error = payload.pipeline_error ?? legacy
          data.failure_class = payload.failure_class
          data.user_actionable_hint = payload.user_actionable_hint
          data.message = String(payload.message || '').trim() || getUserFacingTaskFailureMessage()
        }
      },
    },
  )

  if (params.sessionId != null) data.sessionId = params.sessionId

  return {
    code: data.success || !!data.interrupt ? 0 : -1,
    message: data.message || (data.success ? 'success' : 'failed'),
    data,
  }
}

export async function resumeTaskStreamCompat(
  threadId: string,
  userChoice: string,
  options: TaskStreamCompatOptions = {},
): Promise<ApiResponse<RunTaskResponse>> {
  const data = createDefaultRunTaskResponse()
  data.thread_id = threadId

  await streamTaskRequest(
    '/api/tasks/resume/stream',
    { threadId, userChoice },
    {
      signal: options.signal,
      onEvent: (evt) => {
        options.onEvent?.(evt)
        syncRunRefsFromEvent(data, evt)
        if (evt.event === 'interrupt') {
          const payload = evt.data as TaskStreamEventMap['interrupt']
          data.success = true
          data.thread_id = payload.thread_id || data.thread_id
          data.interrupt_type = payload.interrupt_type
          data.interrupt = payload.interrupt
          data.message = tr('workbench.messages.taskWaitingConfirm')
        }
        if (evt.event === 'complete') {
          const payload = evt.data as TaskStreamEventMap['complete']
          data.success = !!payload.success
          data.thread_id = payload.thread_id || data.thread_id
          if (payload.session_id != null) data.sessionId = Number(payload.session_id)
          if (payload.run_id) data.runId = payload.run_id
          data.deliverables = Array.isArray(payload.deliverables) ? payload.deliverables : []
          data.pipeline_error = payload.pipeline_error
          data.failure_class = payload.failure_class
          data.user_actionable_hint = payload.user_actionable_hint
          data.final_report_path = payload.final_report_path
          data.deployment_zip_path = payload.deployment_zip_path
          data.message =
            payload.message ||
            (payload.success ? tr('workbench.messages.taskCompleteShort') : getUserFacingTaskFailureMessage())
        }
        if (evt.event === 'error') {
          const payload = evt.data as TaskStreamEventMap['error'] & { error?: string }
          data.success = false
          data.thread_id = payload.thread_id || data.thread_id
          const legacy = payload.error != null && String(payload.error) !== '' ? String(payload.error) : undefined
          data.pipeline_error = payload.pipeline_error ?? legacy
          data.failure_class = payload.failure_class
          data.user_actionable_hint = payload.user_actionable_hint
          data.message = String(payload.message || '').trim() || getUserFacingTaskFailureMessage()
        }
      },
    },
  )

  return {
    code: data.success || !!data.interrupt ? 0 : -1,
    message: data.message || (data.success ? 'success' : 'failed'),
    data,
  }
}
