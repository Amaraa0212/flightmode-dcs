import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { PlaneTakeoff, RotateCcw, ScanLine, Search } from 'lucide-react'
import { dcsFlightService } from '@/services'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Main } from '@/components/layout/main'
import { QUERY_KEYS, type DepartureFilter } from './components/constants'
import { FlightCard } from './components/flight-card'
import { StationHeader } from './components/station-header'
import { StatusFilter } from './components/status-filter'

const route = getRouteApi('/_authenticated/')

export function Departures() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [query, setQuery] = useState(search.query ?? '')
  const debouncedQuery = useDebounce(query, 300)
  const status: DepartureFilter = (search.status as DepartureFilter) ?? 'all'

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: [QUERY_KEYS.FLIGHT_LIST, debouncedQuery],
    queryFn: async () => {
      const res = await dcsFlightService.list({ query: debouncedQuery, pageSize: 200 })
      return res.body?.items ?? []
    },
    refetchInterval: 30_000,
  })

  const flights = useMemo(() => data ?? [], [data])
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: flights.length }
    flights.forEach((f) => (result[f.status] = (result[f.status] ?? 0) + 1))
    return result
  }, [flights])
  const type = search.type
  const typeCounts = useMemo(
    () => ({
      scheduled: flights.filter((f) => f.service_type !== 'charter').length,
      charter: flights.filter((f) => f.service_type === 'charter').length,
    }),
    [flights]
  )
  const visible = flights.filter(
    (f) => (status === 'all' || f.status === status) && (!type || f.service_type === type)
  )
  const activeToday = flights.filter((f) => f.status !== 'cancelled').length

  const setStatus = (value: DepartureFilter) =>
    navigate({ search: (prev) => ({ ...prev, status: value === 'all' ? undefined : value }) })

  return (
    <Main className='fm-backdrop flex flex-1 flex-col gap-5 sm:gap-6'>
      <StationHeader activeToday={activeToday} />

      <div className='bg-card focus-within:border-cyan-400/60 flex h-14 items-center gap-3 rounded-2xl border px-4 transition'>
        <Search className='text-muted-foreground size-5' />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            navigate({ search: (prev) => ({ ...prev, query: e.target.value || undefined }), replace: true })
          }}
          placeholder='Search flight, destination or IATA...'
          className='placeholder:text-muted-foreground h-full flex-1 bg-transparent text-base outline-none'
        />
        <span className='bg-surface text-muted-foreground flex size-9 items-center justify-center rounded-lg border'>
          <ScanLine className='size-5' />
        </span>
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        <StatusFilter value={status} counts={counts} onChange={setStatus} />
        {/* хуваарьт / захиалгат */}
        <div className='bg-card ms-auto flex gap-1 rounded-xl border p-1'>
          {([
            [undefined, 'All types', flights.length],
            ['scheduled', 'Scheduled', typeCounts.scheduled],
            ['charter', 'Charter', typeCounts.charter],
          ] as const).map(([value, label, count]) => (
            <button
              key={label}
              type='button'
              onClick={() => navigate({ search: (prev) => ({ ...prev, type: value }) })}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                type === value
                  ? value === 'charter'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                    : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label} <span className='opacity-70'>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className='h-64 rounded-2xl' />
          ))}
        </div>
      ) : error && !data ? (
        <div className='fm-panel flex flex-col items-center gap-3 py-16 text-center'>
          <PlaneTakeoff className='text-destructive size-8' />
          <p className='font-semibold'>Departures could not be loaded</p>
          <p className='text-muted-foreground text-sm'>{(error as Error).message}</p>
          <Button size='sm' variant='outline' className='gap-2' onClick={() => refetch()} disabled={isFetching}>
            <RotateCcw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
            Retry
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className='fm-panel text-muted-foreground flex flex-col items-center gap-3 py-16'>
          <PlaneTakeoff className='size-8' />
          No flights match your filter.
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3'>
          {visible.map((flight) => (
            <FlightCard key={flight.id} flight={flight} />
          ))}
        </div>
      )}
    </Main>
  )
}
