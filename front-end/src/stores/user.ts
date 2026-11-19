import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo } from '@/types/api'
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getStoredUserInfo,
  setStoredUserInfo,
  clearStoredUserInfo,
} from '@/utils/storage/auth'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string | null>(getAuthToken())
  const userInfo = ref<UserInfo | null>(null)
  
  const adminAccessDenied = ref(false)
  const isAdmin = computed(() => userInfo.value?.account === 'admin' && !adminAccessDenied.value)

  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  
  // 设置登录信息
  function setLoginInfo(newToken: string, newUserInfo: UserInfo) {
    adminAccessDenied.value = false
    token.value = newToken
    userInfo.value = newUserInfo
    setAuthToken(newToken)
    setStoredUserInfo(newUserInfo)
  }
  
  // 清除登录信息
  function clearLoginInfo() {
    adminAccessDenied.value = false
    token.value = null
    userInfo.value = null
    clearAuthToken()
    clearStoredUserInfo()
  }

  // 更新当前登录用户基础信息（例如头像、昵称）
  function updateProfile(patch: Partial<Pick<UserInfo, 'username' | 'avatar'>>) {
    if (!userInfo.value) return
    userInfo.value = { ...userInfo.value, ...patch }
    setStoredUserInfo(userInfo.value)
  }
  
  // 从本地存储恢复用户信息
  function restoreUserInfo() {
    const savedToken = getAuthToken()
    const savedUserInfo = getStoredUserInfo()

    if (savedToken && savedUserInfo) {
      token.value = savedToken
      userInfo.value = savedUserInfo
    }
  }
  
  // 初始化时恢复用户信息
  restoreUserInfo()
  
  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    adminAccessDenied,
    setLoginInfo,
    clearLoginInfo,
    updateProfile,
    restoreUserInfo
  }
})
