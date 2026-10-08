/*
| Check-in groups (shared baggage) get a colour on the passenger list so members are easy to spot.
| Colours follow the order groups appear on the flight, so two groups never share one until there
| are more than 8. Cyan is left out — it marks the selected passenger.
*/
const PALETTE = [
  { row: '[&>td]:!bg-violet-500/10 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-violet-500)]', chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  { row: '[&>td]:!bg-emerald-500/10 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-emerald-500)]', chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  { row: '[&>td]:!bg-amber-500/10 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-amber-500)]', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  { row: '[&>td]:!bg-rose-500/10 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-rose-500)]', chip: 'bg-rose-500/15 text-rose-600 dark:text-rose-300' },
  { row: '[&>td]:!bg-sky-500/10 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-sky-500)]', chip: 'bg-sky-500/15 text-sky-600 dark:text-sky-300' },
  { row: '[&>td]:!bg-fuchsia-500/10 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-fuchsia-500)]', chip: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300' },
  { row: '[&>td]:!bg-lime-500/10 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-lime-500)]', chip: 'bg-lime-500/15 text-lime-700 dark:text-lime-300' },
  { row: '[&>td]:!bg-orange-500/10 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-orange-500)]', chip: 'bg-orange-500/15 text-orange-600 dark:text-orange-300' },
] as const

export type GroupColor = (typeof PALETTE)[number]

/** group id → colour, for every group on the flight */
export function groupColors(groupIds: (number | null)[]): Map<number, GroupColor> {
  const ids = [...new Set(groupIds.filter((id): id is number => id !== null))].sort((a, b) => a - b)
  return new Map(ids.map((id, i) => [id, PALETTE[i % PALETTE.length]]))
}
