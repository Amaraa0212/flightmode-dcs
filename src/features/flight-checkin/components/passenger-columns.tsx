import { type Column, type ColumnDef, type Row } from '@tanstack/react-table'
import { Globe, ListOrdered, Monitor, Users } from 'lucide-react'
import type { DcsPassenger } from '@/services'
import { cn } from '@/lib/utils'
import type { GroupColor } from '@/lib/group-colors'
import { passengerName } from '@/lib/flight'
import { PASSENGER_TYPE, SEGMENT_STATUS } from '@/constants/status'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { StatusChip } from '@/components/status-chip'

type CreateColumnsOptions = {
  selectedId?: number
  colors?: Map<number, GroupColor>
  /** legacy log button at the end of every row (infants too) */
  onShowLog?: (passenger: DcsPassenger) => void
}

export const createPassengerColumns = ({
  selectedId,
  colors,
  onShowLog,
}: CreateColumnsOptions): ColumnDef<DcsPassenger>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select passenger for a group'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'query',
    accessorKey: 'query',
    header: () => null,
    cell: () => null,
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: 'seat_number',
    header: ({ column }: { column: Column<DcsPassenger> }) => (
      <DataTableColumnHeader column={column} title='Seat' />
    ),
    cell: ({ row }: { row: Row<DcsPassenger> }) => (
      <span
        className={cn(
          'inline-flex min-w-10 justify-center rounded-md border px-1.5 py-0.5 font-mono text-xs font-bold',
          row.original.seat_number
            ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300'
            : 'text-muted-foreground border-dashed'
        )}
      >
        {row.original.seat_number ?? (row.original.type === 'INF' ? 'INF' : '—')}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'name',
    header: ({ column }: { column: Column<DcsPassenger> }) => (
      <DataTableColumnHeader column={column} title='Passenger' />
    ),
    cell: ({ row }: { row: Row<DcsPassenger> }) => {
      const pax = row.original
      return (
        <div className={cn('flex items-center gap-2', pax.type === 'INF' && 'ps-3')}>
          {pax.type !== 'ADT' && (
            <StatusChip value={pax.type} map={PASSENGER_TYPE} dot={false} className='px-1.5' />
          )}
          <span
            className={cn(
              'font-medium text-nowrap',
              selectedId === pax.id && 'text-brand'
            )}
          >
            {passengerName(pax)}
          </span>
          {pax.group_id && (
            <span
              className={cn(
                'flex items-center gap-0.5 rounded px-1 text-[10px] font-bold',
                colors?.get(pax.group_id)?.chip ?? 'text-muted-foreground'
              )}
              title={`Check-in group ${colors?.get(pax.group_id)?.number ?? ''} · shared baggage`}
            >
              <Users className='size-3' />
              {colors?.get(pax.group_id)?.number ?? pax.group_id}
            </span>
          )}
          {pax.screening && pax.screening.status !== 'cleared' && (
            <span
              title={pax.screening.bans.map((b) => `${b.ban_type}: ${b.reason}`).join('\n')}
              className={cn(
                'rounded px-1 text-[10px] font-bold uppercase',
                pax.screening.status === 'banned'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
              )}
            >
              {pax.screening.status === 'banned' ? 'BAN' : 'WATCH'}
            </span>
          )}
          {pax.infant && (
            <span className='rounded bg-indigo-500/15 px-1 text-[10px] font-bold text-indigo-500 dark:text-indigo-300'>
              +INF
            </span>
          )}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'pnr',
    header: ({ column }: { column: Column<DcsPassenger> }) => (
      <DataTableColumnHeader column={column} title='PNR' />
    ),
    cell: ({ row }: { row: Row<DcsPassenger> }) => (
      <span className='text-brand font-mono text-xs font-semibold'>
        {row.original.pnr}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'cabin',
    accessorKey: 'cabin_class',
    header: ({ column }: { column: Column<DcsPassenger> }) => (
      <DataTableColumnHeader column={column} title='Cabin' />
    ),
    cell: ({ row }: { row: Row<DcsPassenger> }) => (
      <span className='font-mono text-xs'>
        <b className={row.original.cabin_class === 'C' ? 'text-amber-500' : ''}>
          {row.original.cabin_class}
        </b>
        {row.original.fare_class && (
          <span className='text-muted-foreground'>/{row.original.fare_class}</span>
        )}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'ssr',
    header: ({ column }: { column: Column<DcsPassenger> }) => (
      <DataTableColumnHeader column={column} title='SSR' />
    ),
    cell: ({ row }: { row: Row<DcsPassenger> }) =>
      row.original.ssr_codes.length ? (
        <div className='flex gap-1'>
          {row.original.ssr_codes.map((code) => (
            <span
              key={code}
              className='rounded border border-amber-400/40 bg-amber-400/10 px-1 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-300'
            >
              {code}
            </span>
          ))}
        </div>
      ) : (
        <span className='text-muted-foreground text-xs'>-</span>
      ),
    enableSorting: false,
  },
  {
    accessorKey: 'document_number',
    header: ({ column }: { column: Column<DcsPassenger> }) => (
      <DataTableColumnHeader column={column} title='Doc ID' />
    ),
    cell: ({ row }: { row: Row<DcsPassenger> }) => (
      <span className='font-mono text-xs'>{row.original.document_number}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }: { column: Column<DcsPassenger> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }: { row: Row<DcsPassenger> }) => {
      const channel = row.original.checkin_channel
      return (
        <div className='flex items-center gap-2'>
          <StatusChip value={row.original.status} map={SEGMENT_STATUS} />
          {channel === 'online' && (
            <Globe className='text-muted-foreground size-3.5' aria-label='Online check-in' />
          )}
          {channel === 'dcs' && (
            <Monitor className='text-muted-foreground size-3.5' aria-label='Counter check-in' />
          )}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    id: 'log',
    header: () => <span className='sr-only'>Log</span>,
    cell: ({ row }: { row: Row<DcsPassenger> }) => (
      <button
        type='button'
        title='View logs'
        aria-label={`View logs of ${passengerName(row.original)}`}
        onClick={(e) => {
          e.stopPropagation()
          onShowLog?.(row.original)
        }}
        className='text-muted-foreground hover:text-brand flex size-6 items-center justify-center rounded-md transition'
      >
        <ListOrdered className='size-3.5' />
      </button>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
