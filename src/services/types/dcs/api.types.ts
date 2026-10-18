/**
 * flightmode-api raw JSON (app/Http/Resources/*). Service давхарга эдгээрийг
 * dcs.types.ts дахь UI төрлүүд рүү adapters.ts-ээр хөрвүүлнэ.
 */
import type {
  CabinClass,
  FlightStatus,
  Gender,
  PassengerType,
  SegmentStatus,
} from './dcs.types'

export interface ApiAirport {
  id: number
  iata_code: string
  icao_code: string | null
  name: string
  city: string
  timezone: string
}

export interface ApiFlight {
  id: number
  flight_number: string
  airline: { id: number; name: string; iata_code: string }
  aircraft: { id: number; registration: string; type: string; total_seats: number } | null
  origin: ApiAirport
  destination: ApiAirport
  scheduled_departure_at: string
  scheduled_arrival_at: string
  estimated_departure_at: string | null
  departure_local: string | null
  scheduled_departure_local: string | null
  scheduled_arrival_local: string | null
  terminal: string | null
  gate: string | null
  status: FlightStatus
  status_reason: string | null
  excess_baggage_max_kg: string | null
  excess_baggage_price_per_kg: string | null
  passenger_counts?: { booked: number; checked_in: number; boarded: number }
}

type TypeCounts = { ADT: number; CHD: number; INF: number; total: number; total_with_infants: number }

export interface ApiFlightStatistics {
  capacity: { total: number; cabins: Record<string, number> }
  booked: TypeCounts
  checked_in: TypeCounts
  boarded: TypeCounts
  waitlisted: number
  go_show: number
  online_checkin: number
  by_cabin: Record<string, TypeCounts>
  ssr: Record<string, number>
  baggage: {
    pieces: number
    weight_kg: number
    passengers: number
    crew_pieces: number
    crew_weight_kg: number
    excess_amount: number
  }
}

export interface ApiBaggageTag {
  id: number
  tag_number: string
  sequence: number
}

export interface ApiCheckedBaggage {
  id: number
  flight_id: number
  passenger_segment_id: number | null
  passenger?: { id: number; name: string; pnr: string | null } | null
  type: 'passenger' | 'crew'
  crew_name?: string | null
  baggage_rule?: { id: number; name: string; ssr_code: string | null } | null
  pieces: number
  weight_kg: string
  free_allowance_kg: string
  price: string
  excess_price: string
  payment_reference?: string | null
  waived_amount?: string | null
  waive_reason?: string | null
  waive_authorized_by?: string | null
  currency: string
  description: string | null
  tags?: ApiBaggageTag[]
  created_at: string
}

export interface ApiPassenger {
  id: number
  booking_id: number
  pnr?: string
  agency?: { id: number; name: string } | null
  type: PassengerType | null
  infant_of_passenger_id: number | null
  first_name: string
  middle_name: string | null
  last_name: string
  gender: Gender | null
  date_of_birth: string | null
  nationality: string | null
  document_type: string | null
  document_number: string | null
  document_issuing_country: string | null
  document_expires_at: string | null
  email: string | null
  phone: string | null
  emergency_contact: string | null
  remark: string | null
  infant?: ApiPassenger | null
  segments?: ApiSegment[]
}

export interface ApiSegment {
  id: number
  passenger_id: number
  flight_id: number
  cabin_class: CabinClass
  fare_class: string | null
  ticket_number: string | null
  seat_number: string | null
  status: SegmentStatus
  is_go_show: boolean
  boarding_sequence: number | null
  checkin_group_id: number | null
  checkin_channel: 'dcs' | 'online' | 'agency' | null
  checked_in_at: string | null
  boarded_at: string | null
  ssr_codes?: string[]
  prepaid_baggage?: { pieces: number; weight_kg: number }
  baggage?: ApiCheckedBaggage[]
  passenger?: ApiPassenger
  screening?: ApiScreening
}

export interface ApiScreening {
  status: 'cleared' | 'watch' | 'banned'
  bans: { id: number; ban_type: string; reason: string; valid_until: string | null }[]
}

export interface ApiSeat {
  seat_number: string
  row: number
  column: string
  side: 'left' | 'middle' | 'right'
  seat_type: string
  cabin_class: CabinClass
  zone: string | null
  is_emergency_exit: boolean
  state: 'available' | 'occupied' | 'blocked' | 'held' | 'restricted'
  price?: string
  occupant?: { segment_id: number; passenger_id: number; name: string; status: SegmentStatus }
}

export interface ApiSeatMap {
  flight_id: number
  layout: { left: string[]; middle: string[]; right: string[] }
  rows: number[]
  seats: ApiSeat[]
}

export interface ApiBaggageRule {
  id: number
  name: string
  type: 'piece' | 'weight'
  cabin_class: CabinClass | null
  pieces: number | null
  weight_kg: string | null
  max_quantity: number | null
  price: string
  currency: string
  ssr_code: string | null
  is_active: boolean
}

export interface ApiBaggageRules {
  rules: ApiBaggageRule[]
  prepaid_pieces: number
  excess_price_per_kg: string | null
  excess_max_kg: string | null
  accepted: ApiCheckedBaggage[]
}

export interface ApiActivityLog {
  id: number
  channel: string
  event: string
  description: string
  user: { id: number; name: string } | null
  created_at: string
}

export interface ApiSsrOption {
  code: string
  name: string
  price: string | null
}

export interface ApiBoardingPass {
  segment_id: number
  airline: { name: string; iata_code: string; logo_path: string | null; logo_url: string | null }
  passenger: { name: string; type: PassengerType }
  pnr: string
  flight_number: string
  origin: { code: string; name: string; city: string }
  destination: { code: string; name: string; city: string }
  departure_date: string
  departure_time: string
  arrival_date: string
  arrival_time: string
  boarding_time: string
  gate: string | null
  terminal: string | null
  seat_number: string
  seat_type: string | null
  zone: string | null
  cabin_class: CabinClass
  boarding_sequence: number | null
  infant: { name: string; type: PassengerType } | null
  baggage: { pieces: number; weight_kg: number } | null
  /** Tag numbers of the passenger's bags (printed as "BAG #01: …") */
  bag_tags: string[]
  barcode: string
  [key: string]: unknown
}

export interface ApiBaggageQuote {
  free_allowance_kg: number
  excess_kg: number
  excess_price: number
  price: number
  excess_price_per_kg: number
  /** combined (piece + kg) rule: free kg left after this bag */
  remaining_allowance_kg: number | null
  currency: string
}

/** GET /dcs/baggage-tags/{tag} */
export interface ApiBagTag {
  tag_number: string
  barcode: string
  airline: { name: string; iata_code: string; logo_url: string | null; layout: unknown }
  flight_number: string
  date: string
  origin: string
  destination: { code: string; city: string; name: string }
  passenger: string
  /** MR / MRS — null for crew bags */
  passenger_title: string | null
  is_crew: boolean
  pnr: string | null
  piece: string
  weight_kg: string
}

/** GET /announcements (shared) */
export interface ApiAnnouncement {
  id: number
  airline: { id: number; name: string } | null
  title: string
  body: string
  requires_acknowledgement: boolean
  created_at: string
}

/** GET /dcs/flights/{id}/documents/manifest (ManifestService::build) — printed manifests */
export interface ApiManifest {
  header: {
    airline: string
    airline_logo: string | null
    flight_number: string
    registration: string | null
    aircraft_type: string | null
    origin: string
    destination: string
    std_date: string
    std_time: string
    etd_date: string | null
    etd_time: string | null
  }
  passengers: {
    rows: {
      segment_id: number
      first_name: string
      last_name: string
      gdr: string
      type: PassengerType
      nationality: string | null
      date_of_birth: string | null
      seat_number: string | null
      cabin_class: CabinClass
      ssr: string
      remark: string | null
      bag_pieces: number
      bag_weight_kg: number
      online_no_bags: boolean
    }[]
    totals: { ADT: number; CHD: number; INF: number; total: number }
  }
  baggage: {
    rows: {
      id: number
      segment_id: number | null
      passenger: string
      seat_number: string | null
      cabin_class: CabinClass | null
      checkin_group_id: number | null
      pieces: number
      weight_kg: number
      tags: string[]
      description: string | null
    }[]
    totals: { pieces: number; weight_kg: number }
  }
  balance: {
    rows: {
      zone: string | null
      total: number
      male_adults: number
      female_adults: number
      children: number
      infants: number
      bags: number
      kg: number
    }[]
    totals: { bags: number; kg: number }
  }
}
