/** /auth/login → user, /auth/me → data (flightmode-api AuthController::profile) */
export interface AuthUser {
  id: number
  name: string
  email: string
  phone: string | null
  is_active: boolean
  role: {
    id: number
    name: string
    slug: string
    scope: 'admin' | 'airline' | 'agency' | 'airport'
  }
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
  /** Google Authenticator on: login asks for a 6-digit code */
  two_factor_enabled?: boolean
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

/** /auth/login when Google Authenticator is on → POST /auth/two-factor-challenge */
export interface TwoFactorChallenge {
  two_factor_required: true
  challenge: string
}

export type LoginResult = LoginResponse | TwoFactorChallenge

/** POST /auth/two-factor/setup */
export interface TwoFactorSetup {
  secret: string
  otpauth_url: string
}
