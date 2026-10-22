import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/*
| Counter workspace layout (like an exchange trading screen): the 4 columns can be resized and swapped,
| the seat map rotated. Saved in this browser — every counter PC keeps its own arrangement.
*/

export type PanelId = 'list' | 'info' | 'baggage' | 'seats'
export type SeatRotation = 0 | 90 | 180 | 270

export const PANEL_LABEL: Record<PanelId, string> = {
  list: 'Passengers',
  info: 'General Info',
  baggage: 'Baggages Info',
  seats: 'Seat Map',
}

/** Narrowest a column may get (px) */
export const PANEL_MIN_WIDTH: Record<PanelId, number> = {
  list: 360,
  info: 280,
  baggage: 240,
  seats: 190,
}

type Layout = {
  order: PanelId[]
  /** flex-grow weights — proportional to the column widths */
  weights: Record<PanelId, number>
  seatRotation: SeatRotation
}

const DEFAULT_LAYOUT: Layout = {
  order: ['list', 'info', 'baggage', 'seats'],
  weights: { list: 500, info: 320, baggage: 270, seats: 250 },
  seatRotation: 0,
}

type LayoutStore = Layout & {
  swap: (a: PanelId, b: PanelId) => void
  setWeights: (weights: Partial<Record<PanelId, number>>) => void
  rotateSeats: () => void
  reset: () => void
}

export const useWorkspaceLayout = create<LayoutStore>()(
  persist(
    (set) => ({
      ...DEFAULT_LAYOUT,
      swap: (a, b) =>
        set((s) => {
          if (a === b) return s
          const order = [...s.order]
          const ia = order.indexOf(a)
          const ib = order.indexOf(b)
          ;[order[ia], order[ib]] = [order[ib], order[ia]]
          return { order }
        }),
      setWeights: (weights) =>
        set((s) => ({ weights: { ...s.weights, ...weights } })),
      // two positions only (nose up / nose left, docked under the columns) — the counter never turns it upside down
      rotateSeats: () =>
        set((s) => ({ seatRotation: s.seatRotation === 0 ? 270 : 0 })),
      reset: () => set(DEFAULT_LAYOUT),
    }),
    {
      name: 'dcs_workspace_layout',
      version: 2,
      partialize: ({ order, weights, seatRotation }) => ({
        order,
        weights,
        seatRotation,
      }),
      // 90° / 180° from before the two-position switch fall back to nose up
      migrate: (stored) => {
        const s = stored as Partial<Layout>
        return {
          ...DEFAULT_LAYOUT,
          ...s,
          seatRotation: s.seatRotation === 270 ? 270 : 0,
        } as Layout
      },
    }
  )
)
