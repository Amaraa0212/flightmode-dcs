import { toast } from 'sonner'
import { dcsBaggageService, dcsPassengerService, type BoardingPass } from '@/services'
import { joinDocuments, printDocument } from './print'
import { bagTagDocument, boardingPassDocument } from './print-templates'
import { errorText, qzPrintHtml } from './qz'

/*
| Counter print jobs. Like the legacy DCS they go straight to the thermal printer through QZ Tray;
| when QZ Tray is not running the same document opens in the browser print dialog.
*/

async function print(kind: 'boardingPass' | 'bagTag', documents: string[], label: string) {
  try {
    const printer = await qzPrintHtml(kind, documents)
    toast.success(`${label} → ${printer}`)
  } catch (error) {
    toast.warning(`QZ Tray: ${errorText(error)} — printing through the browser.`)
    printDocument(joinDocuments(documents))
  }
}

/** Print an already loaded boarding pass */
export function printPass(pass: BoardingPass) {
  return print('boardingPass', [boardingPassDocument(pass)], `Boarding pass ${pass.seat_number}`)
}

/** Boarding pass of a checked-in passenger (API marks it printed) */
export async function printBoardingPass(segmentId: number) {
  try {
    await printPass((await dcsPassengerService.boardingPass(segmentId)).body!)
  } catch (error) {
    toast.error(`Boarding pass: ${errorText(error)}`)
  }
}

/** One bag tag per tag id (legacy printed each tag as its own job) */
export async function printBagTags(tagIds: number[]) {
  if (!tagIds.length) return
  try {
    const tags = await Promise.all(tagIds.map(async (id) => (await dcsBaggageService.tag(id)).body!))
    await print('bagTag', tags.map(bagTagDocument), tags.length > 1 ? `${tags.length} bag tags` : `Bag tag ${tags[0].tag_number}`)
  } catch (error) {
    toast.error(`Bag tag: ${errorText(error)}`)
  }
}
