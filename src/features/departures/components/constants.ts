export const QUERY_KEYS = {
  FLIGHT_LIST: 'dcs-flight-list',
} as const

export const DEPARTURE_FILTERS = [
  { value: 'all', label: 'All Flights' },
  { value: 'checkin_open', label: 'Check-in open' },
  { value: 'gate_closed', label: 'Boarding' },
  { value: 'checkin_closed', label: 'Check-in closed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'departed', label: 'Departed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export type DepartureFilter = (typeof DEPARTURE_FILTERS)[number]['value']
