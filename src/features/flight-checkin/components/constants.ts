export const QUERY_KEYS = {
  FLIGHT: 'dcs-flight',
  PASSENGERS: 'dcs-passengers',
  PASSENGER: 'dcs-passenger',
  INFANT: 'dcs-infant',
  BAGGAGE: 'dcs-baggage',
  SEGMENT_BAGGAGE: 'dcs-segment-baggage',
  SEAT_MAP: 'dcs-seat-map',
  ACTIVITY: 'dcs-activity',
  SSR_OPTIONS: 'dcs-ssr-options',
  BOARDING_PASS: 'dcs-boarding-pass',
} as const

export const TABLE_CONFIG = {
  PASSENGERS_ID: 'dcs-passengers-table',
  BAGGAGE_ID: 'dcs-baggage-table',
  PASSENGERS_EXPORT: 'passengers.xlsx',
  BAGGAGE_EXPORT: 'baggage.xlsx',
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  /** Counter lists show every row in one scroll area — no pages */
  ALL_ROWS: 10_000,
  SEARCH_KEY: 'query',
  PASSENGER_SEARCH_PLACEHOLDER: 'Name, PNR, document, ticket or seat',
  BAGGAGE_SEARCH_PLACEHOLDER: 'Owner, PNR or tag number',
} as const

export const TABS = ['passengers', 'baggage'] as const
export type CheckinTab = (typeof TABS)[number]

export const BAGGAGE_TYPE_OPTIONS = [
  { label: 'Passenger', value: 'passenger' },
  { label: 'Crew', value: 'crew' },
]
