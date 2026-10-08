import { Navigation } from 'lucide-react'
import { useStation } from '@/hooks/use-station'
import { StationClock } from '@/components/station-clock'

export function StationHeader({ activeToday }: { activeToday: number }) {
  const station = useStation()

  return (
    <div className='flex flex-wrap items-start justify-between gap-4'>
      <div className='flex items-center gap-4'>
        <div className='flex size-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10'>
          <Navigation className='text-brand size-6' />
        </div>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
              {station.code} <span className='text-brand'>Airport</span>
            </h1>
            <span className='bg-surface rounded-md border px-2 py-0.5 text-xs font-semibold'>
              OPS
            </span>
          </div>
          <p className='text-muted-foreground text-sm'>
            {station.name} • Departures
          </p>
        </div>
      </div>

      <div className='flex flex-col items-start gap-2 sm:items-end'>
        <span className='inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-300'>
          <span className='size-2 animate-pulse rounded-full bg-emerald-400' />
          Live board
        </span>
        <StationClock />
      </div>

      <p className='text-muted-foreground w-full text-sm'>
        Active today:{' '}
        <span className='text-foreground font-semibold'>{activeToday}</span>{' '}
        scheduled
      </p>
    </div>
  )
}
