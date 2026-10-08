import type {
  ApiActivityLog,
  ApiBaggageRule,
  ApiBaggageRules,
  ApiCheckedBaggage,
  ApiFlight,
  ApiFlightStatistics,
  ApiSeatMap,
  ApiSegment,
} from '../../types/dcs/api.types'
import type {
  BaggageRule,
  BaggageRulesForSegment,
  CheckedBaggage,
  DcsFlight,
  DcsPassenger,
  FlightStats,
  PassengerActivity,
  Seat,
  SeatCell,
  SeatMap,
  SeatMapRow,
} from '../../types/dcs/dcs.types'

/** flightmode-api raw JSON → UI төрлүүд */

const num = (value: string | number | null | undefined) => Number(value ?? 0) || 0

function localTime(local: string | null, fallbackIso: string) {
  // API: "YYYY-MM-DD HH:mm" in the airport's timezone
  if (local) return local.slice(11, 16)
  return new Date(fallbackIso).toISOString().slice(11, 16)
}

const emptyStats = (capacity: number): FlightStats => ({
  capacity,
  booked: 0,
  checked_in: 0,
  boarded: 0,
  infants: 0,
  go_show: 0,
  waitlisted: 0,
  online_checked_in: 0,
  bags: 0,
  bag_weight_kg: 0,
})

export function toFlight(api: ApiFlight, statistics?: ApiFlightStatistics): DcsFlight {
  const capacity = api.aircraft?.total_seats ?? 0
  const departureLocal = api.departure_local ?? api.scheduled_departure_local
  const stats = statistics
    ? toStats(statistics)
    : {
        ...emptyStats(capacity),
        booked: api.passenger_counts?.booked ?? 0,
        checked_in: api.passenger_counts?.checked_in ?? 0,
        boarded: api.passenger_counts?.boarded ?? 0,
      }

  return {
    id: api.id,
    flight_number: api.flight_number,
    airline: { name: api.airline.name, iata_code: api.airline.iata_code },
    aircraft: {
      registration: api.aircraft?.registration ?? '—',
      type: api.aircraft?.type ?? 'Aircraft not assigned',
      total_seats: capacity,
    },
    origin: { iata_code: api.origin.iata_code, city: api.origin.city, name: api.origin.name },
    destination: {
      iata_code: api.destination.iata_code,
      city: api.destination.city,
      name: api.destination.name,
    },
    scheduled_departure_at: api.scheduled_departure_at,
    scheduled_arrival_at: api.scheduled_arrival_at,
    estimated_departure_at: api.estimated_departure_at,
    departure_time: localTime(departureLocal, api.scheduled_departure_at),
    arrival_time: localTime(api.scheduled_arrival_local, api.scheduled_arrival_at),
    arrives_next_day:
      !!departureLocal &&
      !!api.scheduled_arrival_local &&
      api.scheduled_arrival_local.slice(0, 10) > departureLocal.slice(0, 10),
    duration_minutes: Math.round(
      (new Date(api.scheduled_arrival_at).getTime() -
        new Date(api.scheduled_departure_at).getTime()) /
        60_000
    ),
    terminal: api.terminal,
    gate: api.gate,
    status: api.status,
    status_reason: api.status_reason,
    excess_price_per_kg: num(api.excess_baggage_price_per_kg),
    stats,
  }
}

export function toStats(s: ApiFlightStatistics): FlightStats {
  return {
    capacity: s.capacity.total,
    booked: s.booked.total,
    checked_in: s.checked_in.total,
    boarded: s.boarded.total,
    infants: s.booked.INF,
    go_show: s.go_show,
    waitlisted: s.waitlisted,
    online_checked_in: s.online_checkin,
    bags: s.baggage.pieces + s.baggage.crew_pieces,
    bag_weight_kg: s.baggage.weight_kg + s.baggage.crew_weight_kg,
  }
}

export function toBaggage(api: ApiCheckedBaggage): CheckedBaggage {
  const weight = num(api.weight_kg)
  const allowance = num(api.free_allowance_kg)
  const who = api.passenger
  return {
    id: api.id,
    flight_id: api.flight_id,
    segment_id: api.passenger_segment_id,
    type: api.type,
    crew_name: api.crew_name ?? null,
    owner: api.type === 'crew' ? (api.crew_name ?? api.description ?? 'CREW') : (who?.name ?? '—'),
    pnr: who?.pnr ?? null,
    rule: api.baggage_rule?.name ?? null,
    pieces: api.pieces,
    weight_kg: weight,
    free_allowance_kg: allowance,
    excess_kg: allowance > 0 ? Math.max(0, weight - allowance) : 0,
    excess_price: num(api.excess_price),
    price: num(api.price),
    currency: api.currency,
    description: api.description,
    tags: api.tags ?? [],
    created_at: api.created_at,
  }
}

export function toPassenger(api: ApiSegment): DcsPassenger {
  const p = api.passenger!
  const bags = api.baggage ?? []
  return {
    id: api.id,
    passenger_id: api.passenger_id,
    flight_id: api.flight_id,
    pnr: p.pnr ?? '',
    type: p.type ?? 'ADT',
    first_name: p.first_name,
    middle_name: p.middle_name,
    last_name: p.last_name,
    gender: p.gender,
    date_of_birth: p.date_of_birth,
    nationality: p.nationality,
    document_type: p.document_type,
    document_number: p.document_number,
    document_expires_at: p.document_expires_at,
    email: p.email,
    phone: p.phone,
    emergency_contact: p.emergency_contact,
    remark: p.remark,
    agency: p.agency?.name ?? null,
    cabin_class: api.cabin_class,
    fare_class: api.fare_class,
    ticket_number: api.ticket_number,
    seat_number: api.seat_number,
    status: api.status,
    is_go_show: api.is_go_show,
    ssr_codes: api.ssr_codes ?? [],
    group_id: api.checkin_group_id,
    boarding_sequence: api.boarding_sequence,
    checkin_channel: api.checkin_channel,
    checked_in_at: api.checked_in_at,
    boarded_at: api.boarded_at,
    baggage: {
      pieces: bags.reduce((s, b) => s + b.pieces, 0),
      weight_kg: bags.reduce((s, b) => s + num(b.weight_kg), 0),
      prepaid_pieces: api.prepaid_baggage?.pieces ?? 0,
    },
    infant: p.infant
      ? {
          passenger_id: p.infant.id,
          first_name: p.infant.first_name,
          last_name: p.infant.last_name,
          gender: p.infant.gender,
          date_of_birth: p.infant.date_of_birth,
          nationality: p.infant.nationality,
          document_type: p.infant.document_type,
          document_number: p.infant.document_number,
          document_expires_at: p.infant.document_expires_at,
        }
      : null,
    screening: api.screening ?? null,
  }
}

export function toRule(api: ApiBaggageRule): BaggageRule {
  return {
    id: api.id,
    name: api.name,
    type: api.type,
    cabin_class: api.cabin_class,
    pieces: api.pieces,
    weight_kg: api.weight_kg === null ? null : num(api.weight_kg),
    max_quantity: api.max_quantity,
    price: num(api.price),
    ssr_code: api.ssr_code,
  }
}

export function toRulesForSegment(api: ApiBaggageRules): BaggageRulesForSegment {
  return {
    rules: api.rules.map(toRule),
    prepaid_pieces: api.prepaid_pieces,
    excess_price_per_kg: num(api.excess_price_per_kg),
    excess_max_kg: api.excess_max_kg === null ? null : num(api.excess_max_kg),
    accepted: api.accepted.map(toBaggage),
  }
}

export function toSeatMap(api: ApiSeatMap, aircraftType: string): SeatMap {
  const sides = (['left', 'middle', 'right'] as const).filter((s) => api.layout[s].length)
  const bySeat = new Map(api.seats.map((s) => [s.seat_number, s]))

  const rows: SeatMapRow[] = api.rows.map((row) => {
    const cells: SeatCell[] = []
    sides.forEach((side, index) => {
      if (index > 0) cells.push('aisle')
      api.layout[side].forEach((letter) => {
        const s = bySeat.get(`${row}${letter}`)
        cells.push(
          s
            ? {
                number: s.seat_number,
                row,
                letter,
                cabin_class: s.cabin_class,
                state: s.state,
                zone: s.zone,
                is_exit: s.is_emergency_exit,
                segment_id: s.occupant?.segment_id ?? null,
                occupant_name: s.occupant?.name ?? null,
                checked_in: !!s.occupant && ['checked_in', 'boarded', 'flown'].includes(s.occupant.status),
              }
            : null
        )
      })
    })
    const seats = cells.filter((c): c is Seat => c !== null && c !== 'aisle')
    return {
      row,
      cabin_class: seats[0]?.cabin_class ?? 'Y',
      zone: seats[0]?.zone ?? null,
      is_exit: seats.some((s) => s.is_exit),
      seats: cells,
    }
  })

  return { flight_id: api.flight_id, aircraft_type: aircraftType, rows }
}

export function toActivity(api: ApiActivityLog): PassengerActivity {
  return {
    id: api.id,
    channel: api.channel,
    event: api.event,
    description: api.description,
    user: api.user?.name ?? 'System',
    created_at: api.created_at,
  }
}
