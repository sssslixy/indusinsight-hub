import { get } from '@/utils/request'
import type { ApiResponse } from '@/types/api'

// ----------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------

export interface AnnouncementItem {
  id: number
  title: string
  contentSummary: string
  publishTime: string
  status: number
  statusLabel: string
  isLatest: boolean
  isImportant: boolean
}

export interface AnnouncementDetail extends AnnouncementItem {
  content: string
  createdAt: string
  updatedAt: string
}

export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export interface AnnouncementQueryParams {
  pageNum?: number
  pageSize?: number
  keyword?: string
  /** all | latest | important */
  tag?: string
}

// ----------------------------------------------------------------
// 接口方法
// ----------------------------------------------------------------

/**
 * 首页/仪表盘：获取最新已发布公告（不分页）
 */
export function getLatestAnnouncements(
  limit: number = 5
): Promise<ApiResponse<AnnouncementItem[]>> {
  return get<AnnouncementItem[]>(`/api/announcements/latest?limit=${limit}`)
}

/**
 * 前台公告分页列表
 * GET /api/announcements?pageNum=&pageSize=&keyword=&tag=
 */
export function getAnnouncementList(
  params: AnnouncementQueryParams
): Promise<ApiResponse<PageResult<AnnouncementItem>>> {
  const query: Record<string, string> = {
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 10),
  }
  if (params.keyword && params.keyword.trim()) {
    query.keyword = params.keyword.trim()
  }
  if (params.tag && params.tag !== 'all') {
    query.tag = params.tag
  }
  return get<PageResult<AnnouncementItem>>('/api/announcements', query)
}

/**
 * 前台公告详情
 * GET /api/announcements/:id
 */
export function getAnnouncementDetail(
  id: number
): Promise<ApiResponse<AnnouncementDetail>> {
  return get<AnnouncementDetail>(`/api/announcements/${id}`)
}
