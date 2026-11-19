import type { ApiResponse } from '@/types/api'
import { buildAuthHeaders, handleUnauthorizedResponse } from '@/utils/request'
import { fetchTaskApi } from '@/api/taskShared'
import { i18n } from '@/i18n'
import type {
  TaskFileItem,
  TaskHistoryDetail,
  TaskHistoryItem,
  TaskMessageItem,
  TaskProgressEvent,
  UploadTaskFileResponse,
} from '@/api/taskTypes'

export type { TaskFileItem, TaskHistoryDetail, TaskHistoryItem, TaskMessageItem, UploadTaskFileResponse }

const tr = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params || {})

export async function uploadTaskFile(
  taskId: string,
  agentId: number,
  file: File,
  userMessageId?: number | null,
): Promise<ApiResponse<UploadTaskFileResponse>> {
  const form = new FormData()
  form.append('file', file)
  const q = new URLSearchParams({
    taskId,
    agentId: String(agentId),
  })
  if (userMessageId != null && Number.isFinite(userMessageId)) {
    q.set('userMessageId', String(userMessageId))
  }
  return fetchTaskApi<UploadTaskFileResponse>(`/api/tasks/upload?${q.toString()}`, { method: 'POST', body: form }, tr('common.uploadFailed'))
}

/**
 * 订阅任务进度 SSE，回调每个事件；返回关闭函数
 */
export function subscribeTaskProgress(
  taskId: string,
  onEvent: (event: TaskProgressEvent) => void
): () => void {
  const url = `/api/tasks/${encodeURIComponent(taskId)}/events`
  const ac = new AbortController()
  const requestOptions: RequestInit = {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
    },
    signal: ac.signal,
  }

  fetch(url, {
    ...requestOptions,
    headers: buildAuthHeaders(requestOptions),
  })
    .then(async (res) => {
      if (handleUnauthorizedResponse(res)) return
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const dataLine = line.slice(5).trim()
              if (dataLine === '[DONE]') continue
              try {
                const payload = JSON.parse(dataLine) as TaskProgressEvent
                onEvent(payload)
              } catch {
                // ignore parse error
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    })
    .catch((e) => {
      if (e?.name !== 'AbortError') {
        console.warn('SSE 连接异常:', e)
      }
    })

  return () => ac.abort()
}

/** 历史任务列表 */
export async function getTaskHistory(
  agentId: number,
  offset = 0,
  pageSize = 20
): Promise<ApiResponse<TaskHistoryItem[]>> {
  return fetchTaskApi<TaskHistoryItem[]>(
    `/api/tasks/history?agentId=${agentId}&offset=${offset}&pageSize=${pageSize}`,
    { method: 'GET' },
    tr('workbench.messages.loadHistoryFailed')
  )
}

export async function getTaskHistoryDetail(
  taskId: string
): Promise<ApiResponse<TaskHistoryDetail>> {
  return fetchTaskApi<TaskHistoryDetail>(
    `/api/tasks/history/${encodeURIComponent(taskId)}`,
    { method: 'GET' },
    tr('common.requestFailed')
  )
}

/** 软删除历史会话 */
export async function deleteTaskHistorySession(
  taskId: string
): Promise<ApiResponse<null>> {
  return fetchTaskApi<null>(
    `/api/tasks/history/${encodeURIComponent(taskId)}`,
    { method: 'DELETE' },
    tr('workbench.messages.deleteFailed')
  )
}

/** 重命名历史会话标题 */
export async function renameTaskHistorySession(
  taskId: string,
  sessionTitle: string
): Promise<ApiResponse<null>> {
  return fetchTaskApi<null>(
    `/api/tasks/history/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ sessionTitle }),
    },
    tr('workbench.messages.renameFailed')
  )
}

/**
 * 获取某任务下的文件列表（含文件 id），用于统一按文件 id 下载系统产出
 */
export async function getTaskFiles(
  taskId: string
): Promise<ApiResponse<TaskFileItem[]>> {
  return fetchTaskApi<TaskFileItem[]>(
    `/api/tasks/${encodeURIComponent(taskId)}/files`,
    { method: 'GET' },
    tr('common.requestFailed')
  )
}

/**
 * 新建会话时：将上一个任务下未关联消息的上传文件迁移到新任务
 */
export async function reassignTaskFiles(
  oldTaskId: string,
  newTaskId: string
): Promise<ApiResponse<unknown>> {
  return fetchTaskApi<unknown>(
    '/api/tasks/files/reassign',
    {
      method: 'POST',
      body: JSON.stringify({ oldTaskId, newTaskId }),
    },
    tr('common.requestFailed')
  )
}

/**
 * 按文件 ID 下载任务文件（全系统统一从本系统存储读取）
 */
export async function downloadTaskFileById(fileId: number, filename?: string): Promise<void> {
  const url = `/api/tasks/files/${fileId}/download`
  const requestOptions: RequestInit = { method: 'GET' }
  const res = await fetch(url, {
    ...requestOptions,
    headers: buildAuthHeaders(requestOptions),
  })
  if (handleUnauthorizedResponse(res)) {
    throw new Error(tr('common.authExpired'))
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || tr('common.downloadFailed'))
  }
  const blob = await res.blob()
  const name =
    filename ||
    (res.headers.get('content-disposition')?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]?.replace(/['"]/g, '')) ||
    'download'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
