import type { AuthUser, LoginParams, LoginResponse } from '../../types/shared/auth.types'
import type { ApiData, BaseResponse } from '../../types/shared/common.types'
import { client } from './client'

export const authService = {
  /** POST /auth/login → Bearer token (Sanctum) */
  login: async (body: LoginParams): Promise<BaseResponse<LoginResponse>> => {
    const res = await client.post<LoginResponse>('/auth/login', { ...body, device_name: 'dcs' })
    return { message: 'OK', body: res.data }
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
