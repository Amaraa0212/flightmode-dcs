import { useState } from 'react'
import { BriefcaseBusiness, FileText, Users } from 'lucide-react'
import type { DcsFlight, DcsPassenger } from '@/services'
import { cn } from '@/lib/utils'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { focusSoon, MOD, useCommand } from '../shortcuts'
import { BaggageTab } from './baggage-tab'
import { ManifestDialog } from './manifest-dialog'
import { type CheckinTab, TABLE_CONFIG } from './constants'
import { PanelHeader } from './panel-header'
import { PassengersTab } from './passengers-tab'

type PassengerListPanelProps = {
  flight: DcsFlight
  view: CheckinTab
  onViewChange: (view: CheckinTab) => void
  search: Record<string, unknown>
  navigate: NavigateFn
  selectedId?: number
  onSelect: (passenger: DcsPassenger) => void
  /** baggage view → the bag owner's passenger, back in the passenger view */
  onSelectBagOwner: (segmentId: number) => void
}

const VIEWS = [
  { value: 'passengers', label: 'Passenger view', icon: Users },
  { value: 'baggage', label: 'Baggage view', icon: BriefcaseBusiness },
] as const

function SummaryChip({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <span className={cn('rounded-md border px-2.5 py-1 text-xs font-semibold', className)}>
      {label}: <span className='font-mono'>{value}</span>
    </span>
  )
}

export function PassengerListPanel({
  flight,
  view,
  onViewChange,
  search,
  navigate,
  selectedId,
  onSelect,
  onSelectBagOwner,
}: PassengerListPanelProps) {
  const { stats } = flight

  // Ctrl+S: the passenger search box (switches back from the baggage list first)
  useCommand('search', () => {
    if (view !== 'passengers') onViewChange('passengers')
    focusSoon(() =>
      document.querySelector<HTMLInputElement>(
        `input[placeholder="${TABLE_CONFIG.PASSENGER_SEARCH_PLACEHOLDER}"]`
      )
    )
  })
  const [manifestOpen, setManifestOpen] = useState(false)

  return (
    <section className='fm-panel flex min-w-0 flex-col overflow-hidden'>
      <PanelHeader
        title={view === 'passengers' ? 'Passengers' : 'Baggage'}
        action={
          <div className='bg-surface flex rounded-lg border p-0.5'>
            {VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type='button'
                title={`${label} (${MOD}+${value === 'passengers' ? 'E' : 'D'})`}
                aria-label={label}
                onClick={() => onViewChange(value)}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md transition',
                  view === value
                    ? 'bg-cyan-400 text-[#04121c]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className='size-4' />
              </button>
            ))}
          </div>
        }
      />

      <div className='flex min-h-0 min-w-0 flex-1 flex-col p-3'>
        {view === 'passengers' ? (
          <PassengersTab
            flightId={flight.id}
            search={search}
            navigate={navigate}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ) : (
          <BaggageTab
            flightId={flight.id}
            search={search}
            navigate={navigate}
            canEdit={flight.status === 'checkin_open'}
            onSelectOwner={onSelectBagOwner}
          />
        )}
      </div>

      <div className='flex flex-wrap items-center gap-2 border-t px-3 py-2'>
        <span className='me-1 text-sm font-semibold'>
          Total PAX: <span className='font-mono'>{stats.booked}</span>
        </span>
        <SummaryChip label='Wait list' value={stats.waitlisted} className='border-rose-400/30 bg-rose-500/10 text-rose-600 dark:text-rose-300' />
        <SummaryChip label='Go Show' value={stats.go_show} className='border-indigo-400/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300' />
        <SummaryChip label='OCI Check In' value={stats.online_checked_in} className='border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-300' />
        <Button
          size='sm'
          className='ms-auto gap-2 bg-emerald-500 text-white hover:bg-emerald-600'
          onClick={() => setManifestOpen(true)}
        >
          <FileText className='size-4' />
          Manifest
        </Button>
      </div>
      <ManifestDialog flight={flight} open={manifestOpen} onOpenChange={setManifestOpen} />
    </section>
  )
}
