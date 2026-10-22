import { cn } from '@/lib/utils'

/** Хуваарьт (scheduled) / захиалгат (charter) — charter flights take every bag free at the counter */
export function ServiceTypeBadge({ type, className }: { type: 'scheduled' | 'charter'; className?: string }) {
  const charter = type === 'charter'
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide uppercase',
        charter
          ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300'
          : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
        className
      )}
      title={charter ? 'Charter (захиалгат) — every bag is free' : 'Scheduled (хуваарьт)'}
    >
      {charter ? 'Charter' : 'Scheduled'}
    </span>
  )
}
