import { z } from 'zod'

/** Absolute URL, or a path like `/api/v1` (Vite proxy in development). */
const urlOrPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/') || URL.canParse(value), {
    message: 'Must be an absolute URL or a path starting with /',
  })

const envSchema = z.object({
  // flightmode-api base (routes/api.php → /api/v1). Dev: Vite proxy → VITE_API_PROXY_TARGET
  VITE_API_URL: urlOrPathSchema.default('/api/v1'),

  // Laravel Reverb (live updates between counters). No key → live updates are off.
  VITE_REVERB_APP_KEY: z.string().optional(),
  VITE_REVERB_HOST: z.string().optional(),
  VITE_REVERB_PORT: z.coerce.number().default(8090),
  VITE_REVERB_SCHEME: z.enum(['http', 'https']).default('http'),
})

export const env = envSchema.parse(import.meta.env)
