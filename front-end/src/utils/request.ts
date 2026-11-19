import type { ApiResponse } from '@/types/api'
import { useUserStore } from '@/stores/user'
import { getAuthToken } from '@/utils/storage/auth'
import { i18n } from '@/i18n'

const tr = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params || {})
const smsErrorKeys: Record<number, string> = {
  4100: 'disabled', 4101: 'limited', 4102: 'invalid', 4103: 'exhausted',
  4104: 'unavailable', 4105: 'busy', 4106: 'passwordRequired', 4107: 'conflict',
  4108: 'businessFailed',
}

class RequestError extends Error {
  code: number
  
  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'RequestError'
  }
}

function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return { ...headers }
}

/** 未登录或登录过期时清理本地状态并跳转登录页 */
function clearLoginAndRedirect() {
  const userStore = useUserStore()
  userStore.clearLoginInfo()
  const redirect = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = redirect ? `/login?redirect=${redirect}` : '/login'
}

export function isUnauthorizedStatus(status: number): boolean {
  return status === 401 || status === 403
}

export function handleUnauthorizedResponse(response: Pick<Response, 'status'>): boolean {
  if (!isUnauthorizedStatus(response.status)) return false
  clearLoginAndRedirect()
  return true
}

export function buildAuthHeaders(options: RequestInit = {}): Record<string, string> {
  const headers = toHeaderRecord(options.headers)
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getAuthToken()
  if (token) {
    headers.satoken = token
  }
  return headers
}

/**
 * 统一请求封装
 * 当后端返回 401/403 时自动清除登录态并跳转登录页，避免「首页显示已登录、进入系统后接口未登录」的不一致。
 */
export async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = buildAuthHeaders(options)
    
    // 发送请求
    const response = await fetch(url, {
      ...options,
      headers
    })
    
    // 未登录或登录过期：统一清除本地登录态并跳转登录，与后端状态保持一致
    if (handleUnauthorizedResponse(response)) {
      throw new RequestError(401, tr('common.authExpired'))
    }
    
    // 解析响应（非 2xx 时 body 可能是错误信息，也尝试解析）
    let result: ApiResponse<T>
    try {
      result = await response.json()
    } catch {
      throw new RequestError(
        5000,
        response.ok ? tr('common.parseResponseFailed') : tr('common.requestFailedWithStatus', { status: response.status }),
      )
    }
    
    // 检查业务状态码
    if (result.code !== 0) {
      const smsKey = smsErrorKeys[result.code]
      throw new RequestError(result.code, smsKey ? tr(`smsErrors.${smsKey}`) : result.message || tr('common.requestFailed'))
    }
    
    return result
  } catch (error) {
    if (error instanceof RequestError) {
      throw error
    }
    
    // 网络错误或其他错误
    console.error('请求错误:', error)
    throw new RequestError(5000, tr('common.networkFailed'))
  }
}

/**
 * 组装查询串：必须去掉 undefined/null，否则 URLSearchParams 会序列化为字面值 "undefined"/"null"，
 * 后端若按关键词筛选会得到错误条件（例如 keyword=undefined 导致名称匹配 `%undefined%`）。
 */
function buildQueryString(params: Record<string, any>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  return new URLSearchParams(entries as [string, string][]).toString()
}

/**
 * GET 请求
 */
export function get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
  if (params) {
    const query = buildQueryString(params)
    if (query) url = `${url}?${query}`
  }

  return request<T>(url, {
    method: 'GET'
  })
}

/**
 * POST 请求
 */
export function post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * PUT 请求
 */
export function put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * DELETE 请求
 */
export function del<T = any>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'DELETE'
  })
}

/**
 * POST FormData 请求（用于 multipart/form-data 上传）
 */
export function postFormData<T = any>(url: string, formData: FormData, extraHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'POST',
    body: formData,
    headers: extraHeaders,
  })
}
