import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Printer } from 'lucide-react'
import { dcsPassengerService } from '@/services'
import { printPass } from '@/lib/print-jobs'
import { boardingPassDocument } from '@/lib/print-templates'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QUERY_KEYS } from './constants'

type BoardingPassDialogProps = {
  segmentId: number
  onClose: () => void
}

/**
 * GET /dcs/segments/{id}/boarding-pass — the preview is the exact 80 mm document that goes to the
 * boarding pass printer (legacy BP layout, QR of the IATA BCBP string).
 */
export function BoardingPassDialog({ segmentId, onClose }: BoardingPassDialogProps) {
  const [printing, setPrinting] = useState(false)
  const { data: pass, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.BOARDING_PASS, segmentId],
    queryFn: async () => (await dcsPassengerService.boardingPass(segmentId)).body,
    staleTime: 0,
    gcTime: 0,
  })

  const html = useMemo(() => (pass ? boardingPassDocument(pass) : ''), [pass])

  const print = async () => {
    if (!pass) return
    setPrinting(true)
    await printPass(pass)
    setPrinting(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Boarding pass</DialogTitle>
          <DialogDescription>Prints on the boarding pass printer through QZ Tray.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='flex justify-center py-10'>
            <Loader2 className='text-brand size-6 animate-spin' />
          </div>
        ) : error ? (
          <p className='text-destructive text-sm'>{(error as Error).message}</p>
        ) : pass ? (
          // 80 mm ≈ 302 px — the same document the printer receives
          <iframe
            title='Boarding pass preview'
            srcDoc={html}
            className='mx-auto h-[60vh] w-[318px] rounded-md border bg-white'
          />
        ) : null}

        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>
          <Button disabled={!pass || printing} onClick={print} className='gap-2'>
            {printing ? <Loader2 className='size-4 animate-spin' /> : <Printer className='size-4' />}
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
