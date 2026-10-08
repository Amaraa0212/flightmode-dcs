import { env } from './env'

/** flightmode-api (Laravel) — бүх DCS endpoint `${api.base}/dcs/...` */
const base = env.VITE_API_URL.replace(/\/+$/, '')

export const api = {
  base,
  /** POST /api/broadcasting/auth (Sanctum) — outside /v1 */
  broadcastingAuth: `${base.replace(/\/v\d+$/, '')}/broadcasting/auth`,
}

export function joinUrl(base: string, path: string) {
  return `${base}/${path.replace(/^\/+/, '')}`
}
