import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { dcsBaggageService } from '@/services'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { useFilterParams } from '@/hooks/use-filter-params'
import { Button } from '@/components/ui/button'
import { BaseTable } from '@/components/data-table'
import { type BaggageRow, createBaggageColumns, toBaggageRows } from './baggage-columns'
import { BaggageDeleteDialog, CrewBaggageDialog } from './baggage-dialogs'
import { BAGGAGE_TYPE_OPTIONS, QUERY_KEYS, TABLE_CONFIG } from './constants'

type BaggageTabProps = {
  flightId: number
  search: Record<string, unknown>
  navigate: NavigateFn
  canEdit: boolean
  /** a passenger bag clicked: open its owner (crew / cargo bags have no segment) */
  onSelectOwner: (segmentId: number) => void
}

export function BaggageTab({ flightId, search, navigate, canEdit, onSelectOwner }: BaggageTabProps) {
  const [crewOpen, setCrewOpen] = useState(false)
  const columns = useMemo(() => createBaggageColumns(), [])

  const { params: filterParams } = useFilterParams(search, {
    defaultMonths: 0,
    defaultPageSize: TABLE_CONFIG.DEFAULT_PAGE_SIZE,
    searchKey: TABLE_CONFIG.SEARCH_KEY,
  })
  const params = useMemo(
    () => ({ ...filterParams, current: 1, pageSize: TABLE_CONFIG.ALL_ROWS }),
    [filterParams]
  )

  const { data, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEYS.BAGGAGE, flightId, params],
    queryFn: async () => {
      const res = await dcsBaggageService.list(flightId, params)
      return { items: res.body?.items ?? [], total: res.body?.total ?? 0 }
    },
  })
  const rows = useMemo(() => toBaggageRows(data?.items ?? []), [data])

  return (
    <>
      <BaseTable<BaggageRow>
        data={rows}
        total={rows.length}
        rowKey='row_key'
        columns={columns}
        search={search}
        navigate={navigate}
        tableId={TABLE_CONFIG.BAGGAGE_ID}
        isLoading={isLoading}
        scrollable
        enableRowSelection={false}
        DeleteComponent={canEdit ? BaggageDeleteDialog : undefined}
        hideAction={!canEdit}
        onRowClick={(bag) => bag.segment_id && onSelectOwner(bag.segment_id)}
        rowClassName={(bag) => (bag.segment_id ? 'cursor-pointer' : 'cursor-default')}
        tableConfig={{
          pagination: {
            defaultPage: TABLE_CONFIG.DEFAULT_PAGE,
            defaultPageSize: TABLE_CONFIG.DEFAULT_PAGE_SIZE,
          },
          globalFilter: { enabled: false },
          columnFilters: [
            { columnId: 'query', searchKey: 'query', type: 'string' },
            { columnId: 'type', searchKey: 'type', type: 'array' },
          ],
        }}
        toolbar={{
          searchPlaceholder: TABLE_CONFIG.BAGGAGE_SEARCH_PLACEHOLDER,
          searchKey: TABLE_CONFIG.SEARCH_KEY,
          filters: [{ columnId: 'type', title: 'Type', options: BAGGAGE_TYPE_OPTIONS }],
          exportFileName: TABLE_CONFIG.BAGGAGE_EXPORT,
          extra: canEdit ? (
            <Button size='sm' className='h-8 gap-2' onClick={() => setCrewOpen(true)}>
              <Plus className='size-4' />
              Crew baggage
            </Button>
          ) : null,
        }}
        onRefresh={refetch}
      />
      <CrewBaggageDialog open={crewOpen} onClose={() => setCrewOpen(false)} flightId={flightId} />
    </>
  )
}
