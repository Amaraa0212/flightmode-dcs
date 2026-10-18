import { Baby, Briefcase, CheckCircle2, Clock4, Footprints, Users } from 'lucide-react'
import type { FlightStats as Stats, PaxTypeCounts } from '@/services'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const TYPES = [
  { key: 'ADT', label: 'Adults' },
  { key: 'CHD', label: 'Children' },
  { key: 'INF', label: 'Infants' },
] as const

/** Hover card: the ADT / CHD / INF behind a passenger figure */
function TypeBreakdown({ title, counts }: { title: string; counts: PaxTypeCounts }) {
  return (
    <div className='grid gap-1 py-0.5 text-xs'>
      <p className='font-semibold'>{title}</p>
      {TYPES.map((t) => (
        <div key={t.key} className='flex justify-between gap-6'>
          <span className='opacity-80'>
            {t.label} ({t.key})
          </span>
          <span className='font-mono font-bold'>{counts[t.key]}</span>
        </div>
      ))}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'text-brand',
  progress,
  breakdown,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: string
  progress?: number
  breakdown?: PaxTypeCounts
}) {
  const body = (
    <div className={cn('flex min-w-0 flex-col justify-center gap-1 px-2.5 first:ps-0', breakdown && 'cursor-help')}>
      <span className='text-muted-foreground truncate text-[10px] font-semibold tracking-wide uppercase'>
        {label}
      </span>
      <div className='flex items-center gap-1 whitespace-nowrap'>
        <Icon className={cn('size-3.5 shrink-0', tone)} />
        <span className='text-lg leading-none font-bold'>{value}</span>
        {sub && <span className='text-muted-foreground text-[11px]'>{sub}</span>}
      </div>
      <div className='bg-muted h-1 overflow-hidden rounded-full'>
        {progress !== undefined && (
          <div
            className='fm-gradient h-full rounded-full transition-all'
            style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
          />
        )}
      </div>
    </div>
  )
  if (!breakdown) return body
  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side='bottom'>
        <TypeBreakdown title={label} counts={breakdown} />
      </TooltipContent>
    </Tooltip>
  )
}

/** Compact counter figures — sits inside the flight bar so the 4 work columns get the screen height */
export function FlightStats({ stats, className }: { stats: Stats; className?: string }) {
  const pct = (n: number) => (stats.booked ? n / stats.booked : 0)
  return (
    <div className={cn('grid grid-cols-6 divide-x', className)}>
      <Stat icon={Users} label='Booked' value={stats.booked} sub={`/ ${stats.capacity}`} progress={stats.capacity ? stats.booked / stats.capacity : 0} breakdown={stats.breakdown?.booked} />
      <Stat icon={CheckCircle2} label='Checked in' value={stats.checked_in} sub={`${Math.round(pct(stats.checked_in) * 100)}%`} tone='text-emerald-400' progress={pct(stats.checked_in)} breakdown={stats.breakdown?.checked_in} />
      <Stat icon={Footprints} label='Boarded' value={stats.boarded} sub={`${Math.round(pct(stats.boarded) * 100)}%`} tone='text-cyan-400' progress={pct(stats.boarded)} breakdown={stats.breakdown?.boarded} />
      <Stat icon={Baby} label='Infants' value={stats.infants} tone='text-indigo-400' />
      <Stat icon={Clock4} label='Waitlist' value={stats.waitlisted} sub={`GS ${stats.go_show}`} tone='text-amber-400' />
      <Stat icon={Briefcase} label='Bags' value={stats.bags} sub={`${stats.bag_weight_kg} kg`} />
    </div>
  )
}
