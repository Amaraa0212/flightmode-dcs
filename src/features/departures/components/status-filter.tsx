import { cn } from '@/lib/utils'
import { DEPARTURE_FILTERS, type DepartureFilter } from './constants'

const DOT: Record<string, string> = {
  checkin_open: 'bg-amber-400',
  gate_closed: 'bg-emerald-400',
  checkin_closed: 'bg-indigo-400',
  scheduled: 'bg-slate-400',
  departed: 'bg-cyan-400',
  cancelled: 'bg-rose-400',
}

type StatusFilterProps = {
  value: DepartureFilter
  counts: Record<string, number>
  onChange: (value: DepartureFilter) => void
}

export function StatusFilter({ value, counts, onChange }: StatusFilterProps) {
  return (
    <div className='no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4'>
      {DEPARTURE_FILTERS.map((filter) => {
        const active = value === filter.value
        const count = counts[filter.value] ?? 0
        if (filter.value !== 'all' && count === 0 && !active) return null
        return (
          <button
            key={filter.value}
            type='button'
            onClick={() => onChange(filter.value)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition',
              active
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-[0_0_20px_-4px] shadow-indigo-500'
                : 'bg-card hover:border-cyan-400/40'
            )}
          >
            {filter.value !== 'all' && (
              <span className={cn('size-2 rounded-full', DOT[filter.value])} />
            )}
            <span className={active ? '' : filter.value === 'all' ? '' : 'text-foreground'}>
              {filter.label}
            </span>
            <span
              className={cn(
                'rounded-md px-1.5 text-xs',
                active ? 'bg-white/20' : 'text-muted-foreground'
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
