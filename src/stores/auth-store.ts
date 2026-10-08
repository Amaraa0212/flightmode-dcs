import { create } from 'zustand'
import type { AuthUser } from '@/services/types/shared/auth.types'

const USER_INFO = 'user_info'
const ACCESS_TOKEN = 'access_token'

interface AuthState {
  auth: {
    user: AuthUser | null
    token: string
    setUser: (user: AuthUser | null) => void
    setSession: (token: string, user: AuthUser) => void
    reset: () => void
  }
}

function read<T>(key: string, parse: (raw: string) => T): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? parse(raw) : null
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Ignore storage errors.
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: read(USER_INFO, (raw) => JSON.parse(raw) as AuthUser),
    token: read(ACCESS_TOKEN, (raw) => raw) ?? '',
    setUser: (user) => {
      write(USER_INFO, user ? JSON.stringify(user) : null)
      set((state) => ({ ...state, auth: { ...state.auth, user } }))
    },
    setSession: (token, user) => {
      write(ACCESS_TOKEN, token)
      write(USER_INFO, JSON.stringify(user))
      set((state) => ({ ...state, auth: { ...state.auth, token, user } }))
    },
    reset: () => {
      write(ACCESS_TOKEN, null)
      write(USER_INFO, null)
      set((state) => ({ ...state, auth: { ...state.auth, token: '', user: null } }))
    },
  },
}))
