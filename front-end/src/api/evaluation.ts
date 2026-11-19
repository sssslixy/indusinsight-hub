import { buildAuthHeaders, get, handleUnauthorizedResponse, postFormData } from '@/utils/request'
import { i18n } from '@/i18n'

export type CaseId = 'case1' | 'case2' | 'case3'
export interface EvaluationCase {
  id: CaseId
  name: string
  metric: 'binary_f1' | 'mae' | 'macro_f1'
  direction: 'asc' | 'desc'
  unit?: string
  testRows: number
  datasetVersion: string
  canSubmit: boolean
  unavailableReason?: string
  deadline?: string
  maxSubmissions: number
}
export interface LeaderboardEntry {
  rank: number
  userId: number
  username: string
  metricValue: number
  submissionCount: number
  submittedAt: string
  currentUser: boolean
}
export interface EvaluationBoard {
  list: LeaderboardEntry[]
  total: number
  pageNum: number
  pageSize: number
  mine?: LeaderboardEntry
  mySubmissionCount: number
}
export interface EvaluationDateRange {
  startDate: string
  endDate: string
}
export interface SubmissionResult {
  submissionId: number
  requestId: string
  caseId: CaseId
  metricValue: number
  submittedAt: string
}
export const getEvaluationCases = () => get<EvaluationCase[]>('/api/evaluation/cases')
export const getEvaluationBoard = (id: CaseId, range?: EvaluationDateRange) =>
  get<EvaluationBoard>(`/api/evaluation/cases/${id}/leaderboard`, { all: true, ...range })
export function submitEvaluation(id: CaseId, file: File, requestId: string) {
  const data = new FormData()
  data.append('file', file)
  data.append('requestId', requestId)
  return postFormData<SubmissionResult>(`/api/evaluation/cases/${id}/submissions`, data)
}

export async function downloadEvaluationDataset(id: CaseId, signal?: AbortSignal): Promise<Blob> {
  const t = i18n.global.t
  let response: Response
  try {
    response = await fetch(`/api/evaluation/cases/${id}/dataset`, {
      method: 'GET',
      headers: buildAuthHeaders(),
      signal,
    })
  } catch (e) {
    if (signal?.aborted || (e instanceof Error && e.name === 'AbortError')) throw e
    throw new Error(t('evaluation.downloadFailed'))
  }
  if (handleUnauthorizedResponse(response)) throw new Error(t('common.authExpired'))

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  // Business errors (including expired sessions) can have HTTP 200 in this API.
  if (contentType?.includes('json')) {
    const result = await response.json().catch(() => null)
    if (result?.code === 4030) {
      handleUnauthorizedResponse({ status: 401 })
      throw new Error(t('common.authExpired'))
    }
    throw new Error(
      t(result?.code === 4207 ? 'evaluation.datasetUnavailable' : 'evaluation.downloadFailed'),
    )
  }
  if (!response.ok || contentType !== 'application/zip')
    throw new Error(t('evaluation.downloadFailed'))
  const blob = await response.blob()
  if (!blob.size) throw new Error(t('evaluation.datasetUnavailable'))
  return blob
}
