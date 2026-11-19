import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dcsPassengerService } from '@/services'
import { Loader2 } from 'lucide-react'
import { QUERY_KEYS } from './constants'

type Row = {
  nationality: string
  issuedBy: string
  adults: number
  infants: number
  checkedIn: number
}

const CHECKED_IN = ['checked_in', 'boarded', 'flown']

/**
 * Passengers by citizenship and the country that issued their passport (an infant counts with their own
 * documents): how many of each, and how many are checked in. Cancelled / waitlisted passengers are left out.
 */
export function NationalityTab({ flightId }: { flightId: number }) {
  const { data: passengers, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.PASSENGERS, flightId],
    queryFn: () => dcsPassengerService.all(flightId),
  })

  const { rows, total } = useMemo(() => {
    const groups = new Map<string, Row>()
    const add = (nationality: string | null, issuedBy: string | null, infant: boolean, checkedIn: boolean) => {
      const n = nationality || '—'
      const c = issuedBy || n
      const key = `${n}|${c}`
      const row = groups.get(key) ?? { nationality: n, issuedBy: c, adults: 0, infants: 0, checkedIn: 0 }
      if (infant) row.infants++
      else row.adults++
      if (checkedIn) row.checkedIn++
      groups.set(key, row)
    }
    for (const p of passengers ?? []) {
      if (p.status === 'cancelled' || p.status === 'waitlisted') continue
      const checkedIn = CHECKED_IN.includes(p.status)
      add(p.nationality, p.document_issuing_country, false, checkedIn)
      if (p.infant) add(p.infant.nationality, p.infant.document_issuing_country, true, checkedIn)
    }
    const rows = [...groups.values()].sort(
      (a, b) => b.adults + b.infants - (a.adults + a.infants) || a.nationality.localeCompare(b.nationality)
    )
    const total = rows.reduce(
      (t, r) => ({ adults: t.adults + r.adults, infants: t.infants + r.infants, checkedIn: t.checkedIn + r.checkedIn }),
      { adults: 0, infants: 0, checkedIn: 0 }
    )
    return { rows, total }
  }, [passengers])

  if (isLoading) {
    return (
      <div className='text-muted-foreground flex flex-1 items-center justify-center'>
        <Loader2 className='size-5 animate-spin' />
      </div>
    )
  }

  return (
    <div className='min-h-0 flex-1 overflow-auto rounded-lg border'>
      <table className='w-full text-sm'>
        <thead className='bg-surface text-muted-foreground sticky top-0 text-xs uppercase'>
          <tr>
            <th className='px-3 py-2 text-left font-semibold'>Citizenship</th>
            <th className='px-3 py-2 text-left font-semibold'>Passport issued by</th>
            <th className='px-3 py-2 text-right font-semibold'>ADT</th>
            <th className='px-3 py-2 text-right font-semibold'>INF</th>
            <th className='px-3 py-2 text-right font-semibold'>Total</th>
            <th className='px-3 py-2 text-right font-semibold'>Checked in</th>
          </tr>
        </thead>
        <tbody className='font-mono'>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className='text-muted-foreground px-3 py-6 text-center font-sans'>
                No passengers
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={`${r.nationality}|${r.issuedBy}`} className='border-t'>
              <td className='px-3 py-1.5 font-semibold'>{r.nationality}</td>
              <td className='px-3 py-1.5'>{r.issuedBy}</td>
              <td className='px-3 py-1.5 text-right'>{r.adults}</td>
              <td className='px-3 py-1.5 text-right'>{r.infants || ''}</td>
              <td className='px-3 py-1.5 text-right font-semibold'>{r.adults + r.infants}</td>
              <td className='px-3 py-1.5 text-right'>{r.checkedIn}</td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot className='bg-surface sticky bottom-0 border-t-2 font-mono font-semibold'>
            <tr>
              <td className='px-3 py-2 font-sans' colSpan={2}>
                Total · {rows.length} {rows.length === 1 ? 'group' : 'groups'}
              </td>
              <td className='px-3 py-2 text-right'>{total.adults}</td>
              <td className='px-3 py-2 text-right'>{total.infants || ''}</td>
              <td className='px-3 py-2 text-right'>{total.adults + total.infants}</td>
              <td className='px-3 py-2 text-right'>{total.checkedIn}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
