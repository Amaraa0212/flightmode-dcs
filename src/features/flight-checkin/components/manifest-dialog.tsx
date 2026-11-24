import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { dcsBaggageService, dcsFlightService, dcsSeatMapService, type DcsFlight } from '@/services'
import { manifestDocument, type ManifestOptions } from '@/lib/manifest-template'
import { printDocument } from '@/lib/print'
import { exportJsonToExcel } from '@/utils/table-export'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

type Report = 'balance' | 'passengers' | 'baggage'

/** Legacy dialog: the reports, copies of each (defaults 3 / 5 / 5) and who prepared them */
const REPORTS: { id: Report; label: string; copies: number }[] = [
  { id: 'balance', label: 'W&B Report', copies: 3 },
  { id: 'passengers', label: 'Passenger Manifest', copies: 5 },
  { id: 'baggage', label: 'Baggage Manifest', copies: 5 },
]

/**
 * Counter "Manifest" (legacy dcs/components/Manifest.vue → /dcs/print/manifest/{id}):
 * prints the W&B seatmap, passenger and baggage manifests of the checked-in passengers in one print job.
 */
export function ManifestDialog({
  flight,
  open,
  onOpenChange,
}: {
  flight: DcsFlight
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [checked, setChecked] = useState<Record<Report, boolean>>({ balance: true, passengers: true, baggage: true })
  const [copies, setCopies] = useState<Record<Report, string>>({ balance: '3', passengers: '5', baggage: '5' })
  const [preparedBy, setPreparedBy] = useState('')

  // a ticked report prints 1–20 copies; untick it to leave it out
  const count = (id: Report) =>
    checked[id] ? Math.max(1, Math.min(20, Math.trunc(Number(copies[id])) || 1)) : 0

  const print = useMutation({
    mutationFn: async () => {
      const [data, seatMap] = await Promise.all([
        dcsFlightService.manifest(flight.id),
        queryClient.fetchQuery({
          queryKey: [QUERY_KEYS.SEAT_MAP, flight.id, flight.aircraft.type],
          queryFn: async () => (await dcsSeatMapService.get(flight.id, flight.aircraft.type)).body,
        }),
      ])
      if (!seatMap) throw new Error('Seat map is not available for this aircraft.')
      const options: ManifestOptions = {
        balance: count('balance'),
        passengers: count('passengers'),
        baggage: count('baggage'),
        preparedBy,
      }
      printDocument(manifestDocument(data, seatMap, options))
    },
    onSuccess: () => onOpenChange(false),
    onError: (error: Error) => toast.error(error.message),
  })

  const excel = useMutation({
    mutationFn: () => dcsFlightService.downloadManifest(flight.id, flight.flight_number),
    onError: (error: Error) => toast.error(error.message),
  })

  // excess baggage report: every bag with excess pieces / kg — what was paid (billing number) or waived
  const excess = useMutation({
    mutationFn: async () => {
      const res = await dcsBaggageService.list(flight.id, { current: 1, pageSize: 10_000 })
      const bags = (res.body?.items ?? []).filter(
        (b) => b.type === 'passenger' && (b.excess_pieces > 0 || b.excess_kg > 0 || b.excess_price > 0)
      )
      if (!bags.length) throw new Error('No excess baggage on this flight.')
      const rows: Record<string, string | number>[] = bags.map((b, i) => ({
        '№': i + 1,
        PNR: b.pnr ?? '',
        Passenger: b.owner,
        Tags: b.tags.map((t) => t.tag_number).join(', '),
        Rule: b.rule ?? '',
        Pieces: b.pieces,
        'Weight kg': b.weight_kg,
        'Free kg': b.free_allowance_kg,
        'Excess pieces': b.excess_pieces,
        'Excess kg': b.excess_kg,
        'Excess price': b.excess_price,
        Waived: b.waived_amount,
        Collected: Math.max(0, b.excess_price - b.waived_amount),
        Currency: b.currency,
        'Billing / transaction №': b.payment_reference ?? '',
        'Waive reason': b.waive_reason ?? '',
        'Waived by': b.waive_authorized_by ?? '',
        Time: b.created_at,
      }))
      const sum = (key: string) => rows.reduce((total, r) => total + Number(r[key]), 0)
      rows.push({
        '№': '',
        PNR: '',
        Passenger: 'TOTAL',
        Tags: '',
        Rule: '',
        Pieces: sum('Pieces'),
        'Weight kg': sum('Weight kg'),
        'Free kg': sum('Free kg'),
        'Excess pieces': sum('Excess pieces'),
        'Excess kg': sum('Excess kg'),
        'Excess price': sum('Excess price'),
        Waived: sum('Waived'),
        Collected: sum('Collected'),
        Currency: bags[0].currency,
        'Billing / transaction №': '',
        'Waive reason': '',
        'Waived by': '',
        Time: '',
      })
      await exportJsonToExcel(rows, `${flight.flight_number}-excess-baggage.xlsx`)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const nothing = REPORTS.every((r) => count(r.id) === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Are you sure to print manifest?</DialogTitle>
          <DialogDescription>
            {flight.flight_number} · checked-in passengers · copies of each report
          </DialogDescription>
        </DialogHeader>

        <form
          id='manifest-form'
          className='grid gap-3'
          onSubmit={(e) => {
            e.preventDefault()
            if (!nothing) print.mutate()
          }}
        >
          {REPORTS.map((r) => (
            <div key={r.id} className='flex items-center gap-3'>
              <label className='flex flex-1 cursor-pointer items-center gap-2 text-sm'>
                <Checkbox
                  checked={checked[r.id]}
                  onCheckedChange={(v) => setChecked((s) => ({ ...s, [r.id]: v === true }))}
                />
                {r.label}
              </label>
              <Input
                type='number'
                min={1}
                max={20}
                aria-label={`${r.label} copies`}
                disabled={!checked[r.id]}
                value={copies[r.id]}
                onChange={(e) =>
                  setCopies((s) => ({ ...s, [r.id]: e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 2) }))
                }
                // empty or out of range on leaving the field: back to 1–20
                onBlur={() => setCopies((s) => ({ ...s, [r.id]: String(count(r.id) || 1) }))}
                className='h-8 w-16 font-mono'
              />
            </div>
          ))}
          <label className='grid gap-1 text-xs'>
            <span className='text-muted-foreground'>Үйлдсэн (prepared by)</span>
            <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className='h-9 uppercase' />
          </label>
        </form>

        <DialogFooter className='gap-2 sm:justify-between'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='gap-1.5'
            disabled={excel.isPending}
            onClick={() => excel.mutate()}
          >
            {excel.isPending ? <Loader2 className='size-4 animate-spin' /> : <FileSpreadsheet className='size-4' />}
            Excel
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='gap-1.5'
            title='Excess baggage report (Excel)'
            disabled={excess.isPending}
            onClick={() => excess.mutate()}
          >
            {excess.isPending ? <Loader2 className='size-4 animate-spin' /> : <FileSpreadsheet className='size-4' />}
            Excess bags
          </Button>
          <div className='flex gap-2'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              No
            </Button>
            <Button type='submit' form='manifest-form' className='gap-2' disabled={nothing || print.isPending}>
              {print.isPending ? <Loader2 className='size-4 animate-spin' /> : <Printer className='size-4' />}
              Print
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
