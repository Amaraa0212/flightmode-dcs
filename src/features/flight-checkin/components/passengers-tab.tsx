import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dcsPassengerService, type DcsPassenger } from '@/services'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { passengerName } from '@/lib/flight'
import { groupColors } from '@/lib/group-colors'
import { CABIN_OPTIONS, SEGMENT_STATUS_OPTIONS } from '@/constants/status'
import { useFilterParams } from '@/hooks/use-filter-params'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { BaseTable, DataTableBulkActions } from '@/components/data-table'
import { usePassengerActions } from '../hooks/use-dcs-actions'
import { MOD, useCommand } from '../shortcuts'
import { QUERY_KEYS, TABLE_CONFIG } from './constants'
import { createPassengerColumns } from './passenger-columns'
import { PassengerLogDialog } from './passenger-log-dialog'

/** Members of a check-in group one after another, where the first member stands; order inside kept */
function clusterGroups(items: DcsPassenger[]) {
  const members = new Map<number, DcsPassenger[]>()
  for (const row of items) {
    if (row.group_id)
      members.set(row.group_id, [...(members.get(row.group_id) ?? []), row])
  }
  const placed = new Set<number>()
  return items.flatMap((row) => {
    if (!row.group_id) return [row]
    if (placed.has(row.group_id)) return []
    placed.add(row.group_id)
    return members.get(row.group_id)!
  })
}

type PassengersTabProps = {
  flightId: number
  search: Record<string, unknown>
  navigate: NavigateFn
  selectedId?: number
  onSelect: (passenger: DcsPassenger) => void
}

export function PassengersTab({
  flightId,
  search,
  navigate,
  selectedId,
  onSelect,
}: PassengersTabProps) {
  const { group } = usePassengerActions()

  const { params: filterParams } = useFilterParams(search, {
    defaultMonths: 0,
    defaultPageSize: TABLE_CONFIG.DEFAULT_PAGE_SIZE,
    searchKey: TABLE_CONFIG.SEARCH_KEY,
  })
  const params = useMemo(
    () => ({ ...filterParams, current: 1, pageSize: TABLE_CONFIG.ALL_ROWS }),
    [filterParams]
  )

  // API returns every adult of the flight; search / filter are applied here, all rows are shown.
  const {
    data: rows,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.PASSENGERS, flightId],
    queryFn: () => dcsPassengerService.all(flightId),
  })
  // list order without the selected passenger pinned on top — what Alt+↑/↓ walks through
  const ordered = useMemo(() => {
    const page = dcsPassengerService.paginate(rows ?? [], params)
    return { ...page, items: clusterGroups(page.items) }
  }, [rows, params])
  const data = useMemo(() => {
    const { items, ...page } = ordered
    // the selected passenger always sits on the first row (even when a filter hides them),
    // followed by the rest of their check-in group
    const selected = selectedId
      ? rows?.find((r) => r.id === selectedId)
      : undefined
    if (!selected) return { ...page, items }
    const mates = selected.group_id
      ? (rows ?? []).filter(
          (r) => r.group_id === selected.group_id && r.id !== selected.id
        )
      : []
    const pinned = new Set([selected.id, ...mates.map((r) => r.id)])
    return {
      ...page,
      items: [selected, ...mates, ...items.filter((r) => !pinned.has(r.id))],
    }
  }, [ordered, rows, selectedId])

  const step = (by: 1 | -1) => {
    const list = ordered.items
    if (!list.length) return false
    const index = list.findIndex((r) => r.id === selectedId)
    // nobody selected (or hidden by the filter): Alt+↓ takes the first match, Alt+↑ the last
    const next =
      index < 0
        ? by === 1
          ? list[0]
          : list[list.length - 1]
        : list[index + by]
    if (next) onSelect(next)
  }
  useCommand('nextPax', () => step(1))
  useCommand('prevPax', () => step(-1))

  const colors = useMemo(
    () => groupColors((rows ?? []).map((r) => r.group_id)),
    [rows]
  )
  const [logOf, setLogOf] = useState<DcsPassenger | null>(null)
  const columns = useMemo(
    () => createPassengerColumns({ selectedId, colors, onShowLog: setLogOf }),
    [selectedId, colors]
  )

  return (
    <>
      <BaseTable<DcsPassenger>
        data={data?.items ?? []}
        total={data?.total}
        columns={columns}
        search={search}
        navigate={navigate}
        tableId={TABLE_CONFIG.PASSENGERS_ID}
        isLoading={isLoading}
        scrollable
        enableRowSelection
        renderAfterTable={(table) => {
          const ticked = table.getFilteredSelectedRowModel().rows
          const groupTicked = () =>
            group.mutate(
              { flightId, segmentIds: ticked.map((r) => r.original.id) },
              { onSuccess: () => table.resetRowSelection() }
            )
          return (
            <>
              <GroupShortcut
                run={() => {
                  if (group.isPending) return
                  if (ticked.length < 2) {
                    toast.info('Tick two or more passengers to group them.', {
                      id: 'shortcut',
                    })
                    return
                  }
                  groupTicked()
                }}
              />
              <DataTableBulkActions table={table} entityName='passenger'>
                <Button
                  size='sm'
                  className='h-7 gap-1.5'
                  disabled={group.isPending || ticked.length < 2}
                  onClick={groupTicked}
                  title={`${MOD}+G`}
                >
                  <Users className='size-3.5' />
                  Group (shared baggage)
                </Button>
              </DataTableBulkActions>
            </>
          )
        }}
        hideAction
        onRowClick={onSelect}
        rowClassName={(pax) =>
          pax.id === selectedId
            ? // pinned first row, stays under the header while the list scrolls
              '[&>td]:sticky [&>td]:top-8 [&>td]:z-[5] [&>td]:!bg-[color-mix(in_oklab,var(--color-cyan-400)_18%,var(--background))] [&>td]:border-b [&>td]:border-cyan-400/40 [&>td:first-child]:shadow-[inset_4px_0_0_var(--brand)]'
            : pax.group_id
              ? colors.get(pax.group_id)?.row
              : undefined
        }
        tableConfig={{
          pagination: {
            defaultPage: TABLE_CONFIG.DEFAULT_PAGE,
            defaultPageSize: TABLE_CONFIG.DEFAULT_PAGE_SIZE,
          },
          globalFilter: { enabled: false },
          columnFilters: [
            { columnId: 'query', searchKey: 'query', type: 'string' },
            { columnId: 'status', searchKey: 'status', type: 'array' },
            { columnId: 'cabin', searchKey: 'cabin', type: 'array' },
          ],
        }}
        toolbar={{
          searchPlaceholder: TABLE_CONFIG.PASSENGER_SEARCH_PLACEHOLDER,
          searchKey: TABLE_CONFIG.SEARCH_KEY,
          filters: [
            {
              columnId: 'status',
              title: 'Status',
              options: SEGMENT_STATUS_OPTIONS,
            },
            { columnId: 'cabin', title: 'Cabin', options: CABIN_OPTIONS },
          ],
          exportFileName: TABLE_CONFIG.PASSENGERS_EXPORT,
        }}
        onRefresh={refetch}
      />
      <PassengerLogDialog
        passenger={
          logOf && {
            passenger_id: logOf.passenger_id,
            name: passengerName(logOf),
          }
        }
        onClose={() => setLogOf(null)}
      />
    </>
  )
}

/** Ctrl+G (legacy group modal): groups the ticked rows — lives inside the table to see its selection */
function GroupShortcut({ run }: { run: () => void }) {
  useCommand('group', run)
  return null
}
