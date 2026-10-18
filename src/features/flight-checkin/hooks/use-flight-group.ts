import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dcsPassengerService } from '@/services'
import { groupColors } from '@/lib/group-colors'
import { QUERY_KEYS } from '../components/constants'

/** The passenger's check-in group on this flight: per-flight number, members and the bags they share. */
export function useFlightGroup(flightId: number, groupId: number | null) {
  const { data: rows = [] } = useQuery({
    queryKey: [QUERY_KEYS.PASSENGERS, flightId],
    queryFn: () => dcsPassengerService.all(flightId),
    enabled: groupId !== null,
  })

  return useMemo(() => {
    if (groupId === null) return null
    const members = rows.filter((r) => r.group_id === groupId)
    return {
      number: groupColors(rows.map((r) => r.group_id)).get(groupId)?.number ?? null,
      members,
      bagPieces: members.reduce((sum, m) => sum + (m.baggage?.pieces ?? 0), 0),
    }
  }, [rows, groupId])
}
