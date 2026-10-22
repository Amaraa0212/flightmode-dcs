import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useOpenFlights } from '@/stores/open-flights-store'
import { cn } from '@/lib/utils'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const STATUS_DOT: Record<string, string> = {
  checkin_open: 'bg-emerald-400',
  checkin_closed: 'bg-amber-400',
  gate_closed: 'bg-orange-400',
  departed: 'bg-slate-400',
  cancelled: 'bg-rose-400',
}

/** Flights open at this counter (Alt+1…9 switches between them) */
export function NavOpenFlights() {
  const flights = useOpenFlights((s) => s.flights)
  const close = useOpenFlights((s) => s.close)
  const navigate = useNavigate()
  const { flightId } = useParams({ strict: false }) as { flightId?: string }
  const current = Number(flightId)

  // closing the flight on screen moves to the next open one (or back to departures)
  const closeFlight = (id: number) => {
    close(id)
    if (id !== current) return
    const next = flights.find((x) => x.id !== id)
    void navigate(
      next
        ? { to: '/flights/$flightId', params: { flightId: String(next.id) }, search: (next.search ?? {}) as never }
        : { to: '/' }
    )
  }

  if (!flights.length) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Open flights</SidebarGroupLabel>
      <SidebarMenu>
        {flights.map((f, index) => (
          <SidebarMenuItem key={f.id}>
            <SidebarMenuButton
              asChild
              isActive={f.id === current}
              tooltip={`${f.flight_number} ${f.route}`}
            >
              <Link
                to='/flights/$flightId'
                params={{ flightId: String(f.id) }}
                search={(f.search ?? {}) as never}
              >
                {/* the number is what shows on the collapsed (icon) sidebar of the counter */}
                <span className='bg-brand/15 text-brand flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-bold'>
                  {index + 1}
                </span>
                <span className='flex min-w-0 flex-1 items-center gap-1.5'>
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      STATUS_DOT[f.status] ?? 'bg-slate-500'
                    )}
                  />
                  <span className='font-mono font-semibold'>
                    {f.flight_number}
                  </span>
                  <span className='text-muted-foreground truncate text-xs'>
                    {f.route} {f.departure_time}
                  </span>
                </span>
                {index < 9 && (
                  <kbd className='text-muted-foreground text-[10px]'>
                    Alt {index + 1}
                  </kbd>
                )}
              </Link>
            </SidebarMenuButton>
            <SidebarMenuAction
              showOnHover
              aria-label={`Close ${f.flight_number}`}
              onClick={() => closeFlight(f.id)}
            >
              <X />
            </SidebarMenuAction>
            {/* collapsed (icon) sidebar — the menu action is hidden there, so a small × on the number */}
            <button
              type='button'
              aria-label={`Close ${f.flight_number}`}
              title={`Close ${f.flight_number}`}
              onClick={() => closeFlight(f.id)}
              className='bg-destructive absolute end-0 top-0 hidden size-3.5 items-center justify-center rounded-full text-white opacity-0 shadow transition group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100 group-data-[collapsible=icon]:flex'
            >
              <X className='size-2.5' strokeWidth={3} />
            </button>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
