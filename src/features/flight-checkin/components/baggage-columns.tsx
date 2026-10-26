import { type Column, type ColumnDef, type Row } from '@tanstack/react-table'
import type { CheckedBaggage } from '@/services'
import { formatDate } from '@/lib/utils'
import { DataTableColumnHeader } from '@/components/data-table'

/** one row per piece: a 2 pc registration lists as 2 rows, each with its own tag */
export type BaggageRow = CheckedBaggage & {
  row_key: string
  tag: CheckedBaggage['tags'][number] | null
  /** 1-based piece within the registration; weight / excess are only on piece 1 */
  piece_no: number
}

export const toBaggageRows = (bags: CheckedBaggage[]): BaggageRow[] =>
  bags.flatMap((bag) =>
    Array.from({ length: Math.max(1, bag.pieces) }, (_, i) => ({
      ...bag,
      row_key: `${bag.id}-${i}`,
      tag: bag.tags[i] ?? null,
      piece_no: i + 1,
    }))
  )

export const createBaggageColumns = (): ColumnDef<BaggageRow>[] => [
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
    header: ({ column }: { column: Column<BaggageRow> }) => (
      <DataTableColumnHeader column={column} title='Bag tag' />
    ),
    cell: ({ row }: { row: Row<BaggageRow> }) => (
      <span className='text-brand font-mono text-xs font-semibold'>
        {row.original.tag?.tag_number ?? '-'}
      </span>
    ),
    meta: { exportPaths: ['tag.tag_number'] },
    enableSorting: false,
  },
  {
    accessorKey: 'owner',
    header: ({ column }: { column: Column<BaggageRow> }) => (
      <DataTableColumnHeader column={column} title='Owner' />
    ),
    cell: ({ row }: { row: Row<BaggageRow> }) => (
      <span className='font-medium text-nowrap'>{row.original.owner}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'pnr',
    header: ({ column }: { column: Column<BaggageRow> }) => (
      <DataTableColumnHeader column={column} title='PNR' />
    ),
    cell: ({ row }: { row: Row<BaggageRow> }) => (
      <span className='font-mono text-xs'>{row.original.pnr ?? '-'}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'type',
    header: ({ column }: { column: Column<BaggageRow> }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }: { row: Row<BaggageRow> }) => (
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
    header: ({ column }: { column: Column<BaggageRow> }) => (
      <DataTableColumnHeader column={column} title='Pcs / kg' />
    ),
    // only the total weight is stored, so it shows once, on piece 1 of the registration
    cell: ({ row }: { row: Row<BaggageRow> }) => {
      const { pieces, piece_no, weight_kg } = row.original
      if (pieces <= 1) {
        return <span className='font-mono text-xs'>1 pc / {weight_kg} kg</span>
      }
      return (
        <span className='font-mono text-xs text-nowrap'>
          {piece_no}/{pieces} pc
          {piece_no === 1 && (
            <span className='text-muted-foreground'> • {weight_kg} kg total</span>
          )}
        </span>
      )
    },
    enableSorting: false,
  },
  {
    id: 'excess',
    header: ({ column }: { column: Column<BaggageRow> }) => (
      <DataTableColumnHeader column={column} title='Excess' />
    ),
    cell: ({ row }: { row: Row<BaggageRow> }) =>
      row.original.excess_kg && row.original.piece_no === 1 ? (
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
    header: ({ column }: { column: Column<BaggageRow> }) => (
      <DataTableColumnHeader column={column} title='Accepted' />
    ),
    cell: ({ row }: { row: Row<BaggageRow> }) => (
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
