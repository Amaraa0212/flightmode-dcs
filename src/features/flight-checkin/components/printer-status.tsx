import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Printer, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { dcsCounterSettingsService, type DcsFlight } from '@/services'
import {
  connectQz,
  DEFAULT_PRINTERS,
  errorText,
  listPrinters,
  usePrinterSettings,
  useQzStatus,
  type PrinterSettings,
} from '@/lib/qz'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { QUERY_KEYS } from './constants'

const STATUS = {
  idle: { label: 'QZ', dot: 'bg-slate-500' },
  connecting: { label: 'QZ…', dot: 'bg-amber-400' },
  connected: { label: 'QZ', dot: 'bg-emerald-400' },
  offline: { label: 'QZ', dot: 'bg-rose-400' },
} as const

const FIELDS: { key: keyof PrinterSettings; label: string; hint: string }[] = [
  { key: 'boardingPass', label: 'Boarding pass printer', hint: '80 mm, legacy "Printer POS-80"' },
  { key: 'bagTag', label: 'Bag tag printer', hint: '51 mm strip, legacy "PrinterBagTag"' },
  { key: 'bagTagFallback', label: 'Bag tag fallback', hint: 'used when the first one is missing' },
  { key: 'bagTagFeeder', label: 'Bag tag feeder', hint: 'paper tray of the bag tag printer (e.g. Tray 1) — empty = default' },
]

/** QZ Tray connection + which printer each document goes to (saved per counter PC) */
/** QZ Tray status only — the settings open with the supervisor shortcut (Ctrl+Alt+Shift+S) */
export function PrinterStatus() {
  const { status, error } = useQzStatus()

  // connect once when the counter opens, so the first print is instant
  useEffect(() => {
    connectQz().catch(() => undefined)
  }, [])

  return (
    <>
      <span
        title={status === 'connected' ? 'QZ Tray connected' : `QZ Tray ${status}${error ? `: ${error}` : ''}`}
        className='text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase'
      >
        <Printer className='size-3' />
        <span className={cn('size-1.5 rounded-full', STATUS[status].dot)} />
        {STATUS[status].label}
      </span>
    </>
  )
}

/**
 * Counter settings (supervisor, Ctrl+Alt+Shift+S): QZ Tray printers and bag tag feeder (saved per counter PC),
 * the flight's gate and its gate agents (saved on the flight).
 */
export function CounterSettingsDialog({ flight, onClose }: { flight: DcsFlight; onClose: () => void }) {
  const { status, error } = useQzStatus()
  const settings = usePrinterSettings()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<PrinterSettings>({
    boardingPass: settings.boardingPass,
    bagTag: settings.bagTag,
    bagTagFallback: settings.bagTagFallback,
    bagTagFeeder: settings.bagTagFeeder ?? '',
  })
  const [gate, setGate] = useState(flight.gate ?? '')
  const { data: crew, isLoading: crewLoading } = useQuery({
    queryKey: ['counter-gate-agents', flight.id],
    queryFn: () => dcsCounterSettingsService.gateAgents(flight.id),
    retry: false,
  })
  const [agents, setAgents] = useState<number[] | null>(null)
  const chosen = agents ?? crew?.assigned ?? []
  const saveFlight = useMutation({
    mutationFn: async () => {
      if (gate.trim() !== (flight.gate ?? '')) await dcsCounterSettingsService.setGate(flight.id, gate.trim())
      if (agents) await dcsCounterSettingsService.setGateAgents(flight.id, agents)
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const {
    data: printers = [],
    isFetching: loading,
    error: printersError,
    refetch,
  } = useQuery({ queryKey: ['qz-printers'], queryFn: listPrinters, retry: false, gcTime: 0 })
  const listError = printersError ? errorText(printersError) : null
  const load = () => void refetch()

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Counter settings</DialogTitle>
          <DialogDescription>
            Boarding passes and bag tags print straight to these printers through QZ Tray. Without QZ Tray the
            browser print dialog opens instead.
          </DialogDescription>
        </DialogHeader>

        <div className='fm-inset flex items-center gap-2 p-2.5 text-xs'>
          <span className={cn('size-2 rounded-full', STATUS[status].dot)} />
          <span className='flex-1'>
            {status === 'connected'
              ? `QZ Tray connected · ${printers.length} printers`
              : status === 'connecting' || loading
                ? 'Connecting to QZ Tray…'
                : `QZ Tray not reachable${listError || error ? ` — ${listError ?? error}` : ''}. Start QZ Tray on this PC.`}
          </span>
          <Button size='sm' variant='outline' className='h-7 gap-1' onClick={load} disabled={loading}>
            {loading ? <Loader2 className='size-3.5 animate-spin' /> : <RotateCcw className='size-3.5' />}
            Retry
          </Button>
        </div>

        <datalist id='qz-printers'>
          {printers.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className='grid gap-3'>
          {FIELDS.map((f) => (
            <label key={f.key} className='grid gap-1 text-sm'>
              <span className='font-medium'>{f.label}</span>
              <Input
                list='qz-printers'
                value={draft[f.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder={DEFAULT_PRINTERS[f.key]}
                className={cn(
                  'h-9',
                  printers.length > 0 && draft[f.key] && !printers.includes(draft[f.key]) && 'border-amber-400/60'
                )}
              />
              <span className='text-muted-foreground text-[11px]'>
                {printers.length > 0 && draft[f.key] && !printers.includes(draft[f.key])
                  ? 'Not found on this PC'
                  : f.hint}
              </span>
            </label>
          ))}
        </div>

        <div className='grid gap-3 border-t pt-3'>
          <label className='grid gap-1 text-sm'>
            <span className='font-medium'>Gate</span>
            <Input
              value={gate}
              onChange={(e) => setGate(e.target.value.toUpperCase())}
              placeholder='e.g. 5A'
              maxLength={10}
              className='h-9 w-32 font-mono'
            />
          </label>
          <div className='grid gap-1 text-sm'>
            <span className='font-medium'>Gate agents</span>
            {crewLoading ? (
              <Loader2 className='text-muted-foreground size-4 animate-spin' />
            ) : !crew ? (
              <span className='text-muted-foreground text-[11px]'>Your role cannot assign gate agents.</span>
            ) : crew.candidates.length ? (
              <div className='fm-inset grid max-h-36 gap-1 overflow-y-auto p-2'>
                {crew.candidates.map((user) => (
                  <label key={user.id} className='flex items-center gap-2 text-xs'>
                    <input
                      type='checkbox'
                      checked={chosen.includes(user.id)}
                      onChange={(e) =>
                        setAgents(e.target.checked ? [...chosen, user.id] : chosen.filter((id) => id !== user.id))
                      }
                    />
                    <span className='font-medium'>{user.name}</span>
                    <span className='text-muted-foreground truncate'>{user.email}</span>
                  </label>
                ))}
              </div>
            ) : (
              <span className='text-muted-foreground text-[11px]'>No gate agents at this station.</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setDraft(DEFAULT_PRINTERS)}>
            Default printers
          </Button>
          <Button
            disabled={saveFlight.isPending}
            onClick={async () => {
              settings.set(draft)
              try {
                await saveFlight.mutateAsync()
              } catch {
                return // the error is shown by the mutation
              }
              void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FLIGHT] })
              toast.success('Counter settings saved.')
              onClose()
            }}
          >
            {saveFlight.isPending && <Loader2 className='size-4 animate-spin' />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
