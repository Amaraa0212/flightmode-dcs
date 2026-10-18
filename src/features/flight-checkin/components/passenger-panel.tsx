import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Baby,
  CheckCircle2,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Users,
  Undo2,
  X,
} from 'lucide-react'
import {
  dcsFlightService,
  dcsPassengerService,
  type DcsFlight,
  type DcsPassenger,
  type PassengerActivity,
  type Screening,
} from '@/services'
import { cn, formatDate } from '@/lib/utils'
import { ageOn, passengerName, titleName } from '@/lib/flight'
import { CABIN_CLASS, SEGMENT_STATUS } from '@/constants/status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoPill, StatusChip } from '@/components/status-chip'
import { usePassengerActions } from '../hooks/use-dcs-actions'
import { useFlightGroup } from '../hooks/use-flight-group'
import { QUERY_KEYS } from './constants'
import { PanelHeader } from './panel-header'
import { PassengerLogDialog } from './passenger-log-dialog'
import { BoardingPassDialog } from './boarding-pass-dialog'
import { DOCUMENT_TYPES, PassengerForm, toFormValues } from './passenger-form'

type PassengerPanelProps = {
  flight: DcsFlight
  segmentId?: number
  onClose: () => void
  onSelectSegment: (segmentId: number) => void
}

/**
 * General Info багана (хуучин DCS "General Info / Add Passenger"):
 *  - зорчигч сонгосон → Passenger мэдээлэл, засах, check-in үйлдлүүд
 *  - сонгоогүй → Add Passenger (go-show) form
 */
export function PassengerPanel({
  flight,
  segmentId,
  onClose,
  onSelectSegment,
}: PassengerPanelProps) {
  const { data: pax, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.PASSENGER, segmentId],
    queryFn: async () => (await dcsPassengerService.getById(segmentId!)).body,
    enabled: !!segmentId,
  })

  return (
    <section className='fm-panel flex min-w-0 flex-col overflow-hidden'>
      <PanelHeader
        title={segmentId ? 'General Info' : 'Add Passenger'}
        subtitle={segmentId ? 'Passenger' : 'Go-show'}
        action={
          segmentId && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 gap-1 px-2 text-xs'
              onClick={onClose}
              title='Clear selection to add a passenger'
            >
              <X className='size-3.5' />
              Close
            </Button>
          )
        }
      />

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {!segmentId ? (
          <AddPassenger flight={flight} onAdded={onSelectSegment} />
        ) : isLoading || !pax ? (
          <div className='space-y-3 p-4'>
            <Skeleton className='h-16 rounded-xl' />
            <Skeleton className='h-80 rounded-xl' />
          </div>
        ) : (
          <PassengerDetails flight={flight} pax={pax} />
        )}
      </div>
    </section>
  )
}

function useSsrOptions(flightId: number) {
  const { data = [] } = useQuery({
    queryKey: [QUERY_KEYS.SSR_OPTIONS, flightId],
    queryFn: async () => (await dcsFlightService.ssrOptions(flightId)).body ?? [],
    staleTime: 5 * 60_000,
  })
  return data
}

// ─── Add passenger (go-show) ───
function AddPassenger({
  flight,
  onAdded,
}: {
  flight: DcsFlight
  onAdded: (segmentId: number) => void
}) {
  const { addGoShow } = usePassengerActions({ onAdded })
  const ssrOptions = useSsrOptions(flight.id)
  const open = flight.status === 'checkin_open'

  return (
    <div className='flex flex-col gap-3 p-3'>
      <p className='text-muted-foreground text-xs'>
        Select a passenger from the list to view details, or add a go-show
        passenger to <b className='text-foreground'>{flight.flight_number}</b>.
      </p>
      {!open && (
        <p className='fm-inset p-2.5 text-center text-xs text-amber-600 dark:text-amber-300'>
          Passengers can be added only while check-in is open.
        </p>
      )}
      <PassengerForm
        mode='create'
        defaultValues={toFormValues(null)}
        ssrOptions={ssrOptions}
        disabled={!open}
        isSubmitting={addGoShow.isPending}
        onSubmit={(payload) => addGoShow.mutate({ flightId: flight.id, payload })}
      />
    </div>
  )
}

// ─── Selected passenger ───
function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className='flex items-baseline justify-between gap-3 py-[5px] text-sm'>
      <span className='text-muted-foreground shrink-0'>{label}:</span>
      <span className={cn('min-w-0 truncate text-end font-medium', mono && 'font-mono')}>
        {value || '-'}
      </span>
    </div>
  )
}

const TYPE_BADGE: Record<string, string> = {
  ADT: 'bg-slate-600 text-white',
  CHD: 'bg-amber-500 text-[#1a1203]',
  INF: 'bg-indigo-500 text-white',
}

function PassengerDetails({ flight, pax }: { flight: DcsFlight; pax: DcsPassenger }) {
  const [editing, setEditing] = useState(false)
  const { checkIn, uncheck, update, ungroup } = usePassengerActions({
    onSaved: () => setEditing(false),
  })

  const [boardingPassOpen, setBoardingPassOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const ssrOptions = useSsrOptions(flight.id)
  const group = useFlightGroup(flight.id, pax.group_id)
  const ssrName = (code: string) => ssrOptions.find((o) => o.code === code)?.name ?? code
  const { data: activity = [] } = useQuery({
    queryKey: [QUERY_KEYS.ACTIVITY, pax.passenger_id],
    queryFn: async () => (await dcsPassengerService.activity(pax.passenger_id)).body ?? [],
  })

  const checkinOpen = flight.status === 'checkin_open'
  const banned = pax.screening?.status === 'banned'
  const canCheckIn = checkinOpen && pax.status === 'booked' && pax.type !== 'INF' && !banned
  const canUncheck = checkinOpen && pax.status === 'checked_in' && pax.type !== 'INF'
  const isCheckedIn = pax.status === 'checked_in' || pax.status === 'boarded'
  const canEdit = pax.status !== 'boarded' && pax.status !== 'flown'
  const documentValid =
    !!pax.document_number &&
    !!pax.document_expires_at &&
    pax.document_expires_at > flight.scheduled_departure_at.slice(0, 10)
  const documentLabel =
    DOCUMENT_TYPES.find((d) => d.value === pax.document_type)?.label ?? pax.document_type

  return (
    <div className='flex flex-col gap-3 p-3'>
      {/* identity */}
      <div className='flex items-center gap-3 rounded-xl bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.12),transparent_70%)] p-1'>
        <div className='relative shrink-0'>
          <div className='rounded-full bg-[conic-gradient(from_200deg,#22d3ee,#34d399,#6366f1,#22d3ee)] p-[2px]'>
            <div className='bg-card flex size-12 items-center justify-center rounded-full font-bold'>
              {pax.first_name[0]}
              {pax.last_name[0]}
            </div>
          </div>
          <span
            className={cn(
              'absolute -end-2 -bottom-1 rounded-full border-2 border-[var(--card)] px-1.5 text-[9px] font-bold',
              TYPE_BADGE[pax.type]
            )}
          >
            {pax.type}
          </span>
        </div>
        <div className='min-w-0 flex-1'>
          <p className='truncate font-bold'>{titleName(pax)}</p>
          <div className='mt-1 flex items-center gap-1.5'>
            <StatusChip value={pax.status} map={SEGMENT_STATUS} />
            {pax.is_go_show && (
              <span className='rounded border border-indigo-400/40 px-1 text-[10px] font-bold text-nowrap text-indigo-400'>
                GO-SHOW
              </span>
            )}
          </div>
        </div>
        <div className='flex gap-1.5'>
          <ContactButton href={pax.phone ? `tel:${pax.phone.replace(/\s/g, '')}` : null} label='Call passenger' icon={Phone} />
          <ContactButton href={pax.email ? `mailto:${pax.email}` : null} label='Email passenger' icon={Mail} />
        </div>
      </div>

      <div className='flex flex-wrap gap-1.5'>
        <InfoPill label='Seat' value={pax.seat_number ?? '—'} className='px-2.5' />
        <InfoPill
          label='Cabin'
          className='px-2.5'
          value={
            <>
              <span className='text-amber-400'>{pax.cabin_class}</span>
              <span className='text-muted-foreground ms-1 font-sans text-[10px] font-normal'>
                ({CABIN_CLASS[pax.cabin_class]})
              </span>
            </>
          }
        />
        {pax.fare_class && <InfoPill label='Fare' value={pax.fare_class} className='px-2.5' />}
      </div>

      {/* Passenger card — legacy layout */}
      <fieldset className='rounded-xl border px-3 pt-1 pb-2'>
        <legend className='flex w-full items-center justify-between gap-2 px-1'>
          <span className='text-sm font-semibold'>Passenger</span>
          {!editing && canEdit && (
            <Button
              variant='outline'
              size='sm'
              className='h-6 gap-1 px-2 text-[11px]'
              onClick={() => setEditing(true)}
            >
              <Pencil className='size-3' />
              Edit
            </Button>
          )}
        </legend>

        {editing ? (
          <div className='pt-1'>
            <PassengerForm
              mode='edit'
              defaultValues={toFormValues(pax)}
              ssrOptions={ssrOptions}
              hadInfant={!!pax.infant}
              isSubmitting={update.isPending}
              onCancel={() => setEditing(false)}
              onSubmit={({ cabin_class: _cabin, ...payload }) =>
                update.mutate({ passengerId: pax.passenger_id, payload })
              }
            />
          </div>
        ) : (
          <div className='divide-border/50 divide-y'>
            <InfoRow label='PNR' value={<span className='text-brand'>{pax.pnr}</span>} mono />
            <InfoRow label='Doc ID' value={pax.document_number} mono />
            <InfoRow label='Doc type' value={documentLabel} />
            <InfoRow label='Surname' value={pax.last_name} />
            <InfoRow label='Given name' value={pax.first_name} />
            {pax.middle_name && <InfoRow label='Middle name' value={pax.middle_name} />}
            <InfoRow label='Nationality' value={pax.nationality} />
            <InfoRow
              label='Date of birth'
              value={
                <>
                  {pax.date_of_birth}
                  <span className='text-muted-foreground ms-1 text-xs'>{pax.date_of_birth && `(${ageOn(pax.date_of_birth)}y)`}</span>
                </>
              }
              mono
            />
            <InfoRow label='Sex' value={pax.gender === 'M' ? 'Male' : 'Female'} />
            <InfoRow
              label='Date of expiry'
              value={
                <span className={documentValid ? '' : 'text-rose-500'}>{pax.document_expires_at}</span>
              }
              mono
            />
            <InfoRow
              label='SSR'
              value={
                pax.ssr_codes.length ? (
                  <span title={pax.ssr_codes.map(ssrName).join(', ')}>
                    {pax.ssr_codes.join(', ')}
                  </span>
                ) : null
              }
              mono
            />
            <InfoRow label='Phone' value={pax.phone} mono />
            {pax.email && <InfoRow label='Email' value={pax.email} />}
            <InfoRow label='Emergency' value={pax.emergency_contact} />
            {pax.remark && <InfoRow label='Remark' value={pax.remark} />}
            <InfoRow label='E-ticket' value={pax.ticket_number} mono />
            <InfoRow label='Booking' value={pax.agency ?? (pax.is_go_show ? 'Counter (go-show)' : 'Direct')} />
          </div>
        )}
      </fieldset>

      {pax.infant && (
        <div className='fm-inset flex items-center gap-2.5 px-3 py-2'>
          <Baby className='size-4 text-indigo-400' />
          <div className='min-w-0 flex-1'>
            <p className='text-muted-foreground text-[11px]'>
              Travelling with infant (checked in together)
            </p>
            <p className='truncate text-sm font-semibold'>
              {passengerName(pax.infant)}
              {pax.infant.date_of_birth && (
                <span className='text-muted-foreground ms-1 font-mono text-xs font-normal'>
                  {pax.infant.date_of_birth}
                </span>
              )}
            </p>
            <p className='text-muted-foreground font-mono text-[10px]'>
              {pax.infant.document_number ?? 'no document'} · exp {pax.infant.document_expires_at ?? '-'}
            </p>
          </div>
        </div>
      )}

      {pax.group_id && (
        <div className='fm-inset flex items-center gap-2.5 px-3 py-2'>
          <Users className='text-brand size-4' />
          <div className='min-w-0 flex-1'>
            <p className='text-muted-foreground text-[11px]'>Check-in group</p>
            <p className='text-sm font-semibold'>
              Group {group?.number ?? ''} · {group?.members.length ?? ''} pax · shared baggage
            </p>
            {!!group?.bagPieces && (
              <p className='text-[11px] text-amber-600 dark:text-amber-300'>
                {group.bagPieces} bag(s) checked on the group allowance — delete them before removing a passenger.
              </p>
            )}
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            disabled={ungroup.isPending || !!group?.bagPieces}
            title={group?.bagPieces ? 'Ungrouping is not allowed while the group has checked baggage' : undefined}
            onClick={() => ungroup.mutate(pax.id)}
          >
            Remove from group
          </Button>
        </div>
      )}

      <ScreeningCard documentValid={documentValid} screening={pax.screening} />

      {/* actions */}
      {canCheckIn && !editing && (
        <button
          type='button'
          disabled={checkIn.isPending}
          onClick={() => checkIn.mutate({ segmentId: pax.id })}
          className='fm-gradient fm-glow flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-[#04121c] transition hover:brightness-110 disabled:opacity-70'
        >
          {checkIn.isPending ? <Loader2 className='size-4 animate-spin' /> : <CheckCircle2 className='size-4' />}
          Check In Passenger
        </button>
      )}
      {isCheckedIn && !editing && (
        <div className='flex gap-2'>
          <Button
            className='h-10 flex-1 gap-2 rounded-xl'
            onClick={() => setBoardingPassOpen(true)}
          >
            <Printer className='size-4' />
            Boarding pass
          </Button>
          {canUncheck && (
            <Button
              variant='outline'
              className='h-10 gap-2 rounded-xl'
              disabled={uncheck.isPending}
              onClick={() => uncheck.mutate(pax.id)}
            >
              <Undo2 className='size-4' />
              Un-check
            </Button>
          )}
        </div>
      )}
      {!checkinOpen && pax.status === 'booked' && (
        <p className='fm-inset text-muted-foreground p-2.5 text-center text-xs'>
          Check-in is {flight.status === 'scheduled' ? 'not open yet' : 'closed'} for this flight.
        </p>
      )}
      {pax.type === 'INF' && pax.status === 'booked' && checkinOpen && (
        <p className='fm-inset text-muted-foreground p-2.5 text-center text-xs'>
          Infant is checked in together with the accompanying adult.
        </p>
      )}

      <ActivityList activity={activity} onShowAll={() => setLogOpen(true)} />
      <PassengerLogDialog
        passenger={logOpen ? { passenger_id: pax.passenger_id, name: passengerName(pax) } : null}
        onClose={() => setLogOpen(false)}
      />

      {boardingPassOpen && (
        <BoardingPassDialog
          segmentId={pax.id}
          onClose={() => setBoardingPassOpen(false)}
        />
      )}
    </div>
  )
}

function ContactButton({
  href,
  label,
  icon: Icon,
}: {
  href: string | null
  label: string
  icon: React.ElementType
}) {
  if (!href) {
    return (
      <Button variant='outline' size='icon' className='size-8 rounded-lg' disabled aria-label={label}>
        <Icon className='size-4' />
      </Button>
    )
  }
  return (
    <Button asChild variant='outline' size='icon' className='size-8 rounded-lg'>
      <a href={href} aria-label={label}>
        <Icon className='text-brand size-4' />
      </a>
    </Button>
  )
}

function ActivityList({ activity, onShowAll }: { activity: PassengerActivity[]; onShowAll: () => void }) {
  if (!activity.length) return null
  return (
    <div className='border-t pt-3'>
      <div className='mb-2 flex items-center justify-between'>
        <p className='fm-label'>Activity</p>
        <button type='button' onClick={onShowAll} className='text-brand text-[11px] font-semibold hover:underline'>
          View all ({activity.length})
        </button>
      </div>
      <ol className='max-h-40 space-y-2 overflow-y-auto pe-1'>
        {activity.map((log) => (
          <li key={log.id} className='text-xs'>
            <p>{log.description}</p>
            <p className='text-muted-foreground text-[10px]'>
              {log.user} • {formatDate(log.created_at, 'MM-DD HH:mm')}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** APIS document validity + ban-list screening (API: segment.screening) */
function ScreeningCard({ documentValid, screening }: { documentValid: boolean; screening: Screening | null }) {
  const status = screening?.status ?? 'cleared'
  const tone =
    status === 'banned'
      ? 'border-rose-400/50 bg-rose-500/10 text-rose-600 dark:text-rose-300'
      : status === 'watch' || !documentValid
        ? 'border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-300'
        : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
  const label =
    status === 'banned' ? 'Banned' : status === 'watch' ? 'Watch list' : documentValid ? 'Cleared' : 'Check document'

  return (
    <div className={cn('fm-inset space-y-1.5 px-3 py-2', status === 'banned' && 'border-rose-400/50')}>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <p className='text-muted-foreground text-[11px]'>Security & ban screening</p>
          <p className='text-xs'>
            Document valid through departure: <b className='font-mono'>{documentValid ? 'Yes' : 'No'}</b>
          </p>
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase', tone)}>
          {status === 'banned' ? <ShieldAlert className='size-3' /> : <ShieldCheck className='size-3' />}
          {label}
        </span>
      </div>
      {screening?.bans.map((ban) => (
        <p key={ban.id} className='text-xs'>
          <b className='uppercase'>{ban.ban_type.replace('_', ' ')}</b>: {ban.reason}
          {ban.valid_until && <span className='text-muted-foreground'> (until {ban.valid_until})</span>}
        </p>
      ))}
      {status === 'banned' && (
        <p className='text-xs font-semibold text-rose-500'>Check-in is blocked for this passenger.</p>
      )}
    </div>
  )
}
