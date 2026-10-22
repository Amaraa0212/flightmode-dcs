import type { ListParams } from '../shared/common.types'

/**
 * UI-д ашиглах DCS төрлүүд. flightmode-api-ийн raw JSON (api.types.ts) нь
 * services/api/dcs/adapters.ts-ээр эдгээр рүү хөрвөнө.
 */

export type CabinClass = 'F' | 'C' | 'W' | 'Y'
export type PassengerType = 'ADT' | 'CHD' | 'INF'
export type Gender = 'M' | 'F'

export type FlightStatus =
  | 'scheduled'
  | 'checkin_open'
  | 'checkin_closed'
  | 'gate_closed'
  | 'departed'
  | 'cancelled'

export type SegmentStatus =
  | 'booked'
  | 'waitlisted'
  | 'checked_in'
  | 'boarded'
  | 'flown'
  | 'cancelled'

export type CheckinChannel = 'dcs' | 'online' | 'agency'

export interface DcsAirport {
  iata_code: string
  city: string
  name: string
}

export type PaxTypeCounts = { ADT: number; CHD: number; INF: number }

export interface FlightStats {
  capacity: number
  /** ADT / CHD / INF behind booked, checked in and boarded (full flight statistics only) */
  breakdown?: { booked: PaxTypeCounts; checked_in: PaxTypeCounts; boarded: PaxTypeCounts }
  booked: number
  checked_in: number
  boarded: number
  infants: number
  go_show: number
  waitlisted: number
  online_checked_in: number
  bags: number
  bag_weight_kg: number
}

export interface DcsFlight extends Record<string, unknown> {
  id: number
  flight_number: string
  /** charter (захиалгат): every bag free at the counter */
  service_type: 'scheduled' | 'charter'
  airline: { name: string; iata_code: string }
  aircraft: { registration: string; type: string; total_seats: number }
  origin: DcsAirport
  destination: DcsAirport
  scheduled_departure_at: string
  scheduled_arrival_at: string
  estimated_departure_at: string | null
  /** Station local "HH:mm" (API *_local) */
  departure_time: string
  arrival_time: string
  /** Arrival on a later local calendar day */
  arrives_next_day: boolean
  duration_minutes: number
  terminal: string | null
  gate: string | null
  status: FlightStatus
  status_reason: string | null
  excess_price_per_kg: number
  /** Departures board counts (list) or statistics (detail) */
  stats: FlightStats
}

export interface DcsFlightListParams extends ListParams {
  status?: string
}

export interface BaggageSummary {
  pieces: number
  weight_kg: number
  prepaid_pieces: number
}

export interface DcsInfant {
  passenger_id: number
  first_name: string
  last_name: string
  gender: Gender | null
  date_of_birth: string | null
  nationality: string | null
  document_type: string | null
  document_number: string | null
  document_expires_at: string | null
}

export type ScreeningStatus = 'cleared' | 'watch' | 'banned'

export interface Screening {
  status: ScreeningStatus
  bans: { id: number; ban_type: string; reason: string; valid_until: string | null }[]
}

/** DCS дээрх нэг зорчигч = нэг passenger segment (адилхан API /dcs/flights/{id}/passengers мөр) */
export interface DcsPassenger extends Record<string, unknown> {
  id: number // segment id
  passenger_id: number
  flight_id: number
  pnr: string
  type: PassengerType
  first_name: string
  middle_name: string | null
  last_name: string
  gender: Gender | null
  date_of_birth: string | null
  nationality: string | null
  document_type: string | null
  document_number: string | null
  document_expires_at: string | null
  email: string | null
  phone: string | null
  emergency_contact: string | null
  remark: string | null
  agency: string | null
  cabin_class: CabinClass
  fare_class: string | null
  ticket_number: string | null
  seat_number: string | null
  status: SegmentStatus
  is_go_show: boolean
  ssr_codes: string[]
  group_id: number | null
  boarding_sequence: number | null
  checkin_channel: CheckinChannel | null
  checked_in_at: string | null
  boarded_at: string | null
  baggage: BaggageSummary
  infant: DcsInfant | null
  /** Ban-list screening (DCS only) */
  screening: Screening | null
}

export interface DcsPassengerListParams extends ListParams {
  status?: string | string[]
  cabin?: string | string[]
}

export interface BaggageTag {
  id: number
  tag_number: string
  sequence: number
}

export interface CheckedBaggage extends Record<string, unknown> {
  id: number
  flight_id: number
  segment_id: number | null
  type: 'passenger' | 'crew' | 'cargo'
  crew_name: string | null
  owner: string
  pnr: string | null
  rule: string | null
  pieces: number
  weight_kg: number
  free_allowance_kg: number
  excess_kg: number
  excess_price: number
  price: number
  /** billing / transaction number of the excess payment */
  payment_reference: string | null
  /** excess not collected (waived) */
  waived_amount: number
  waive_reason: string | null
  waive_authorized_by: string | null
  currency: string
  description: string | null
  tags: BaggageTag[]
  created_at: string
}

export interface BaggageRule {
  id: number
  name: string
  /** combined = max pieces and one shared free kg pool */
  type: 'piece' | 'weight' | 'combined'
  cabin_class: CabinClass | null
  pieces: number | null
  weight_kg: number | null
  max_quantity: number | null
  price: number
  ssr_code: string | null
}

export interface BaggageRulesForSegment {
  /** charter flight: every bag is free — no rule, limit or excess (legacy DCS) */
  is_charter: boolean
  rules: BaggageRule[]
  prepaid_pieces: number
  excess_price_per_kg: number
  excess_max_kg: number | null
  accepted: CheckedBaggage[]
}

/** POST /dcs/segments/{id}/baggage — price / allowance are calculated by the API */
export interface AddBaggagePayload {
  /** not sent on a charter flight — every bag is free there */
  baggage_rule_id?: number
  pieces: number
  weight_kg: number
  description?: string
  /** excess: paid … */
  payment_reference?: string
  /** … or waived, with who allowed it */
  waive_reason?: string
  waive_authorized_by?: string
}

/** POST /dcs/segments/{id}/baggage/quote */
export interface BaggageQuote {
  free_allowance_kg: number
  excess_kg: number
  excess_price: number
  price: number
  excess_price_per_kg: number
  remaining_allowance_kg: number | null
  currency: string
}

/** POST /dcs/flights/{id}/crew-baggage */
export interface AddCrewBaggagePayload {
  crew_name?: string
  pieces: number
  weight_kg: number
  description?: string
}

export type SeatState = 'available' | 'occupied' | 'blocked' | 'restricted' | 'held'

export interface Seat {
  number: string
  row: number
  letter: string
  cabin_class: CabinClass
  state: SeatState
  /** load / balance zone (A, B, C …) */
  zone: string | null
  /** emergency exit row seat */
  is_exit: boolean
  segment_id: number | null
  occupant_name: string | null
  checked_in: boolean
}

/** 'aisle' = gangway, null = no seat at this position (e.g. 1B in a 2-2 business row) */
export type SeatCell = Seat | 'aisle' | null

export interface SeatMapRow {
  row: number
  cabin_class: CabinClass
  zone: string | null
  is_exit: boolean
  seats: SeatCell[]
}

export interface SeatMap {
  flight_id: number
  aircraft_type: string
  rows: SeatMapRow[]
}

export interface PassengerActivity {
  id: number
  /** dcs | gate | online | admin … — where the action was made */
  channel: string
  event: string
  description: string
  user: string
  created_at: string
}

export interface SsrOption {
  code: string
  name: string
}

export interface InfantPayload {
  last_name: string
  first_name: string
  gender: Gender
  date_of_birth: string
  nationality: string
  document_type: string
  document_number: string
  document_expires_at: string
}

/** PUT /dcs/passengers/{id} (flightmode-api PassengerFields, creating: false) */
export interface PassengerPayload {
  last_name: string
  first_name: string
  middle_name?: string
  emergency_contact?: string
  /** null removes the infant, an object adds / updates it */
  infant?: InfantPayload | null
  gender: Gender
  date_of_birth: string
  nationality: string
  document_type: string
  document_number: string
  document_expires_at: string
  phone?: string
  email?: string
  ssr_codes: string[]
  remark?: string
}

/** POST /dcs/flights/{id}/passengers (go-show) */
export interface GoShowPayload extends PassengerPayload {
  cabin_class: CabinClass
}

export interface Announcement {
  id: number
  airline: string | null
  title: string
  body: string
  requires_acknowledgement: boolean
  created_at: string
}

export type { ApiBoardingPass as BoardingPass, ApiBagTag as BagTag } from './api.types'
