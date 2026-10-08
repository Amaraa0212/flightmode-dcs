/** /auth/login → user, /auth/me → data (flightmode-api AuthController::profile) */
export interface AuthUser {
  id: number
  name: string
  email: string
  phone: string | null
  is_active: boolean
  role: { id: number; name: string; slug: string; scope: 'admin' | 'airline' | 'agency' | 'airport' }
  airline: { id: number; name: string } | null
  agency: { id: number; name: string } | null
  airport: {
    id: number
    iata_code: string
    name: string
    city: string
    timezone: string
  } | null
  permissions: string[]
  is_system_admin: boolean
  last_login_at: string | null
}

export interface LoginParams {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  token_type: 'Bearer'
  user: AuthUser
}
