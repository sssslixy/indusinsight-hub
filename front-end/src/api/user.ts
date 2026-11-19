import { get, put, postFormData } from '@/utils/request'
import type { ApiResponse, UserProfile, RecentActivity } from '@/types/api'

const API_BASE = '/api/user'

/**
 * 获取当前用户资料
 */
export function getUserProfile(): Promise<ApiResponse<UserProfile>> {
  return get<UserProfile>(`${API_BASE}/profile`)
}

/**
 * 更新用户资料
 */
export function updateUserProfile(data: {
  username: string
}): Promise<ApiResponse<UserProfile>> {
  return put<UserProfile>(`${API_BASE}/profile`, data)
}

/**
 * 修改当前用户密码（短信验证码校验）
 */
export function changePassword(data: {
  code: string
  newPassword: string
}): Promise<ApiResponse<void>> {
  return put<void>(`${API_BASE}/password`, data)
}

/**
 * 上传并更新用户头像
 */
export function uploadUserAvatar(file: File): Promise<ApiResponse<string>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormData<string>(`${API_BASE}/avatar`, formData)
}

/**
 * 获取最近活动
 */
export function getRecentActivities(limit: number = 10): Promise<ApiResponse<RecentActivity[]>> {
  return get<RecentActivity[]>('/api/profile/recent-activities', { limit })
}
