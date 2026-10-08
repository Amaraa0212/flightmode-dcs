import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CornerDownLeft, Loader2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { dcsSeatMapService, type DcsPassenger, type Seat } from '@/services'
import { cn } from '@/lib/utils'
import { passengerName } from '@/lib/flight'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSeatFlash } from '@/hooks/use-flight-channel'
import { printBoardingPass, usePassengerActions } from '../hooks/use-dcs-actions'
import { useWorkspaceLayout } from '../layout-store'
import { MOD, useCommand } from '../shortcuts'
import { QUERY_KEYS } from './constants'
import { PanelHeader } from './panel-header'
import { SeatGrid } from './seat-grid'

type SeatMapProps = {
  flightId: number
  aircraftType: string
  checkinOpen: boolean
  selected?: DcsPassenger | null
  onSelectSegment: (segmentId: number) => void
}

const LEGEND = [
  { label: 'Free', className: 'border-cyan-400/50 bg-cyan-400/5' },
  { label: 'Taken', className: 'border-cyan-300 bg-cyan-400' },
  { label: 'Blocked', className: 'border-slate-500/40 bg-slate-500/30' },
  { label: 'Selected', className: 'border-amber-300 bg-amber-400' },
  { label: 'Exit row', className: 'border-orange-400 bg-orange-500/25' },
]

function seatClass(seat: Seat, isSelected: boolean, isPicked: boolean) {
  const tone = stateClass(seat, isSelected, isPicked)
  // exit row (legacy em_class): orange seat while free, orange border once taken
  if (!seat.is_exit || isPicked || isSelected) return tone
  if (seat.state === 'available')
    return 'border-orange-400/80 bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 dark:text-orange-300'
  return cn(tone, 'border-orange-400')
}

function stateClass(seat: Seat, isSelected: boolean, isPicked: boolean) {
  if (isPicked) return 'border-amber-300 bg-amber-400/30 text-amber-200 ring-2 ring-amber-400'
  if (isSelected) return 'border-amber-300 bg-amber-400 text-[#1a1203]'
  if (seat.state === 'blocked' || seat.state === 'held' || seat.state === 'restricted')
    return 'cursor-not-allowed border-slate-500/40 bg-slate-500/25 text-slate-400'
  if (seat.state === 'occupied')
    return 'border-cyan-300 bg-cyan-400 text-[#04121c] hover:bg-cyan-300'
  if (seat.cabin_class === 'C')
    return 'border-amber-400/50 bg-amber-400/5 text-amber-300 hover:bg-amber-400/15'
  return 'border-cyan-400/40 bg-cyan-400/5 text-cyan-300 hover:bg-cyan-400/15'
}

/**
 * Legacy DCS flow: click a free seat to pick it for the selected passenger, then press Enter —
 * the passenger is checked in (or moved) to that seat and the boarding pass prints through QZ Tray.
 * Enter without a picked seat: auto seat for a booked passenger, reprint for a checked-in one. Esc drops the pick.
 * While a passenger is selected, seat clicks only choose a seat for them; a taken seat is refused and never
 * switches the passenger. With nobody selected, a taken seat opens its passenger.
 */
export function SeatMapView({
  flightId,
  aircraftType,
  checkinOpen,
  selected,
  onSelectSegment,
}: SeatMapProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [pick, setPick] = useState<{ segmentId: number; seat: Seat } | null>(null)
  const { checkIn, changeSeat } = usePassengerActions()
  const flashes = useSeatFlash((s) => s.seats)
  const rotation = useWorkspaceLayout((s) => s.seatRotation)
  const rotateSeats = useWorkspaceLayout((s) => s.rotateSeats)

  const { data } = useQuery({
    queryKey: [QUERY_KEYS.SEAT_MAP, flightId, aircraftType],
    queryFn: async () => (await dcsSeatMapService.get(flightId, aircraftType)).body,
  })

  // a pick belongs to one passenger — selecting someone else drops it
  const picked = pick && pick.segmentId === selected?.id ? pick.seat : null
  const busy = checkIn.isPending || changeSeat.isPending

  const canAssign =
    !!selected &&
    selected.type !== 'INF' &&
    checkinOpen &&
    (selected.status === 'booked' || selected.status === 'checked_in')

  const handleClick = (seat: Seat) => {
    // nobody selected: a taken seat opens its passenger (legacy selectPassengerBySeat)
    if (!selected) {
      if (seat.segment_id) return onSelectSegment(seat.segment_id)
      return toast.info('Select a passenger first, then click a free seat.')
    }

    // a passenger is selected: clicks only choose a seat for them — never switch passenger (legacy selectPassSeat)
    if (seat.segment_id === selected.id) return setPick(null)
    if (seat.segment_id || seat.state !== 'available') {
      return toast.warning(
        `Seat ${seat.number} is not available${seat.occupant_name ? ` — ${seat.occupant_name}` : ''}`,
        { id: 'seat-unavailable' }
      )
    }
    if (canAssign) {
      setPick({ segmentId: selected.id, seat })
      sectionRef.current?.focus()
      return
    }
    if (selected.type === 'INF') return toast.info('Infants sit with their adult.')
    if (!checkinOpen) return toast.info('Open check-in first — seats can be assigned only while check-in is open.')
    toast.info(`A ${selected.status.replace('_', ' ')} passenger cannot change seat.`)
  }

  // what Enter does for the selected passenger right now
  const action: { label: string; run: () => void } | null = (() => {
    if (!selected || selected.type === 'INF') return null
    if (selected.status === 'booked' && checkinOpen)
      return {
        label: picked ? `Check in ${picked.number} & print` : 'Check in (auto seat) & print',
        run: () => checkIn.mutate({ segmentId: selected.id, seat: picked?.number, print: true }),
      }
    if (selected.status === 'checked_in' && picked && checkinOpen)
      return {
        label: `Move to ${picked.number} & print`,
        run: () => changeSeat.mutate({ segmentId: selected.id, seat: picked.number, print: true }),
      }
    if (selected.status === 'checked_in' || selected.status === 'boarded')
      return { label: 'Print boarding pass', run: () => void printBoardingPass(selected.id) }
    return null
  })()

  const commit = () => {
    if (!action || busy) return
    action.run()
    setPick(null)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      // Enter on a focused seat button must not also "click" it
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape' && picked) {
      // only drop the pick — the page-wide Esc would also close the passenger
      event.stopPropagation()
      setPick(null)
    }
  }

  // Ctrl+P: the same as Enter, from anywhere on the counter
  useCommand('checkIn', () => {
    if (!action) {
      toast.info('Select a passenger to check in.', { id: 'shortcut' })
      return
    }
    commit()
  })

  const sideways = rotation === 90 || rotation === 270

  const legend = (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1', !sideways && 'border-b px-4 py-2')}>
      {LEGEND.map((l) => (
        <span key={l.label} className='text-muted-foreground flex items-center gap-1 text-[11px]'>
          <span className={cn('size-2.5 rounded-sm border', l.className)} />
          {l.label}
        </span>
      ))}
    </div>
  )

  const grid = !data ? (
    <Skeleton className={sideways ? 'm-3 h-40 flex-1' : 'm-4 h-96'} />
  ) : (
    // both directions scroll when the plane is bigger than the space
    <div className='flex min-h-0 min-w-0 flex-1 overflow-auto p-3'>
      <div className='m-auto'>
        <SeatGrid
          map={data}
          rotation={rotation}
          renderSeat={(seat) => (
            <button
              type='button'
              title={`${seat.number} • ${seat.occupant_name ?? seat.state}${seat.zone ? ` • zone ${seat.zone}` : ''}${seat.is_exit ? ' • emergency exit' : ''}`}
              onClick={() => handleClick(seat)}
              className={cn(
                'flex h-6 w-7 items-center justify-center rounded-md border font-mono text-[9px] font-bold transition',
                seatClass(
                  seat,
                  seat.segment_id !== null && seat.segment_id === selected?.id,
                  picked?.number === seat.number
                ),
                flashes[seat.number] === 'taken' && 'animate-pulse ring-2 ring-emerald-400',
                flashes[seat.number] === 'released' && 'animate-pulse ring-2 ring-rose-400'
              )}
            >
              {seat.number}
            </button>
          )}
        />
      </div>
    </div>
  )

  const actionBar = selected && action && (
    <div className={cn(!sideways && 'border-t px-3 py-2')}>
      <p className='text-muted-foreground mb-1.5 truncate text-[11px]'>
        <b className='text-foreground'>{passengerName(selected)}</b>{' '}
        <span className='font-mono'>
          {selected.seat_number ?? '—'}
          {picked && (
            <>
              {' → '}
              <b className='text-amber-500'>{picked.number}</b>
              {picked.zone && ` · zone ${picked.zone}`}
              {picked.is_exit && ' · exit row'}
              {picked.cabin_class !== selected.cabin_class && ` · cabin ${picked.cabin_class}`}
            </>
          )}
        </span>
      </p>
      <Button size='sm' className='h-8 w-full gap-1.5' disabled={busy} onClick={commit}>
        {busy ? <Loader2 className='size-3.5 animate-spin' /> : <CornerDownLeft className='size-3.5' />}
        {action.label}
        <kbd className='ms-auto rounded border border-current/30 px-1 text-[10px] opacity-70'>Enter · {MOD}+P</kbd>
      </Button>
    </div>
  )

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className='fm-panel flex min-w-0 flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50'
    >
      <PanelHeader
        title='Seat Map'
        subtitle={data?.aircraft_type}
        action={
          <Button
            variant='outline'
            size='sm'
            className='h-7 gap-1 px-2 font-mono text-[11px]'
            // click: clockwise · shift+click: counter-clockwise
            onClick={(e) => rotateSeats(e.shiftKey ? -1 : 1)}
            title='Rotate seat map 90° (shift+click: other way)'
            aria-label='Rotate seat map'
          >
            <RotateCw className='size-3.5' />
            {rotation}°
          </Button>
        }
      />

      {sideways ? (
        // docked under the columns: plane across the full width, legend + Enter action on the right
        <div className='flex min-h-0 flex-1'>
          {grid}
          <aside className='flex w-64 shrink-0 flex-col justify-between gap-3 border-s p-3'>
            {legend}
            {actionBar}
          </aside>
        </div>
      ) : (
        <>
          {legend}
          {grid}
          {actionBar}
        </>
      )}
    </section>
  )
}
