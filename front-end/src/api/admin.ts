import { buildAuthHeaders } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { i18n } from '@/i18n'
import type { ApiResponse } from '@/types/api'
import type { PageResult } from '@/api/announcement'

export interface AdminAccount {
  id: number
  account: string
  username: string
  passwordUpdatedAt: string | null
}
export interface AdminAnnouncement {
  id: number
  title: string
  content?: string
  contentSummary?: string
  status: number
  isImportant: boolean
  publishTime: string | null
  createdAt: string
  updatedAt: string
}
export interface AnnouncementInput {
  title: string
  content: string
  status: number
  isImportant: number
}
export class AdminApiError extends Error {
  constructor(
    public status: number,
    public code: number,
    message: string,
  ) {
    super(message)
  }
}

export async function adminRequest<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const user = useUserStore()
  const requestToken = user.token
  const response = await fetch(`/api/admin${path}`, {
    method,
    headers: buildAuthHeaders(),
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  if (response.status === 401) {
    if (user.token === requestToken) {
      user.clearLoginInfo()
      window.dispatchEvent(new Event('admin-session-expired'))
    }
    throw new AdminApiError(401, 401, i18n.global.t('admin.expired'))
  }
  if (response.status === 403) {
    if (user.token === requestToken) {
      user.adminAccessDenied = true
      window.dispatchEvent(new Event('admin-access-denied'))
    }
    throw new AdminApiError(403, 403, i18n.global.t('admin.forbidden'))
  }
  const result = (await response.json()) as ApiResponse<T>
  if (!response.ok || result.code !== 0)
    throw new AdminApiError(
      response.status,
      result.code,
      result.message || i18n.global.t('admin.failed'),
    )
  return result.data
}
export const getAdminAccount = () => adminRequest<AdminAccount>('/account')
export const logoutAdmin = () => adminRequest<void>('/logout', 'POST')
export const changeAdminPassword = (currentPassword: string, newPassword: string) =>
  adminRequest<void>('/account/password', 'PUT', { currentPassword, newPassword })
export const getAdminAnnouncements = (pageNum: number, keyword = '', status = '') =>
  adminRequest<PageResult<AdminAnnouncement>>(
    `/announcements?${new URLSearchParams({ pageNum: String(pageNum), pageSize: '10', keyword, ...(status === '' ? {} : { status }) })}`,
  )
export const getAdminAnnouncement = (id: number) =>
  adminRequest<AdminAnnouncement>(`/announcements/${id}`)
export const saveAdminAnnouncement = (id: number | null, data: AnnouncementInput) =>
  adminRequest<number | void>(
    id === null ? '/announcements' : `/announcements/${id}`,
    id === null ? 'POST' : 'PUT',
    data,
  )
export const actOnAnnouncement = (id: number, action: 'publish' | 'offline' | 'delete') =>
  adminRequest<void>(
    `/announcements/${id}${action === 'delete' ? '' : `/${action}`}`,
    action === 'delete' ? 'DELETE' : 'PUT',
  )
