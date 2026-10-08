import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { PlaneTakeoff } from 'lucide-react'
import { toast } from 'sonner'
import { dcsFlightService, dcsPassengerService, type DcsPassenger } from '@/services'
import { useFlightChannel } from '@/hooks/use-flight-channel'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Main } from '@/components/layout/main'
import { BaggagePanel } from './components/baggage-panel'
import { type CheckinTab, QUERY_KEYS } from './components/constants'
import { FlightBar } from './components/flight-bar'
import { PassengerListPanel } from './components/passenger-list-panel'
import { PassengerPanel } from './components/passenger-panel'
import { SeatMapView } from './components/seat-map'
import { ShortcutsDialog } from './components/shortcuts-dialog'
import { WorkspaceLayout } from './components/workspace-layout'
import { printBoardingPass, useInvalidateDcs } from './hooks/use-dcs-actions'
import { useCommand, useShortcutKeys } from './shortcuts'

const route = getRouteApi('/_authenticated/flights/$flightId')

/**
 * Check-in counter workspace.
 * Хуучин DCS-ийн 4 баганатай хуваалт:
 *   Passenger list | General Info | Baggages Info | Seat map
 * — resizable and swappable (WorkspaceLayout), saved per browser.
 */
export function FlightCheckin() {
  const { flightId: flightIdParam } = route.useParams()
  const flightId = Number(flightIdParam)
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const tableNavigate = navigate as unknown as NavigateFn
  const view: CheckinTab = search.tab ?? 'passengers'
  const { setOpen } = useSidebar()
  const live = useFlightChannel(flightId)
  const invalidateDcs = useInvalidateDcs()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Counter дэлгэц: 4 багана багтахын тулд sidebar-ийг нэг удаа icon горимд оруулна
  // (setOpen нь open-оос хамаардаг тул deps-д оруулбал хэрэглэгч дахин нээж чадахгүй)
  useEffect(() => {
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: flight, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [QUERY_KEYS.FLIGHT, flightId],
    queryFn: async () => (await dcsFlightService.getById(flightId)).body,
    retry: false,
  })

  const { data: selected } = useQuery({
    queryKey: [QUERY_KEYS.PASSENGER, search.pax],
    queryFn: async () => (await dcsPassengerService.getById(search.pax!)).body,
    enabled: !!search.pax,
  })

  const selectSegment = useCallback(
    (segmentId?: number) =>
      navigate({ search: (prev) => ({ ...prev, pax: segmentId }) }),
    [navigate]
  )
  const selectPassenger = useCallback(
    (pax: DcsPassenger) => selectSegment(pax.id),
    [selectSegment]
  )

  const setView = (value: CheckinTab) =>
    navigate({
      search: (prev) => ({
        pax: prev.pax,
        tab: value === 'passengers' ? undefined : value,
      }),
    })

  // ─── keyboard commands owned by the page (the panels register their own) ───
  useShortcutKeys()
  // legacy Ctrl+R: drop the passenger and the search, back to the passenger view, reload everything
  const refreshAll = () => {
    void navigate({ search: {} })
    void refetch()
    void invalidateDcs()
  }
  useCommand('refresh', refreshAll)
  useCommand('passengerView', () => void setView('passengers'))
  useCommand('baggageView', () => void setView('baggage'))
  useCommand('boardingPass', () => {
    if (selected && (selected.status === 'checked_in' || selected.status === 'boarded')) {
      void printBoardingPass(selected.id)
    } else {
      toast.info('Select a checked-in passenger to print the boarding pass.', { id: 'shortcut' })
    }
  })
  useCommand('escape', () => {
    if (!search.pax) return false
    selectSegment(undefined)
  })

  // Flight ids change when the demo seeder re-runs — an old /flights/{id} link lands here
  if (isError) {
    return (
      <Main className='fm-backdrop flex flex-1 flex-col items-center justify-center gap-3 text-center'>
        <PlaneTakeoff className='text-muted-foreground size-10' />
        <p className='font-semibold'>Flight #{flightId} is not available</p>
        <p className='text-muted-foreground text-sm'>{(error as Error).message}</p>
        <Button asChild size='sm'>
          <Link to='/'>Back to departures</Link>
        </Button>
      </Main>
    )
  }

  if (isLoading || !flight) {
    return (
      <Main className='flex flex-col gap-4'>
        <Skeleton className='h-24 rounded-2xl' />
        <Skeleton className='h-28 rounded-2xl' />
        <Skeleton className='h-96 rounded-2xl' />
      </Main>
    )
  }

  return (
    // fixed: the page is exactly the viewport — each column scrolls inside itself
    <Main fixed className='fm-backdrop gap-3 py-3'>
      <FlightBar
        flight={flight}
        onRefresh={refreshAll}
        isRefreshing={isFetching}
        live={live}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      <WorkspaceLayout
        panels={{
          list: (
            <PassengerListPanel
              flight={flight}
              view={view}
              onViewChange={setView}
              search={search}
              navigate={tableNavigate}
              selectedId={search.pax}
              onSelect={selectPassenger}
            />
          ),
          info: (
            <PassengerPanel
              key={search.pax}
              flight={flight}
              segmentId={search.pax}
              onClose={() => selectSegment(undefined)}
              onSelectSegment={selectSegment}
            />
          ),
          // keyed: the option, pieces and weight typed for one passenger must not carry over to the next
          baggage: <BaggagePanel key={search.pax ?? 'none'} flight={flight} segmentId={search.pax} />,
          seats: (
            <SeatMapView
              flightId={flightId}
              aircraftType={flight.aircraft.type}
              checkinOpen={flight.status === 'checkin_open'}
              selected={search.pax ? selected : null}
              onSelectSegment={selectSegment}
            />
          ),
        }}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </Main>
  )
}
