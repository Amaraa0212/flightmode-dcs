import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/config/api'
import type { ApiErrorBody } from '../../types/shared/common.types'

/** flightmode-api business / validation error (HTTP 422 гэх мэт) */
export class ApiError extends Error {
  status: number
  code?: string
  errors?: Record<string, string[]>

  constructor(message: string, status: number, code?: string, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export const client = axios.create({
  baseURL: api.base,
  headers: { Accept: 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().auth.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data
    const isLogin = error.config?.url?.includes('/auth/login')

    if (status === 401 && !isLogin) {
      useAuthStore.getState().auth.reset()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/sign-in')) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.replace(`/sign-in?redirect=${redirect}`)
      }
    }

    // No answer from Laravel: network error, or the Vite dev proxy's empty 5xx when flightmode-api is not running
    const unreachable = status === 0 || (status >= 500 && !body)

    // Validation: show the first field message ("The e-mail or password is incorrect.")
    const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined
    const message =
      firstFieldError ??
      body?.message ??
      (unreachable
        ? 'Cannot reach flightmode-api. Start it with `php artisan serve` (port 8000).'
        : error.message)

    return Promise.reject(new ApiError(message, status, body?.code, body?.errors))
  }
)
