import type { RunTaskResponse, TaskFileItem, TaskMessageItem } from '@/api/task'
import type { ArtifactFile, WorkbenchMessage } from '@/types/modules/agentWorkbench'

export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatClockTime(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function isTaskActuallyCompleted(data: RunTaskResponse | undefined | null): boolean {
  if (!data?.success) return false
  if (data?.interrupt) return false
  const hasDeliverables = Array.isArray(data.deliverables) && data.deliverables.length > 0
  const hasReportPath = !!data.final_report_path && String(data.final_report_path).trim() !== ''
  const hasZipPath = !!data.deployment_zip_path && String(data.deployment_zip_path).trim() !== ''
  return hasDeliverables || hasReportPath || hasZipPath
}

export function formatMessageTime(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  } catch {
    return ''
  }
}

/** AutoML 终态可下载的单一制品（报告已打入包内，与 agent-service / Java 落库策略一致） */
export function isAutomlOutputBundleName(name: string | null | undefined): boolean {
  return (name || '').trim().toLowerCase() === 'deployment.zip'
}

export function formatHistoryItemTime(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d
      .toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(/\//g, '-')
  } catch {
    return ''
  }
}

export function buildMessagesFromHistory(
  msgs: TaskMessageItem[],
  files: TaskFileItem[],
  fallbackFileName = 'File',
): WorkbenchMessage[] {
  const result: WorkbenchMessage[] = []
  const fileMap = new Map<number, TaskFileItem[]>()
  for (const f of files) {
    const mid = f.messageId ?? 0
    if (!fileMap.has(mid)) fileMap.set(mid, [])
    fileMap.get(mid)!.push(f)
  }

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]!
    const type: WorkbenchMessage['type'] =
      m.role === 'user'
        ? 'user'
        : m.role === 'assistant'
          ? 'agent'
          : m.role === 'system'
            ? 'system'
            : 'step'

    const attachments = fileMap.get(m.id) || []
    const outputFiles = attachments
      .filter((a) => a.fileRole === 'output' && isAutomlOutputBundleName(a.originFileName))
      .map((a) => ({ id: a.id, name: a.originFileName || fallbackFileName }))
    const otherFiles = attachments.filter((a) => a.fileRole !== 'output')

    // 后端常把「先上传文件」与「再发文字」记成两条 user 消息；合并为一条，避免两个用户头 + 空气泡
    if (type === 'user') {
      const textEmpty = !String(m.content || '').trim()
      const next = msgs[i + 1]
      const nextHasText = next?.role === 'user' && !!String(next.content || '').trim()
      if (textEmpty && otherFiles.length > 0 && nextHasText) {
        const nextAtt = fileMap.get(next!.id) || []
        const nextOthers = nextAtt.filter((a) => a.fileRole !== 'output')
        const row: WorkbenchMessage = {
          id: `msg-${next!.id}`,
          type: 'user',
          content: next!.content || '',
          timestamp: formatMessageTime(next!.createdAt || m.createdAt || ''),
        }
        result.push(row)
        for (const a of [...otherFiles, ...nextOthers]) {
          result.push({
            id: `file-${a.id != null ? a.id : `x${result.length}`}`,
            type: 'file',
            content: a.originFileName,
            timestamp: formatMessageTime(a.createdAt || ''),
            fileName: a.originFileName,
            fileSize: a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} KB` : undefined,
            fileId: a.id != null && a.id > 0 ? a.id : undefined,
          })
        }
        i++
        continue
      }
    }

    const row: WorkbenchMessage = {
      id: `msg-${m.id}`,
      type,
      content: m.content || '',
      timestamp: formatMessageTime(m.createdAt || ''),
    }
    if (type === 'agent' && outputFiles.length) {
      row.outputFiles = outputFiles
    }
    // 仅有附件、正文为空时也要推入用户主行，否则首条全是 file，分组与列表 key 易异常（上传后历史打不开）
    const shouldRenderPrimaryRow =
      !!row.content ||
      (type === 'agent' && outputFiles.length) ||
      (type === 'user' && otherFiles.length > 0)
    if (shouldRenderPrimaryRow) {
      result.push(row)
    }

    for (const a of otherFiles) {
      result.push({
        id: `file-${a.id != null ? a.id : `x${result.length}`}`,
        type: 'file',
        content: a.originFileName,
        timestamp: formatMessageTime(a.createdAt || ''),
        fileName: a.originFileName,
        fileSize: a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} KB` : undefined,
        fileId: a.id != null && a.id > 0 ? a.id : undefined,
      })
    }
  }

  const orphanOutputs = files.filter(
    (f) =>
      f.fileRole === 'output' &&
      (f.messageId == null || f.messageId === 0) &&
      isAutomlOutputBundleName(f.originFileName),
  )
  if (orphanOutputs.length) {
    const merged = orphanOutputs.map((a) => ({ id: a.id, name: a.originFileName || fallbackFileName }))
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i]!.type === 'agent') {
        const prev = result[i]!.outputFiles || []
        result[i] = {
          ...result[i]!,
          outputFiles: [...prev, ...merged],
        }
        break
      }
    }
  }

  return result
}

export function buildDeliverablesFromHistory(files: TaskFileItem[], fallbackFileName = 'File'): { key: string; name: string }[] {
  return files
    .filter((f) => f.fileRole === 'output' && isAutomlOutputBundleName(f.originFileName))
    .map((f) => ({ key: String(f.id), name: f.originFileName || fallbackFileName }))
}

export function buildArtifactFilesFromHistory(
  files: TaskFileItem[],
  fallbackFileName = 'File',
): (ArtifactFile & { downloadKey?: 'report' | 'deployment_zip' })[] {
  return files
    .filter((f) => f.fileRole === 'output' && isAutomlOutputBundleName(f.originFileName))
    .map((f) => ({
      id: String(f.id),
      name: f.originFileName || fallbackFileName,
      size: f.fileSize ? `${(f.fileSize / 1024).toFixed(1)} KB` : '-',
      createdAt: f.createdAt ? formatHistoryItemTime(f.createdAt) : '',
      downloadKey:
        f.originFileName === 'Final_Report.md'
          ? 'report'
          : f.originFileName === 'deployment.zip'
            ? 'deployment_zip'
            : undefined,
    }))
}
