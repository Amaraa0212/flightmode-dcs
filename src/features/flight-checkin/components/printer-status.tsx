import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Printer, RotateCcw } from 'lucide-react'
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
]

/** QZ Tray connection + which printer each document goes to (saved per counter PC) */
export function PrinterStatus() {
  const { status, error } = useQzStatus()
  const [open, setOpen] = useState(false)

  // connect once when the counter opens, so the first print is instant
  useEffect(() => {
    connectQz().catch(() => undefined)
  }, [])

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        title={status === 'connected' ? 'QZ Tray connected — printer settings' : `QZ Tray ${status}${error ? `: ${error}` : ''}`}
        className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase'
      >
        <Printer className='size-3' />
        <span className={cn('size-1.5 rounded-full', STATUS[status].dot)} />
        {STATUS[status].label}
      </button>
      {open && <PrinterDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function PrinterDialog({ onClose }: { onClose: () => void }) {
  const { status, error } = useQzStatus()
  const settings = usePrinterSettings()
  const [draft, setDraft] = useState<PrinterSettings>({
    boardingPass: settings.boardingPass,
    bagTag: settings.bagTag,
    bagTagFallback: settings.bagTagFallback,
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
          <DialogTitle>Counter printers</DialogTitle>
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

        <DialogFooter>
          <Button variant='outline' onClick={() => setDraft(DEFAULT_PRINTERS)}>
            Defaults
          </Button>
          <Button
            onClick={() => {
              settings.set(draft)
              onClose()
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
