import { type Column, type ColumnDef, type Row } from '@tanstack/react-table'
import type { CheckedBaggage } from '@/services'
import { formatDate } from '@/lib/utils'
import { DataTableColumnHeader } from '@/components/data-table'

export const createBaggageColumns = (): ColumnDef<CheckedBaggage>[] => [
  {
    id: 'query',
    accessorKey: 'query',
    header: () => null,
    cell: () => null,
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: 'tags',
    header: ({ column }: { column: Column<CheckedBaggage> }) => (
      <DataTableColumnHeader column={column} title='Bag tags' />
    ),
    cell: ({ row }: { row: Row<CheckedBaggage> }) => (
      <div className='flex flex-col gap-0.5'>
        {row.original.tags.map((tag) => (
          <span key={tag.id} className='text-brand font-mono text-xs font-semibold'>
            {tag.tag_number}
          </span>
        ))}
      </div>
    ),
    meta: { exportPaths: ['tags.0.tag_number'] },
    enableSorting: false,
  },
  {
    accessorKey: 'owner',
    header: ({ column }: { column: Column<CheckedBaggage> }) => (
      <DataTableColumnHeader column={column} title='Owner' />
    ),
    cell: ({ row }: { row: Row<CheckedBaggage> }) => (
      <span className='font-medium text-nowrap'>{row.original.owner}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'pnr',
    header: ({ column }: { column: Column<CheckedBaggage> }) => (
      <DataTableColumnHeader column={column} title='PNR' />
    ),
    cell: ({ row }: { row: Row<CheckedBaggage> }) => (
      <span className='font-mono text-xs'>{row.original.pnr ?? '-'}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'type',
    header: ({ column }: { column: Column<CheckedBaggage> }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }: { row: Row<CheckedBaggage> }) => (
      <span
        className={
          row.original.type === 'crew'
            ? 'rounded border border-indigo-400/40 bg-indigo-500/10 px-1.5 text-[10px] font-bold text-indigo-500 uppercase dark:text-indigo-300'
            : 'text-muted-foreground text-xs capitalize'
        }
      >
        {row.original.type}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'weight',
    header: ({ column }: { column: Column<CheckedBaggage> }) => (
      <DataTableColumnHeader column={column} title='Pcs / kg' />
    ),
    cell: ({ row }: { row: Row<CheckedBaggage> }) => (
      <span className='font-mono text-xs'>
        {row.original.pieces} pc / {row.original.weight_kg} kg
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'excess',
    header: ({ column }: { column: Column<CheckedBaggage> }) => (
      <DataTableColumnHeader column={column} title='Excess' />
    ),
    cell: ({ row }: { row: Row<CheckedBaggage> }) =>
      row.original.excess_kg ? (
        <span className='font-mono text-xs text-amber-600 dark:text-amber-300'>
          {row.original.excess_kg} kg • {row.original.excess_price.toLocaleString()} ₮
        </span>
      ) : (
        <span className='text-muted-foreground text-xs'>-</span>
      ),
    enableSorting: false,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }: { column: Column<CheckedBaggage> }) => (
      <DataTableColumnHeader column={column} title='Accepted' />
    ),
    cell: ({ row }: { row: Row<CheckedBaggage> }) => (
      <div className='text-xs text-nowrap'>
        {formatDate(row.original.created_at, 'HH:mm')}
        {row.original.rule && (
          <span className='text-muted-foreground'> • {row.original.rule}</span>
        )}
      </div>
    ),
    enableSorting: false,
  },
]
