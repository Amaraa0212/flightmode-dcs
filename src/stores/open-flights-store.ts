import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/*
| Flights the agent has open at the counter — listed in the sidebar like a menu so two or three flights
| can be worked side by side. Each keeps the passenger / tab it was left on. Kept in this browser only.
*/

export type OpenFlight = {
  id: number
  flight_number: string
  route: string
  departure_time: string
  status: string
  /** the counter search (selected passenger, tab …) to come back to */
  search?: Record<string, unknown>
}

type OpenFlightsState = {
  flights: OpenFlight[]
  open: (flight: Omit<OpenFlight, 'search'>) => void
  remember: (id: number, search: Record<string, unknown>) => void
  close: (id: number) => void
}

export const useOpenFlights = create<OpenFlightsState>()(
  persist(
    (set) => ({
      flights: [],
      open: (flight) =>
        set((s) => {
          const existing = s.flights.find((f) => f.id === flight.id)
          return {
            flights: existing
              ? s.flights.map((f) =>
                  f.id === flight.id ? { ...f, ...flight } : f
                )
              : [...s.flights, flight],
          }
        }),
      remember: (id, search) =>
        set((s) => ({
          flights: s.flights.map((f) => (f.id === id ? { ...f, search } : f)),
        })),
      close: (id) =>
        set((s) => ({ flights: s.flights.filter((f) => f.id !== id) })),
    }),
    { name: 'dcs_open_flights' }
  )
)
