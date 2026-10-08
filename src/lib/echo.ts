import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/config/api'
import { env } from '@/config/env'

/**
 * Laravel Reverb client (flightmode-api `php artisan reverb:start`).
 * Private channels are authorised with the Sanctum Bearer token at POST /api/broadcasting/auth.
 * Returns null when no Reverb key is configured — the app then works without live updates.
 */
let echo: Echo<'reverb'> | null | undefined

export function getEcho(): Echo<'reverb'> | null {
  if (echo !== undefined) return echo
  if (!env.VITE_REVERB_APP_KEY) return (echo = null)

  ;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher

  echo = new Echo({
    broadcaster: 'reverb',
    key: env.VITE_REVERB_APP_KEY,
    wsHost: env.VITE_REVERB_HOST ?? window.location.hostname,
    wsPort: env.VITE_REVERB_PORT,
    wssPort: env.VITE_REVERB_PORT,
    forceTLS: env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    // echo is created after sign-in and dropped on sign-out, so the token here is current
    authEndpoint: api.broadcastingAuth,
    auth: {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${useAuthStore.getState().auth.token}`,
      },
    },
  })
  return echo
}

/** Close the socket on sign-out */
export function disconnectEcho() {
  echo?.disconnect()
  echo = undefined
}
