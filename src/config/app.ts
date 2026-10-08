export const APP = {
  name: 'FlightMode DCS',
  subtitle: 'Check-in counter',
  build: 'App Build 3.0.0 (DCS)',
} as const

/**
 * Default station — нэвтрэхээс өмнө (sign-in) харагдана.
 * Нэвтэрсний дараа /auth/me → user.airport ашиглана (useStation).
 */
export const DEFAULT_STATION = {
  code: 'UBN',
  name: 'Chinggis Khaan International Airport',
  shortName: 'Chinggis Khaan',
  city: 'Ulaanbaatar',
  timezone: 'Asia/Ulaanbaatar',
} as const
