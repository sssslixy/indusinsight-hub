import { post } from '@/utils/request'
import type {
  LoginResponse,
  AccountLoginRequest,
  PhoneLoginRequest,
  SmsCodeRequest,
  SmsCodeResponse,
  ApiResponse
} from '@/types/api'

const API_BASE = '/api/auth'

/**
 * 账号密码登录
 */
export function accountLogin(data: AccountLoginRequest): Promise<ApiResponse<LoginResponse>> {
  return post<LoginResponse>(`${API_BASE}/login/account`, data)
}

/**
 * 手机号验证码登录
 */
export function phoneLogin(data: PhoneLoginRequest): Promise<ApiResponse<LoginResponse>> {
  return post<LoginResponse>(`${API_BASE}/login/phone`, data)
}

/**
 * 发送验证码
 */
export function sendSmsCode(data: SmsCodeRequest): Promise<ApiResponse<SmsCodeResponse>> {
  return post<SmsCodeResponse>(`${API_BASE}/sms-code`, data)
}
