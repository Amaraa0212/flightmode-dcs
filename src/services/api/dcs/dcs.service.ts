import type {
  ApiActivityLog,
  ApiAnnouncement,
  ApiBagTag,
  ApiBaggageQuote,
  ApiBaggageRules,
  ApiBoardingPass,
  ApiCheckedBaggage,
  ApiFlight,
  ApiFlightStatistics,
  ApiManifest,
  ApiPassenger,
  ApiSeatMap,
  ApiSegment,
  ApiSsrOption,
} from '../../types/dcs/api.types'
import type {
  AddBaggagePayload,
  AddCrewBaggagePayload,
  Announcement,
  BaggageQuote,
  DcsFlightListParams,
  DcsPassenger,
  DcsPassengerListParams,
  GoShowPayload,
  PassengerPayload,
  SsrOption,
} from '../../types/dcs/dcs.types'
import type {
  ApiAction,
  ApiData,
  BaseResponse,
  ListParams,
} from '../../types/shared/common.types'
import { filterAndPaginate } from '../../lib/list'
import { client } from '../shared/client'
import {
  toActivity,
  toBaggage,
  toFlight,
  toPassenger,
  toRulesForSegment,
  toSeatMap,
} from './adapters'

/*
| DCS service — flightmode-api routes/api/v1/dcs.php
|   GET  /dcs/flights                         departures board (+ passenger_counts)
|   GET  /dcs/flights/{id}                    flight + statistics
|   POST /dcs/flights/{id}/open|close         counter
|   GET  /dcs/flights/{id}/passengers         adults with infant, bags, SSR
|   POST /dcs/flights/{id}/passengers         go-show
|   GET  /dcs/segments/{id}                   one passenger (General Info)
|   PUT  /dcs/passengers/{passengerId}        edit passenger
|   GET  /dcs/passengers/{passengerId}/activity
|   POST|DELETE /dcs/segments/{id}/check-in   check in / change seat / un-check
|   GET  /dcs/segments/{id}/boarding-pass
|   GET  /dcs/segments/{id}/baggage-rules     rules + accepted bags
|   POST /dcs/segments/{id}/baggage, DELETE /dcs/baggage/{id}
|   GET  /dcs/flights/{id}/baggage, POST /dcs/flights/{id}/crew-baggage
|   GET  /dcs/flights/{id}/seat-map, /dcs/flights/{id}/ssr-codes
|   GET  /dcs/flights/{id}/documents/manifest?format=xlsx
*/

const ok = <T>(body: T, message = 'OK'): BaseResponse<T> => ({ message, body })

async function action<T, R>(
  request: Promise<{ data: ApiAction<T> }>,
  map: (data: T) => R
): Promise<BaseResponse<R>> {
  const res = await request
  return ok(res.data.data !== undefined ? map(res.data.data) : (null as R), res.data.message)
}

async function getFlightRaw(id: number) {
  const res = await client.get<ApiData<{ flight: ApiFlight; statistics: ApiFlightStatistics }>>(
    `/dcs/flights/${id}`
  )
  return res.data.data
}

// ─── Flights ───
export const dcsFlightService = {
  /** Departures board — API has no pagination; search / status filter here. */
  list: async (params: DcsFlightListParams = {}) => {
    const res = await client.get<ApiData<ApiFlight[]>>('/dcs/flights')
    return ok(
      filterAndPaginate(res.data.data.map((f) => toFlight(f)), params, {
        searchKeys: ['flight_number', 'destination.iata_code', 'destination.city', 'airline.name'],
        filters: { status: (row) => row.status },
      })
    )
  },

  getById: async (id: number) => {
    const { flight, statistics } = await getFlightRaw(id)
    return ok(toFlight(flight, statistics))
  },

  openCheckin: (id: number) =>
    action(client.post<ApiAction<ApiFlight>>(`/dcs/flights/${id}/open`), (f) => toFlight(f)),

  /**
   * closeOnline = true: counter and online check-in close (flight → checkin_closed).
   * closeOnline = false: only the counter closes, online check-in stays open (flight → scheduled) — legacy "end CKI".
   */
  closeCheckin: (id: number, closeOnline = true) =>
    action(client.post<ApiAction<ApiFlight>>(`/dcs/flights/${id}/close`, { close_online: closeOnline }), (f) =>
      toFlight(f)
    ),

  ssrOptions: async (id: number): Promise<BaseResponse<SsrOption[]>> => {
    const res = await client.get<ApiData<ApiSsrOption[]>>(`/dcs/flights/${id}/ssr-codes`)
    return ok(res.data.data.map((s) => ({ code: s.code, name: s.name })))
  },

  /** Data of the printed manifests: W&B (zone load), passenger and baggage manifest */
  manifest: async (id: number) => {
    const res = await client.get<ApiData<ApiManifest>>(`/dcs/flights/${id}/documents/manifest`, {
      params: { parts: ['passengers', 'baggage', 'balance'] },
    })
    return res.data.data
  },

  /** Manifest xlsx (FlightDocumentController::manifest) */
  downloadManifest: async (id: number, flightNumber: string) => {
    const res = await client.get<Blob>(`/dcs/flights/${id}/documents/manifest`, {
      params: { format: 'xlsx' },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${flightNumber}-manifest.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    return ok(null, 'Manifest downloaded')
  },
}

// ─── Passengers / check-in ───
export const dcsPassengerService = {
  /** All adults of the flight (infants nested); pagination / filters client side. */
  all: async (flightId: number): Promise<DcsPassenger[]> => {
    const res = await client.get<ApiData<ApiSegment[]>>(`/dcs/flights/${flightId}/passengers`)
    return res.data.data.map(toPassenger)
  },

  paginate: (rows: DcsPassenger[], params: DcsPassengerListParams = {}) =>
    filterAndPaginate(rows, params, {
      searchKeys: [
        'pnr',
        'first_name',
        'last_name',
        'document_number',
        'ticket_number',
        'seat_number',
      ],
      filters: {
        status: (row) => row.status,
        cabin: (row) => row.cabin_class,
      },
    }),

  getById: async (segmentId: number) => {
    const res = await client.get<ApiData<ApiSegment>>(`/dcs/segments/${segmentId}`)
    return ok(toPassenger(res.data.data))
  },

  /** Check in (auto seat) or change seat when seatNumber is given. */
  checkIn: (segmentId: number, seatNumber?: string) =>
    action(
      client.post<ApiAction<ApiSegment>>(`/dcs/segments/${segmentId}/check-in`, {
        seat_number: seatNumber ?? null,
      }),
      (s) => s
    ),

  /** Hold a seat for a booked passenger without checking in (null gives it back); Enter's check-in takes it */
  holdSeat: (segmentId: number, seatNumber: string | null) =>
    action(
      client.put<ApiAction<ApiSegment>>(`/dcs/segments/${segmentId}/seat`, { seat_number: seatNumber }),
      (s) => s
    ),

  changeSeat: (segmentId: number, seatNumber: string) =>
    action(
      client.post<ApiAction<ApiSegment>>(`/dcs/segments/${segmentId}/check-in`, {
        seat_number: seatNumber,
      }),
      (s) => s
    ),

  uncheck: (segmentId: number) =>
    action(client.delete<ApiAction<ApiSegment>>(`/dcs/segments/${segmentId}/check-in`), (s) => s),

  update: (passengerId: number, payload: PassengerPayload) =>
    action(client.put<ApiAction<ApiPassenger>>(`/dcs/passengers/${passengerId}`, payload), (p) => p),

  /** Go-show → returns the new segment id so the panel can select it. */
  addGoShow: (flightId: number, payload: GoShowPayload) =>
    action(
      client.post<ApiAction<ApiPassenger>>(`/dcs/flights/${flightId}/passengers`, payload),
      (p) => ({ segment_id: p.segments?.find((s) => s.flight_id === flightId)?.id ?? null })
    ),

  activity: async (passengerId: number) => {
    const res = await client.get<ApiData<ApiActivityLog[]>>(
      `/dcs/passengers/${passengerId}/activity`
    )
    return ok(res.data.data.map(toActivity))
  },

  /** Check-in group: passengers who share baggage (legacy Group Modal) */
  group: (flightId: number, segmentIds: number[], name?: string) =>
    action(
      client.post<ApiAction<{ id: number; segment_ids: number[] }>>(`/dcs/flights/${flightId}/groups`, {
        segment_ids: segmentIds,
        name,
      }),
      (g) => g
    ),

  ungroup: async (segmentId: number) => {
    const res = await client.delete<ApiAction<null>>(`/dcs/segments/${segmentId}/group`)
    return ok(null, res.data.message)
  },

  boardingPass: async (segmentId: number) => {
    const res = await client.get<ApiData<ApiBoardingPass>>(
      `/dcs/segments/${segmentId}/boarding-pass`
    )
    return ok(res.data.data)
  },
}

// ─── Baggage ───
export const dcsBaggageService = {
  list: async (flightId: number, params: ListParams = {}) => {
    const res = await client.get<ApiData<ApiCheckedBaggage[]>>(`/dcs/flights/${flightId}/baggage`)
    return ok(
      filterAndPaginate(res.data.data.map(toBaggage), params, {
        searchKeys: ['owner', 'pnr', 'tags.0.tag_number', 'tags.1.tag_number'],
        filters: { type: (row) => row.type },
      })
    )
  },

  /** Rules the counter may use for the passenger + already accepted bags */
  rulesForSegment: async (segmentId: number) => {
    const res = await client.get<ApiData<ApiBaggageRules>>(
      `/dcs/segments/${segmentId}/baggage-rules`
    )
    return ok(toRulesForSegment(res.data.data))
  },

  /** Price preview — same calculation the API uses when the bag is accepted */
  quote: async (segmentId: number, payload: AddBaggagePayload): Promise<BaseResponse<BaggageQuote>> => {
    const res = await client.post<ApiData<ApiBaggageQuote>>(`/dcs/segments/${segmentId}/baggage/quote`, payload)
    return ok(res.data.data)
  },

  /** Print data of one bag tag */
  tag: async (tagId: number) => {
    const res = await client.get<ApiData<ApiBagTag>>(`/dcs/baggage-tags/${tagId}`)
    return ok(res.data.data)
  },

  add: (segmentId: number, payload: AddBaggagePayload) =>
    action(
      client.post<ApiAction<ApiCheckedBaggage>>(`/dcs/segments/${segmentId}/baggage`, payload),
      toBaggage
    ),

  addCrew: (flightId: number, payload: AddCrewBaggagePayload) =>
    action(
      client.post<ApiAction<ApiCheckedBaggage>>(`/dcs/flights/${flightId}/crew-baggage`, payload),
      toBaggage
    ),

  /** Cargo / mail: own CARGO tags, not part of the passengers' bags */
  addCargo: (
    flightId: number,
    payload: { pieces: number; weight_kg: number; description?: string }
  ) =>
    action(
      client.post<ApiAction<ApiCheckedBaggage>>(
        `/dcs/flights/${flightId}/cargo`,
        payload
      ),
      toBaggage
    ),

  remove: async (baggageId: number) => {
    const res = await client.delete<ApiAction<null>>(`/dcs/baggage/${baggageId}`)
    return ok(null, res.data.message)
  },
}

// ─── Seat map ───
export const dcsSeatMapService = {
  get: async (flightId: number, aircraftType: string) => {
    const res = await client.get<ApiData<ApiSeatMap>>(`/dcs/flights/${flightId}/seat-map`)
    return ok(toSeatMap(res.data.data, aircraftType))
  },
}

// ─── Announcements (shared feed) ───
export const announcementService = {
  list: async (): Promise<BaseResponse<Announcement[]>> => {
    const res = await client.get<ApiData<ApiAnnouncement[]>>('/announcements')
    return ok(
      res.data.data.map((a) => ({
        id: a.id,
        airline: a.airline?.name ?? null,
        title: a.title,
        body: a.body,
        requires_acknowledgement: a.requires_acknowledgement,
        created_at: a.created_at,
      }))
    )
  },

  /** Only non-required announcements can be dismissed (API returns 422 otherwise) */
  dismiss: async (id: number) => {
    const res = await client.post<ApiAction<null>>(`/announcements/${id}/dismiss`)
    return ok(null, res.data.message)
  },
}

/** POST /issue-reports — a problem reported from the page help panel (stored in issue_reports) */
export const issueReportService = {
  send: async (payload: { page_path: string; page_title?: string; message: string }) => {
    const res = await client.post<ApiAction<{ id: number }>>('/issue-reports', payload)
    return ok(null, res.data.message)
  },
}

// ─── Counter settings (supervisor) — the flight operations endpoints of the back office API ───
type GateAgent = { id: number; name: string; email?: string }

export const dcsCounterSettingsService = {
  /** Agents who may work the gate of this flight, and the ones assigned now */
  gateAgents: async (flightId: number) => {
    const [candidates, flight] = await Promise.all([
      client.get<ApiData<GateAgent[]>>(`/admin/flights/${flightId}/gate-agents/candidates`),
      client.get<ApiData<{ gate_agents?: GateAgent[] }>>(`/admin/flights/${flightId}`),
    ])
    return {
      candidates: candidates.data.data,
      assigned: (flight.data.data.gate_agents ?? []).map((a) => a.id),
    }
  },

  setGate: (flightId: number, gate: string) =>
    client.put<ApiAction<unknown>>(`/admin/flights/${flightId}/gate`, { gate: gate || null }),

  setGateAgents: (flightId: number, userIds: number[]) =>
    client.put<ApiAction<unknown>>(`/admin/flights/${flightId}/gate-agents`, { user_ids: userIds }),
}
