// 用户信息
export interface UserInfo {
  id: number
  account: string
  username: string
  phone: string | null
  avatar: string
}

// 用户详细资料（用于个人资料页）
export interface UserProfile {
  hasPassword: boolean
  id: number
  phone: string | null
  account: string
  username: string
  avatar: string
  status: number
  statusLabel: string
  lastLoginAt: string
  passwordUpdatedAt: string
  createdAt: string
}

// 登录响应
export interface LoginResponse {
  token: string
  userInfo: UserInfo
  isNewUser: boolean
}

// 账号登录请求
export interface AccountLoginRequest {
  account: string
  password: string
}

// 手机号登录请求
export interface PhoneLoginRequest {
  phone: string
  code: string
}

// 发送验证码请求
export interface SmsCodeRequest {
  phone: string
  scene?: 'LOGIN' | 'CHANGE_PASSWORD'
}

export interface SmsCodeResponse {
  retryAfterSeconds: number
  expiresInSeconds: number
}

// 最近活动
export interface RecentActivity {
  activityType: string
  activityLabel: string
  targetId: number
  targetName: string
  targetType: string
  activityTime: string
  iconType: string
}
