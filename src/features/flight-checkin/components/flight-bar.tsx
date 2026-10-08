import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  DoorClosed,
  DoorOpen,
  Keyboard,
  Loader2,
  Plane,
  LayoutDashboard,
  Lock,
  RotateCcw,
} from 'lucide-react'
import type { DcsFlight } from '@/services'
import { cn } from '@/lib/utils'
import { formatDuration, relativeToNow } from '@/lib/flight'
import { FLIGHT_STATUS } from '@/constants/status'
import type { LiveState } from '@/hooks/use-flight-channel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusChip } from '@/components/status-chip'
import { useFlightActions } from '../hooks/use-dcs-actions'
import { FlightStats } from './flight-stats'
import { PrinterStatus } from './printer-status'
import { useWorkspaceLayout } from '../layout-store'
import { MOD } from '../shortcuts'

type FlightBarProps = {
  flight: DcsFlight
  onRefresh: () => void
  isRefreshing?: boolean
  live?: LiveState
  onShowShortcuts?: () => void
}

const LIVE_LABEL: Record<LiveState, string> = {
  live: 'Live',
  connecting: 'Connecting',
  off: 'Offline',
}

const LOCKED_REASON: Partial<Record<DcsFlight['status'], string>> = {
  gate_closed: 'The gate is closed — check-in cannot be reopened from the counter.',
  departed: 'The flight has departed.',
  cancelled: 'The flight is cancelled.',
}

export function FlightBar({ flight, onRefresh, isRefreshing, live = 'off', onShowShortcuts }: FlightBarProps) {
  const { open, close } = useFlightActions(flight.id)
  const [closing, setClosing] = useState(false)
  const resetLayout = useWorkspaceLayout((s) => s.reset)
  const departed = new Date(flight.scheduled_departure_at) < new Date()

  return (
    <div className='fm-panel flex items-center gap-x-5 px-3 py-2.5'>
      <div className='flex shrink-0 items-center gap-2.5'>
        <Button asChild variant='outline' size='icon' className='size-9 rounded-xl'>
          <Link to='/' aria-label='Back to departures'>
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <div className='flex items-center gap-2'>
            <span className='text-brand font-mono text-lg leading-tight font-bold'>
              {flight.flight_number}
            </span>
            <StatusChip value={flight.status} map={FLIGHT_STATUS} />
          </div>
          <p className='text-muted-foreground text-[11px] whitespace-nowrap'>
            {flight.aircraft.registration} • {flight.terminal ?? '—'} • Gate{' '}
            <b className='text-brand'>{flight.gate ?? '—'}</b> •{' '}
            <span className={cn('font-mono', !departed && 'text-amber-600 dark:text-amber-300')}>
              STD {relativeToNow(flight.scheduled_departure_at)}
            </span>
          </p>
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-3' title={flight.airline.name}>
        <div>
          <p className='text-xl leading-none font-bold'>{flight.origin.iata_code}</p>
          <p className='text-brand text-xs font-semibold'>{flight.departure_time}</p>
        </div>
        <div className='flex flex-col items-center'>
          <span className='text-muted-foreground text-[10px]'>
            {formatDuration(flight.duration_minutes)}
          </span>
          <div className='flex items-center gap-1'>
            <span className='bg-border h-px w-5' />
            <Plane className='text-brand size-3.5' fill='currentColor' />
            <span className='bg-border h-px w-5' />
          </div>
        </div>
        <div>
          <p className='text-xl leading-none font-bold'>{flight.destination.iata_code}</p>
          <p className='text-xs font-semibold'>{flight.arrival_time}</p>
        </div>
      </div>

      <FlightStats stats={flight.stats} className='min-w-0 flex-1 border-s ps-3' />

      <div className='flex shrink-0 items-center gap-2'>
        <span
          title={`${LIVE_LABEL[live]} — updates from other counters arrive automatically when live`}
          aria-label={LIVE_LABEL[live]}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase',
            live === 'live'
              ? 'border-emerald-400/40 text-emerald-600 dark:text-emerald-300'
              : 'text-muted-foreground'
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              live === 'live' ? 'animate-pulse bg-emerald-400' : live === 'connecting' ? 'bg-amber-400' : 'bg-slate-500'
            )}
          />
          {live === 'live' ? 'Live' : live === 'connecting' ? '…' : 'Off'}
        </span>
        <PrinterStatus />
        <Button
          variant='outline'
          size='icon'
          onClick={onShowShortcuts}
          className='size-8'
          aria-label='Keyboard commands'
          title='Keyboard shortcuts'
        >
          <Keyboard className='size-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          onClick={resetLayout}
          className='size-8'
          aria-label='Reset layout'
          title='Reset column order, widths and seat map rotation'
        >
          <LayoutDashboard className='size-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          onClick={onRefresh}
          className='size-8'
          aria-label='Refresh'
          title={`Refresh (${MOD}+R)`}
        >
          <RotateCcw className={cn('size-4', isRefreshing && 'animate-spin')} />
        </Button>
        {(flight.status === 'scheduled' || flight.status === 'checkin_closed') && (
          <Button
            size='sm'
            onClick={() => open.mutate(undefined)}
            disabled={open.isPending}
            className='fm-gradient gap-2 font-semibold text-[#04121c]'
          >
            {open.isPending ? <Loader2 className='size-4 animate-spin' /> : <DoorOpen className='size-4' />}
            {flight.status === 'checkin_closed' ? 'Reopen check-in' : 'Open check-in'}
          </Button>
        )}
        {LOCKED_REASON[flight.status] && (
          // gate closed / departed / cancelled: the counter can no longer open — say why instead of hiding it
          <Button size='sm' variant='outline' disabled className='gap-2' title={LOCKED_REASON[flight.status]}>
            <Lock className='size-4' />
            Check-in locked
          </Button>
        )}
        {flight.status === 'checkin_open' && (
          <Button
            size='sm'
            variant='outline'
            onClick={() => setClosing(true)}
            disabled={close.isPending}
            className='gap-2 border-amber-400/50 text-amber-600 hover:text-amber-600 dark:text-amber-300'
          >
            {close.isPending ? <Loader2 className='size-4 animate-spin' /> : <DoorClosed className='size-4' />}
            Close check-in
          </Button>
        )}
      </div>
      <Dialog open={closing} onOpenChange={setClosing}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>How would you like to end check-in?</DialogTitle>
            <DialogDescription>
              {flight.flight_number} · {flight.stats.checked_in}/{flight.stats.booked} checked in
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <button
              type='button'
              disabled={close.isPending}
              onClick={() => close.mutate(true, { onSuccess: () => setClosing(false) })}
              className='fm-inset hover:border-cyan-400/50 p-3 text-start transition'
            >
              <p className='font-semibold'>Close counter and online check-in</p>
              <p className='text-muted-foreground text-xs'>Flight moves to “Check-in closed”. Nobody can check in any more.</p>
            </button>
            <button
              type='button'
              disabled={close.isPending}
              onClick={() => close.mutate(false, { onSuccess: () => setClosing(false) })}
              className='fm-inset hover:border-cyan-400/50 p-3 text-start transition'
            >
              <p className='font-semibold'>Close the counter only</p>
              <p className='text-muted-foreground text-xs'>
                Online check-in stays open; the flight returns to “Scheduled” and the counter can be reopened.
              </p>
            </button>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setClosing(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
