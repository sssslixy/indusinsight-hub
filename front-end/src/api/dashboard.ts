import { get, request } from '@/utils/request'
import type { ApiResponse } from '@/types/api'

export interface DashboardStats {
  communityResources?: number | null
  activeUsers?: number
  todayVisits?: number
  totalVisits: number | null
  totalUsers?: number | null
  totalTokens?: string | null
  totalAgents: number | null
  totalSkills: number | null
  totalDocuments: number | null
}

export interface MyDashboardStats {
  myAgentCount: number
  myPluginCount: number
  favoriteAgentCount: number
  favoritePluginCount: number
  myToolCount: number
  myKnowledgeBaseCount: number
  favoriteToolCount: number
  favoriteKnowledgeBaseCount: number
}

export interface RecentFavoriteAgent {
  id: number
  agentName: string
  agentDescription: string
  agentIcon: string
  favoriteTime: string
}

export interface RecentFavoritePlugin {
  id: number
  pluginName: string
  pluginDescription: string
  pluginIcon: string
  favoriteTime: string
}

export interface RecentFavoriteTool {
  id: number
  toolName: string
  toolDescription: string
  toolIcon: string
  favoriteTime: string
}

export interface RecentFavoriteKnowledgeBase {
  id: number
  kbName: string
  kbDescription: string
  kbIcon: string
  favoriteTime: string
}

export function getDashboardStats(signal?: AbortSignal): Promise<ApiResponse<DashboardStats>> {
  return request<DashboardStats>('/api/dashboard/stats?view=llm', { method: 'GET', signal })
}

// Analytics must not redirect, clear login state, or show business-error messages.
// Capture the token for this request so account switches cannot change its owner.
export async function reportPlatformVisit(token: string, signal: AbortSignal): Promise<void> {
  const response = await fetch('/api/dashboard/visit', {
    method: 'POST',
    headers: { satoken: token, 'X-Platform-Visit-Mode': 'pageview' },
    signal, keepalive: true,
  })
  if (!response.ok || (await response.json()).code !== 0) {
    throw new Error('Platform page view report failed')
  }
}

export function getMyDashboardStats(): Promise<ApiResponse<MyDashboardStats>> {
  return get<MyDashboardStats>('/api/dashboard/my-stats')
}

export function getRecentFavoriteAgents(limit: number = 3): Promise<ApiResponse<RecentFavoriteAgent[]>> {
  return get<RecentFavoriteAgent[]>('/api/dashboard/recent-favorite-agents', { limit })
}

export function getRecentFavoritePlugins(limit: number = 3): Promise<ApiResponse<RecentFavoritePlugin[]>> {
  return get<RecentFavoritePlugin[]>('/api/dashboard/recent-favorite-plugins', { limit })
}

export function getRecentFavoriteTools(limit: number = 3): Promise<ApiResponse<RecentFavoriteTool[]>> {
  return get<RecentFavoriteTool[]>('/api/dashboard/recent-favorite-tools', { limit })
}

export function getRecentFavoriteKnowledgeBases(
  limit: number = 3
): Promise<ApiResponse<RecentFavoriteKnowledgeBase[]>> {
  return get<RecentFavoriteKnowledgeBase[]>('/api/dashboard/recent-favorite-knowledge-bases', { limit })
}
