import type { ApiResponse } from '@/types/api'
import { buildAuthHeaders, handleUnauthorizedResponse } from '@/utils/request'
import { i18n } from '@/i18n'

const tr = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params || {})

export async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<ApiResponse<T>> {
  if (handleUnauthorizedResponse(response)) {
    throw new Error(tr('common.authExpired'))
  }
  let data: ApiResponse<T>
  try {
    data = (await response.json()) as ApiResponse<T>
  } catch {
    throw new Error(response.ok ? tr('common.parseResponseFailed') : tr('common.requestFailedWithStatus', { status: response.status }))
  }
  if (data.code !== 0) {
    throw new Error(data.message || fallbackMessage)
  }
  return data
}

export async function fetchTaskApi<T>(
  url: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: buildAuthHeaders(options),
  })
  return parseApiResponse<T>(response, fallbackMessage)
}

export async function fetchTaskSse(
  url: string,
  options: RequestInit
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: buildAuthHeaders(options),
  })
  if (handleUnauthorizedResponse(response)) {
    throw new Error(tr('common.authExpired'))
  }
  return response
}
