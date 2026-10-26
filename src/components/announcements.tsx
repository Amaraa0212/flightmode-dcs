import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { announcementService, type Announcement } from '@/services'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const QUERY_KEY = ['announcements']
const ACK_KEY = 'dcs_acknowledged_announcements'

/** Required announcements cannot be dismissed on the API — they are shown once per session and stay in the bell. */
function readAcknowledged(): number[] {
  try {
    return JSON.parse(sessionStorage.getItem(ACK_KEY) ?? '[]') as number[]
  } catch {
    return []
  }
}

function useAnnouncements() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await announcementService.list()).body ?? [],
    refetchInterval: 60_000,
  })
}

function Item({ a, onDismiss }: { a: Announcement; onDismiss?: () => void }) {
  return (
    <div className='fm-inset space-y-1 p-3'>
      <div className='flex items-start justify-between gap-2'>
        <p className='text-sm font-semibold'>{a.title}</p>
        {a.requires_acknowledgement ? (
          <span className='shrink-0 rounded border border-amber-400/40 px-1 text-[10px] font-bold text-amber-500 uppercase'>
            Required
          </span>
        ) : (
          onDismiss && (
            <button type='button' onClick={onDismiss} className='text-muted-foreground hover:text-foreground' aria-label='Dismiss'>
              <X className='size-3.5' />
            </button>
          )
        )}
      </div>
      <p className='text-muted-foreground text-xs whitespace-pre-line'>{a.body}</p>
      <p className='text-muted-foreground text-[10px]'>
        {a.airline ?? 'FlightMode'} · {formatDate(a.created_at, 'YYYY-MM-DD HH:mm')}
      </p>
    </div>
  )
}

/** Header bell (legacy DCS Notification.vue) */
export function AnnouncementBell() {
  const queryClient = useQueryClient()
  const { data = [] } = useAnnouncements()
  const dismiss = useMutation({
    mutationFn: (id: number) => announcementService.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='relative size-8 rounded-full' aria-label='Announcements'>
          <Bell className='size-4' />
          {data.length > 0 && (
            <span className='absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-cyan-400 text-[9px] font-bold text-[#04121c]'>
              {data.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-96 space-y-2 p-3'>
        <p className='fm-label'>Announcements</p>
        {data.length ? (
          <div className='max-h-96 space-y-2 overflow-y-auto'>
            {data.map((a) => (
              <Item key={a.id} a={a} onDismiss={() => dismiss.mutate(a.id)} />
            ))}
          </div>
        ) : (
          <p className='text-muted-foreground py-6 text-center text-sm'>No announcements</p>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Legacy RequiredNotificationModal: required announcements are confirmed once per session.
 * `then` (another prompt) opens only after they are confirmed, so two modals never stack.
 */
export function RequiredAnnouncementsModal({ then }: { then?: React.ReactNode }) {
  const { data = [], isFetched } = useAnnouncements()
  const [acknowledged, setAcknowledged] = useState<number[]>(readAcknowledged)
  const pending = data.filter((a) => a.requires_acknowledgement && !acknowledged.includes(a.id))

  const confirm = () => {
    const next = [...acknowledged, ...pending.map((a) => a.id)]
    try {
      sessionStorage.setItem(ACK_KEY, JSON.stringify(next))
    } catch {
      // storage may be unavailable — acknowledgement then lasts until reload
    }
    setAcknowledged(next)
  }

  if (isFetched && pending.length === 0) return then ?? null

  return (
    <Dialog open={pending.length > 0}>
      <DialogContent className='sm:max-w-lg [&>button]:hidden' onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Please read before you start</DialogTitle>
          <DialogDescription>{pending.length} required announcement(s) from your airline</DialogDescription>
        </DialogHeader>
        <div className='max-h-[60vh] space-y-2 overflow-y-auto'>
          {pending.map((a) => (
            <Item key={a.id} a={a} />
          ))}
        </div>
        <DialogFooter>
          <Button className='gap-2' onClick={confirm}>
            <CheckCheck className='size-4' />
            I have read these
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
