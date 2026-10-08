import { useQuery } from '@tanstack/react-query'
import { Loader2, User } from 'lucide-react'
import { dcsPassengerService } from '@/services'
import { cn, formatDate } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QUERY_KEYS } from './constants'

/** ActivityLog.event → the action name shown on the badge (legacy config/action.php) */
const ACTION_NAME: Record<string, string> = {
  'passenger.checked_in': 'Check-in',
  'passenger.checkin_cancelled': 'Un-check',
  'passenger.seat_changed': 'Seat change',
  'passenger.boarded': 'Boarded',
  'passenger.offloaded': 'Offloaded',
  'passenger.updated': 'Passenger edit',
  'passenger.infant': 'Infant',
  'passenger.grouped': 'Group',
  'passenger.ungrouped': 'Ungroup',
  'passenger.waitlisted': 'Waitlist',
  'passenger.unwaitlisted': 'Off waitlist',
  'passenger.cancelled': 'Cancelled',
  'passenger.rebooked': 'Rebooked',
  'passenger.booking': 'Booking',
  'infant.date_of_birth': 'Infant edit',
  'infant.segments': 'Infant',
  'baggage.added': 'Baggage',
  'baggage.crew_added': 'Crew baggage',
  'baggage.removed': 'Baggage removed',
}

const CHANNEL_LABEL: Record<string, string> = {
  dcs: 'Counter',
  gate: 'Gate',
  online: 'Online',
  admin: 'Admin',
  agency: 'Agency',
  agency_api: 'Agency API',
}

const actionName = (event: string) =>
  ACTION_NAME[event] ??
  event
    .split('.')
    .pop()!
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())

const tone = (event: string) =>
  event === 'passenger.checkin_cancelled' || event.endsWith('removed') || event.endsWith('cancelled') || event === 'passenger.offloaded'
    ? 'border-rose-400/40 bg-rose-500/10 text-rose-600 dark:text-rose-300'
    : event.startsWith('baggage')
      ? 'border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-300'
      : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300'

/** Legacy PassengerLogModal: "Зорчигчийн үйлдлийн түүх" — every action on the passenger, newest first */
export function PassengerLogDialog({
  passenger,
  onClose,
}: {
  passenger: { passenger_id: number; name: string } | null
  onClose: () => void
}) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.ACTIVITY, passenger?.passenger_id],
    queryFn: async () => (await dcsPassengerService.activity(passenger!.passenger_id)).body ?? [],
    enabled: !!passenger,
  })

  return (
    <Dialog open={!!passenger} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex max-h-[90vh] flex-col sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Зорчигчийн үйлдлийн түүх</DialogTitle>
          <DialogDescription>
            {passenger?.name}
            {!isLoading && ` · ${logs.length} action${logs.length === 1 ? '' : 's'}`}
          </DialogDescription>
        </DialogHeader>

        <div className='-mx-1 min-h-0 flex-1 overflow-y-auto px-1'>
          {isLoading ? (
            <div className='text-muted-foreground flex flex-col items-center gap-2 py-8 text-sm'>
              <Loader2 className='size-6 animate-spin' />
              Уншиж байна...
            </div>
          ) : logs.length === 0 ? (
            <p className='text-muted-foreground py-8 text-center text-sm'>Түүх олдсонгүй</p>
          ) : (
            <ol className='space-y-2'>
              {logs.map((log) => (
                <li key={log.id} className='fm-inset px-3 py-2.5'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className={cn('rounded border px-2 py-0.5 text-xs font-semibold', tone(log.event))}>
                      {actionName(log.event)}
                    </span>
                    <span className='text-muted-foreground font-mono text-xs'>
                      {formatDate(log.created_at, 'YYYY-MM-DD HH:mm:ss')}
                    </span>
                    {CHANNEL_LABEL[log.channel] && (
                      <span className='text-muted-foreground ms-auto rounded border px-1.5 text-[10px] uppercase'>
                        {CHANNEL_LABEL[log.channel]}
                      </span>
                    )}
                  </div>
                  <p className='mt-1.5 text-sm'>{log.description}</p>
                  <p className='text-muted-foreground mt-1.5 flex items-center gap-1 border-t pt-1.5 text-xs'>
                    <User className='size-3' />
                    {log.user}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
