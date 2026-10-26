import type {
  AuthUser,
  LoginParams,
  LoginResponse,
  LoginResult,
  TwoFactorSetup,
} from '../../types/shared/auth.types'
import type { ApiData, BaseResponse } from '../../types/shared/common.types'
import { client } from './client'

export const authService = {
  /** POST /auth/login → Bearer token (Sanctum), or a challenge when Google Authenticator is on */
  login: async (body: LoginParams): Promise<BaseResponse<LoginResult>> => {
    const res = await client.post<LoginResult>('/auth/login', {
      ...body,
      device_name: 'dcs',
    })
    return { message: 'OK', body: res.data }
  },

  /** POST /auth/two-factor-challenge → Bearer token */
  twoFactorChallenge: async (
    challenge: string,
    code: string
  ): Promise<BaseResponse<LoginResponse>> => {
    const res = await client.post<LoginResponse>('/auth/two-factor-challenge', {
      challenge,
      code,
    })
    return { message: 'OK', body: res.data }
  },

  /** POST /auth/two-factor/setup → secret + otpauth:// URL for the QR code */
  setupTwoFactor: async (
    password: string
  ): Promise<BaseResponse<TwoFactorSetup>> => {
    const res = await client.post<ApiData<TwoFactorSetup>>(
      '/auth/two-factor/setup',
      { password }
    )
    return { message: 'OK', body: res.data.data }
  },

  /** POST /auth/two-factor/confirm → Google Authenticator on */
  confirmTwoFactor: async (code: string): Promise<BaseResponse<AuthUser>> => {
    const res = await client.post<ApiData<AuthUser>>(
      '/auth/two-factor/confirm',
      { code }
    )
    return { message: 'OK', body: res.data.data }
  },

  logout: async () => {
    await client.post('/auth/logout').catch(() => undefined)
    return { message: 'Logged out.', body: null }
  },

  me: async (): Promise<BaseResponse<AuthUser>> => {
    const res = await client.get<ApiData<AuthUser>>('/auth/me')
    return { message: 'OK', body: res.data.data }
  },
}
