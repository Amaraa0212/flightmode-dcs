import { ArrowUp, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { Seat, SeatMap } from '@/services'
import { cn } from '@/lib/utils'
import type { SeatRotation } from '../layout-store'

/*
| Seat map drawn on a CSS grid so it can be rotated in 90° steps without turning the text:
| every cell is placed on a logical grid (nose at the top), then its row/column is mapped for the rotation.
|
|   logical columns: 0 = exit marker · 1..C = seats / aisles of the row · C+1 = exit marker
|   logical rows:    "FRONT" · a label row where the cabin or the zone changes · one row per seat row
| Each load zone gets a tinted band behind all of its rows (label included) so staff see where it starts
| and ends, and the label counts the passengers seated in it.
*/

const ZONE_TONES = [
  'border-violet-400/40 bg-violet-500/[0.07]',
  'border-emerald-400/40 bg-emerald-500/[0.07]',
  'border-sky-400/40 bg-sky-500/[0.07]',
  'border-amber-400/40 bg-amber-500/[0.07]',
]
const ZONE_TEXT = [
  'border-violet-400/40 bg-violet-500/10 text-violet-600 dark:text-violet-300',
  'border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  'border-sky-400/40 bg-sky-500/10 text-sky-600 dark:text-sky-300',
  'border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-300',
]

type Item = {
  key: string
  r: number
  c: number
  rs?: number
  cs?: number
  kind: 'seat' | 'aisle' | 'exit' | 'label' | 'zone'
  node: React.ReactNode
}

function place(item: Item, rotation: SeatRotation, rows: number, cols: number) {
  const rs = item.rs ?? 1
  const cs = item.cs ?? 1
  // clockwise rotation of the rectangle [r, r+rs) × [c, c+cs) inside rows × cols
  const [row, col, rowSpan, colSpan] =
    rotation === 0
      ? [item.r, item.c, rs, cs]
      : rotation === 90
        ? [item.c, rows - item.r - rs, cs, rs]
        : rotation === 180
          ? [rows - item.r - rs, cols - item.c - cs, rs, cs]
          : [cols - item.c - cs, item.r, cs, rs]
  return { gridRow: `${row + 1} / span ${rowSpan}`, gridColumn: `${col + 1} / span ${colSpan}` }
}

type SeatGridProps = {
  map: SeatMap
  rotation: SeatRotation
  renderSeat: (seat: Seat) => React.ReactNode
}

export function SeatGrid({ map, rotation, renderSeat }: SeatGridProps) {
  const seatCols = Math.max(...map.rows.map((r) => r.seats.length), 1)
  const cols = seatCols + 2
  const sideways = rotation === 90 || rotation === 270
  const items: Item[] = []
  const bands: Item[] = []
  let r = 0

  // zone → passengers seated in it, and its colour (order of appearance)
  const zones = [...new Set(map.rows.map((row) => row.zone).filter((z): z is string => !!z))]
  const paxInZone = new Map<string, number>()
  map.rows.forEach((row) =>
    row.seats.forEach((cell) => {
      if (cell && cell !== 'aisle' && cell.state === 'occupied' && row.zone)
        paxInZone.set(row.zone, (paxInZone.get(row.zone) ?? 0) + 1)
    })
  )
  const tone = (zone: string) => zones.indexOf(zone) % ZONE_TONES.length
  let band: { zone: string; start: number } | null = null
  const closeBand = () => {
    if (band && r > band.start)
      bands.push({
        key: `zone-band-${band.zone}-${band.start}`,
        r: band.start,
        rs: r - band.start,
        c: 0,
        cs: cols,
        kind: 'zone',
        node: null,
      })
    band = null
  }

  items.push({
    key: 'front',
    r: r++,
    c: 1,
    cs: seatCols,
    kind: 'label',
    node: (
      <span className='text-muted-foreground flex items-center justify-center gap-1 text-[9px] font-semibold tracking-widest uppercase'>
        {/* the arrow points at the nose whatever the rotation */}
        <ArrowUp className='size-3' style={{ transform: `rotate(${rotation}deg)` }} />
        Front
      </span>
    ),
  })

  map.rows.forEach((row, index) => {
    const prev = map.rows[index - 1]
    const newCabin = row.cabin_class !== prev?.cabin_class
    const newZone = !!row.zone && row.zone !== prev?.zone
    if (row.zone !== prev?.zone) {
      closeBand()
      if (row.zone) band = { zone: row.zone, start: r }
    }
    if (newCabin || newZone) {
      items.push({
        key: `label-${row.row}`,
        r: r++,
        c: 1,
        cs: seatCols,
        kind: 'label',
        node: (
          <span className='flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase'>
            {newCabin && (
              <span className={row.cabin_class === 'C' ? 'text-amber-500/80' : 'text-muted-foreground'}>
                {row.cabin_class === 'C' ? 'Business' : 'Economy'}
              </span>
            )}
            {newCabin && newZone && <span className='text-muted-foreground/50'>·</span>}
            {newZone && (
              <span className={cn('rounded border px-1', ZONE_TEXT[tone(row.zone!)])}>
                Zone {row.zone} · {paxInZone.get(row.zone!) ?? 0} pax
              </span>
            )}
          </span>
        ),
      })
    }

    row.seats.forEach((cell, i) => {
      if (cell === null) return // no seat here — the grid keeps the gap
      if (cell === 'aisle') {
        items.push({
          key: `aisle-${row.row}-${i}`,
          r,
          c: i + 1,
          kind: 'aisle',
          node: (
            <span className='flex size-full items-center justify-center font-mono text-[9px] text-slate-500'>
              {row.row}
            </span>
          ),
        })
      } else {
        items.push({ key: cell.number, r, c: i + 1, kind: 'seat', node: renderSeat(cell) })
      }
    })

    if (row.is_exit) {
      // legacy: orange arrows out of the fuselage on both sides; they turn with the plane
      for (const [c, Icon] of [
        [0, ChevronsLeft],
        [cols - 1, ChevronsRight],
      ] as const) {
        items.push({
          key: `exit-${row.row}-${c}`,
          r,
          c,
          kind: 'exit',
          node: (
            <span title={`Row ${row.row} · emergency exit`} aria-label='Emergency exit row'>
              <Icon
                className='size-4 text-orange-500'
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </span>
          ),
        })
      }
    }
    r++
  })

  closeBand()
  const rows = r

  return (
    <div
      className='grid w-max place-items-center gap-1'
      style={{ gridAutoColumns: 'max-content', gridAutoRows: 'max-content' }}
    >
      {/* bands first: the seats paint over them */}
      {[...bands, ...items].map((item) => (
        <div
          key={item.key}
          style={place(item, rotation, rows, cols)}
          className={cn(
            'flex items-center justify-center',
            item.kind === 'zone' &&
              cn('-m-0.5 self-stretch justify-self-stretch rounded-lg border', ZONE_TONES[tone(item.key.split('-')[2])]),
            item.kind === 'aisle' && (sideways ? 'h-3.5 w-7' : 'h-6 w-3.5'),
            item.kind === 'label' && (sideways ? 'px-0.5 [writing-mode:vertical-rl]' : 'py-0.5')
          )}
        >
          {item.node}
        </div>
      ))}
    </div>
  )
}
