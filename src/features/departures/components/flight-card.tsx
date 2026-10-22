import { Link } from '@tanstack/react-router'
import { ChevronRight, Plane } from 'lucide-react'
import type { DcsFlight } from '@/services'
import { cn } from '@/lib/utils'
import { formatDuration, relativeToNow } from '@/lib/flight'
import { FLIGHT_STATUS } from '@/constants/status'
import { ServiceTypeBadge } from '@/components/service-type-badge'
import { StatusChip } from '@/components/status-chip'

function routeNote(flight: DcsFlight) {
  switch (flight.status) {
    case 'gate_closed':
      return { text: 'Final call', className: 'text-emerald-500 dark:text-emerald-300' }
    case 'checkin_open':
      return { text: 'Check-in open', className: 'text-amber-600 dark:text-amber-300' }
    case 'checkin_closed':
      return { text: 'Check-in closed', className: 'text-indigo-500 dark:text-indigo-300' }
    case 'departed':
      return { text: 'Departed', className: 'text-muted-foreground' }
    case 'cancelled':
      return { text: 'Cancelled', className: 'text-rose-500 dark:text-rose-300' }
    default:
      return { text: relativeToNow(flight.scheduled_departure_at), className: 'text-muted-foreground' }
  }
}

function planeTone(flight: DcsFlight) {
  if (flight.status === 'gate_closed') return 'text-emerald-400'
  if (flight.status === 'checkin_open') return 'text-amber-400'
  if (flight.status === 'cancelled') return 'text-rose-400'
  return 'text-brand'
}

export function FlightCard({ flight }: { flight: DcsFlight }) {
  const note = routeNote(flight)
  const highlighted = flight.status === 'gate_closed' || flight.status === 'checkin_open'
  const nextDay = flight.arrives_next_day

  return (
    <Link
      to='/flights/$flightId'
      params={{ flightId: String(flight.id) }}
      className={cn(
        'fm-panel group block p-4 transition hover:border-cyan-400/40 sm:p-5',
        flight.status === 'gate_closed' && 'fm-glow border-cyan-400/40',
        flight.status === 'cancelled' && 'opacity-70'
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold',
              flight.airline.iata_code === 'OM'
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-500 dark:text-amber-300'
                : 'border-indigo-400/40 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300'
            )}
          >
            {flight.airline.iata_code === 'OM' ? 'OM' : <Plane className='size-5' fill='currentColor' />}
          </div>
          <div className='min-w-0'>
            <p className='flex min-w-0 items-center gap-2 font-semibold'>
              <span className='text-brand shrink-0 font-mono'>( {flight.flight_number} )</span>
              <span className='truncate'>{flight.airline.name}</span>
              <ServiceTypeBadge type={flight.service_type} />
            </p>
            <p className='text-muted-foreground truncate text-xs'>
              {flight.aircraft.type} • {flight.aircraft.registration}
            </p>
          </div>
        </div>
        <StatusChip value={flight.status} map={FLIGHT_STATUS} size='md' />
      </div>

      <div className='fm-inset mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4'>
        <div>
          <p className='text-3xl font-bold tracking-tight'>{flight.origin.iata_code}</p>
          <p className='text-muted-foreground text-sm'>{flight.origin.city}</p>
          <p className={cn('mt-1 font-semibold', highlighted ? 'text-brand' : 'text-foreground')}>
            {flight.departure_time}
          </p>
        </div>
        <div className='flex flex-col items-center gap-1 px-2'>
          <span className='text-muted-foreground text-xs'>
            {formatDuration(flight.duration_minutes)}
          </span>
          <div className='flex items-center gap-1.5'>
            <span className='bg-border h-px w-6 sm:w-10' />
            <Plane className={cn('size-4', planeTone(flight))} fill='currentColor' />
            <span className='bg-border h-px w-6 sm:w-10' />
          </div>
          <span className={cn('text-[10px] font-semibold tracking-wider uppercase', note.className)}>
            {note.text}
          </span>
        </div>
        <div className='text-end'>
          <p className='text-3xl font-bold tracking-tight'>{flight.destination.iata_code}</p>
          <p className='text-muted-foreground truncate text-sm'>{flight.destination.city}</p>
          <p className='mt-1 font-semibold'>
            {flight.arrival_time}
            {nextDay && <sup className='text-brand ms-0.5 text-[10px]'>+1</sup>}
          </p>
        </div>
      </div>

      <div className='mt-4 flex items-center gap-2'>
        <span className='bg-surface rounded-lg border px-3 py-1.5 text-xs'>
          <span className='text-muted-foreground'>Terminal:</span>{' '}
          <span className='font-bold'>{flight.terminal}</span>
        </span>
        <span
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs',
            flight.status === 'gate_closed'
              ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300'
              : 'bg-surface'
          )}
        >
          <span className={flight.status === 'gate_closed' ? '' : 'text-muted-foreground'}>Gate:</span>{' '}
          <span className='font-bold'>{flight.gate ?? '—'}</span>
        </span>
        <span className='bg-surface ms-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition group-hover:border-cyan-400/40'>
          <span>
            <span className='text-brand font-bold'>{flight.stats.checked_in}</span>
            <span className='text-muted-foreground'>/{flight.stats.booked} Pax</span>
          </span>
          <ChevronRight className='text-muted-foreground size-4' />
        </span>
      </div>
    </Link>
  )
}
