import type { UserInfo } from '@/types/api'

export const AUTH_TOKEN_KEY = 'token'
export const AUTH_USER_INFO_KEY = 'userInfo'

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function getStoredUserInfo(): UserInfo | null {
  const raw = localStorage.getItem(AUTH_USER_INFO_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserInfo
  } catch {
    return null
  }
}

export function setStoredUserInfo(userInfo: UserInfo): void {
  localStorage.setItem(AUTH_USER_INFO_KEY, JSON.stringify(userInfo))
}

export function clearStoredUserInfo(): void {
  localStorage.removeItem(AUTH_USER_INFO_KEY)
}
