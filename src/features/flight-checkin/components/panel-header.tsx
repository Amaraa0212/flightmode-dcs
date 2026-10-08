import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePanelDrag } from './workspace-layout'

type PanelHeaderProps = {
  title: string
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * Хуучин DCS-ийн багана бүрийн гарчиг (General Info, Baggages Info, ...).
 * Inside the workspace the header is the drag handle that swaps columns.
 */
export function PanelHeader({ title, subtitle, action, className }: PanelHeaderProps) {
  const drag = usePanelDrag()
  return (
    <div
      {...drag?.handleProps}
      title={drag ? 'Drag onto another column to swap' : undefined}
      className={cn(
        'flex min-h-12 items-center justify-between gap-2 border-b px-4 py-2',
        drag && 'cursor-grab select-none active:cursor-grabbing',
        className
      )}
    >
      <div className='flex min-w-0 items-center gap-2'>
        {drag ? (
          <GripVertical className='text-muted-foreground -ms-2 size-3.5 shrink-0' />
        ) : null}
        <span className='size-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_6px] shadow-cyan-400' />
        <p className='truncate text-xs font-bold tracking-[0.14em] uppercase'>{title}</p>
        {subtitle && <span className='text-muted-foreground truncate text-xs'>{subtitle}</span>}
      </div>
      {action}
    </div>
  )
}
