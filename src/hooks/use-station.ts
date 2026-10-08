import { useAuthStore } from '@/stores/auth-store'
import { DEFAULT_STATION } from '@/config/app'

export type Station = {
  code: string
  name: string
  shortName: string
  city: string
  timezone: string
}

/** Нэвтэрсэн ажилтны станц (user.airport), байхгүй бол DEFAULT_STATION */
export function useStation(): Station {
  const airport = useAuthStore((s) => s.auth.user?.airport)
  if (!airport) return DEFAULT_STATION
  return {
    code: airport.iata_code,
    name: airport.name,
    shortName: airport.name.replace(/\s*International Airport$|\s*Airport$/i, ''),
    city: airport.city,
    timezone: airport.timezone,
  }
}
