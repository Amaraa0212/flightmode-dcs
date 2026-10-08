import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeInZone, utcOffsetLabel } from '@/lib/flight'
import { useStation } from '@/hooks/use-station'

export function StationClock({ className }: { className?: string }) {
  const station = useStation()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={cn('text-muted-foreground flex items-center gap-2 text-sm', className)}>
      <Clock3 className='text-brand size-4' />
      <span className='text-foreground font-mono font-semibold'>
        {timeInZone(now, station.timezone)}
      </span>
      <span>
        {utcOffsetLabel(station.timezone)} • {station.city}
      </span>
    </div>
  )
}
