import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import type { DcsFlight, SeatMap } from '@/services'
import { toStats } from '@/services/api/dcs/adapters'
import type { ApiFlightStatistics } from '@/services/types/dcs/api.types'
import { getEcho } from '@/lib/echo'

export type LiveState = 'off' | 'connecting' | 'live'

type SeatChange = { segment_id: number | null; from: string | null; to: string | null }

type FlightUpdatedEvent = {
  flight_id: number
  event: string
  passenger_id: number | null
  user_id: number | null
  /** Present when a seat was taken / released (check-in, seat change, un-check) */
  seat: SeatChange | null
  /** FlightStatistics after the change — the flight bar figures */
  statistics: ApiFlightStatistics | null
}

export type SeatFlash = 'taken' | 'released'

/** Seats changed by another counter a moment ago — the seat map highlights them briefly */
export const useSeatFlash = create<{
  seats: Record<string, SeatFlash>
  flash: (seat: string, kind: SeatFlash) => void
}>((set) => ({
  seats: {},
  flash: (seat, kind) => {
    set((s) => ({ seats: { ...s.seats, [seat]: kind } }))
    setTimeout(
      () =>
        set((s) => {
          const { [seat]: _, ...rest } = s.seats
          return { seats: rest }
        }),
      2500
    )
  },
}))

const SEAT_MAP_KEY = 'dcs-seat-map'
const FLIGHT_KEY = 'dcs-flight'

/**
 * Flights whose channel is live on this counter. While live, the flight (and its booked / checked-in / boarded /
 * bags / waitlist / infants figures) is loaded once and the figures come from the channel — DCS actions
 * do not reload it (see useInvalidateDcs).
 */
export const useLiveFlights = create<{ live: Record<number, boolean> }>(() => ({ live: {} }))
const setLive = (flightId: number, live: boolean) =>
  useLiveFlights.setState((s) => ({ live: { ...s.live, [flightId]: live } }))

/** True for every DCS query that should reload after a change — the flight itself only when not live */
export function shouldReloadDcsQuery(queryKey: readonly unknown[]) {
  const key = String(queryKey[0])
  if (!key.startsWith('dcs-')) return false
  if (key !== FLIGHT_KEY) return true
  return !useLiveFlights.getState().live[Number(queryKey[1])]
}

/** Free / take the seats in the cached seat map right away; the reload that follows fills in names. */
function patchSeatMap(map: SeatMap | undefined, change: SeatChange): SeatMap | undefined {
  if (!map) return map
  return {
    ...map,
    rows: map.rows.map((row) => ({
      ...row,
      seats: row.seats.map((seat) => {
        if (!seat || seat === 'aisle') return seat
        if (seat.number === change.to)
          return { ...seat, state: 'occupied', segment_id: change.segment_id, checked_in: true }
        if (seat.number === change.from && seat.segment_id === change.segment_id)
          return { ...seat, state: 'available', segment_id: null, occupant_name: null, checked_in: false }
        return seat
      }),
    })),
  }
}

/**
 * Subscribes to `private-dcs.flight.{id}` (App\Events\Dcs\FlightUpdated). Any change — check-in, seat, bag,
 * group, flight status, at this or another counter — reloads the passenger / baggage / seat queries.
 * The flight figures (booked, checked in, boarded, bags, waitlist, infants) are taken from the event, so the
 * flight is loaded once and reloaded only when the flight itself changes (flight.* events).
 * Seat changes are painted on the seat map immediately.
 */
export function useFlightChannel(flightId: number) {
  const queryClient = useQueryClient()
  const flash = useSeatFlash((s) => s.flash)
  const [state, setState] = useState<LiveState>(() => (getEcho() ? 'connecting' : 'off'))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reloadFlight = useRef(false)

  useEffect(() => {
    const echo = getEcho()
    if (!echo) return

    const channelName = `dcs.flight.${flightId}`
    const channel = echo.private(channelName)
    channel.subscribed(() => {
      setState('live')
      setLive(flightId, true)
    })
    channel.error(() => {
      setState('off')
      setLive(flightId, false)
    })
    channel.listen('.flight.updated', (event: FlightUpdatedEvent) => {
      // flight figures: straight from the event, no reload
      const statistics = event.statistics
      if (statistics) {
        queryClient.setQueryData<DcsFlight>([FLIGHT_KEY, flightId], (flight) =>
          flight ? { ...flight, stats: toStats(statistics) } : flight
        )
      }

      const seat = event.seat
      if (seat && seat.from !== seat.to) {
        queryClient.setQueriesData<SeatMap>({ queryKey: [SEAT_MAP_KEY, flightId] }, (map) =>
          patchSeatMap(map, seat)
        )
        if (seat.from) flash(seat.from, 'released')
        if (seat.to) flash(seat.to, 'taken')
      }

      // several logs arrive for one action (check-in + infant, bag + tags) → reload once
      if (timer.current) clearTimeout(timer.current)
      // flight.* (check-in opened / closed, status) changes the flight itself → reload it too
      const flightChanged = event.event.startsWith('flight.') || !statistics
      if (flightChanged) reloadFlight.current = true
      timer.current = setTimeout(() => {
        const withFlight = reloadFlight.current
        reloadFlight.current = false
        queryClient.invalidateQueries({
          predicate: (q) =>
            String(q.queryKey[0]).startsWith('dcs-') && (withFlight || q.queryKey[0] !== FLIGHT_KEY),
        })
      }, 250)
    })

    return () => {
      if (timer.current) clearTimeout(timer.current)
      setLive(flightId, false)
      echo.leave(channelName)
    }
  }, [flightId, queryClient, flash])

  return state
}
