import { createContext, Fragment, useContext, useRef, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PANEL_LABEL,
  PANEL_MIN_WIDTH,
  useWorkspaceLayout,
  type PanelId,
} from '../layout-store'

const DRAG_TYPE = 'application/x-dcs-panel'

type PanelDrag = {
  /** Spread on the panel header: drag it onto another column to swap the two */
  handleProps: React.HTMLAttributes<HTMLElement> & { draggable: boolean }
}

const PanelDragContext = createContext<PanelDrag | null>(null)

/** Used by PanelHeader — null outside the workspace (e.g. dialogs) */
export const usePanelDrag = () => useContext(PanelDragContext)

/**
 * The 4 counter columns in the saved order and widths.
 * - drag the divider between two columns to resize them
 * - drag a column header onto another column to swap them
 * - double-click a divider to give the two columns equal width
 * - a seat map rotated sideways (90° / 270°) docks under the other columns, full width
 */
export function WorkspaceLayout({
  panels,
}: {
  panels: Record<PanelId, React.ReactNode>
}) {
  const { order, weights, swap, seatRotation } = useWorkspaceLayout()
  // a sideways plane does not fit a column: it docks under the other three, full width
  const docked = seatRotation === 90 || seatRotation === 270
  const columns = docked ? order.filter((id) => id !== 'seats') : order
  const cells = useRef<Partial<Record<PanelId, HTMLDivElement | null>>>({})
  const [dragging, setDragging] = useState<PanelId | null>(null)
  const [over, setOver] = useState<PanelId | null>(null)

  const handleProps = (id: PanelId): PanelDrag['handleProps'] => ({
    draggable: true,
    onDragStart: (event) => {
      event.dataTransfer.setData(DRAG_TYPE, id)
      event.dataTransfer.effectAllowed = 'move'
      const cell = cells.current[id]
      if (cell) event.dataTransfer.setDragImage(cell, 24, 18)
      setDragging(id)
    },
    onDragEnd: () => {
      setDragging(null)
      setOver(null)
    },
  })

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3'>
      <div className='flex min-h-0 flex-1'>
        {columns.map((id, index) => (
          <Fragment key={id}>
            {index > 0 && (
              <ResizeHandle
                left={columns[index - 1]}
                right={id}
                cells={cells}
              />
            )}
            <div
              ref={(el) => {
                cells.current[id] = el
              }}
              data-panel={id}
              style={{
                flex: `${weights[id]} 1 0px`,
                minWidth: PANEL_MIN_WIDTH[id],
              }}
              className={cn(
                'relative flex min-h-0 min-w-0 flex-col transition-opacity [&>section]:min-h-0 [&>section]:flex-1',
                dragging === id && 'opacity-40'
              )}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes(DRAG_TYPE)) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                if (over !== id) setOver(id)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setOver(null)
              }}
              onDrop={(event) => {
                const from = event.dataTransfer.getData(DRAG_TYPE) as PanelId
                event.preventDefault()
                setOver(null)
                setDragging(null)
                if (from) swap(from, id)
              }}
            >
              <PanelDragContext.Provider
                value={{ handleProps: handleProps(id) }}
              >
                {panels[id]}
              </PanelDragContext.Provider>

              {dragging && dragging !== id && over === id && (
                <div className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-cyan-400 bg-cyan-400/10 backdrop-blur-[1px]'>
                  <span className='flex items-center gap-2 rounded-lg bg-[#04121c]/80 px-3 py-1.5 text-xs font-semibold text-cyan-300'>
                    <ArrowLeftRight className='size-4' />
                    Swap {PANEL_LABEL[dragging]} ↔ {PANEL_LABEL[id]}
                  </span>
                </div>
              )}
            </div>
          </Fragment>
        ))}
      </div>

      {docked && (
        // height follows the plane (capped), not draggable — rotate back to 0°/180° to make it a column again
        <div className='flex max-h-[45%] shrink-0 flex-col [&>section]:min-h-0 [&>section]:flex-1'>
          <PanelDragContext.Provider value={null}>
            {panels.seats}
          </PanelDragContext.Provider>
        </div>
      )}
    </div>
  )
}

/** Divider between two neighbour columns — moves width from one to the other */
function ResizeHandle({
  left,
  right,
  cells,
}: {
  left: PanelId
  right: PanelId
  cells: React.RefObject<Partial<Record<PanelId, HTMLDivElement | null>>>
}) {
  const { weights, setWeights } = useWorkspaceLayout()
  const [active, setActive] = useState(false)

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const leftEl = cells.current[left]
    const rightEl = cells.current[right]
    if (!leftEl || !rightEl) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    const startX = event.clientX
    const leftPx = leftEl.getBoundingClientRect().width
    const rightPx = rightEl.getBoundingClientRect().width
    const totalPx = leftPx + rightPx
    // the two weights keep their sum; only the split between them changes
    const totalWeight = weights[left] + weights[right]
    setActive(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const move = (e: PointerEvent) => {
      const next = Math.min(
        Math.max(leftPx + e.clientX - startX, PANEL_MIN_WIDTH[left]),
        totalPx - PANEL_MIN_WIDTH[right]
      )
      setWeights({
        [left]: (totalWeight * next) / totalPx,
        [right]: (totalWeight * (totalPx - next)) / totalPx,
      })
    }
    const up = () => {
      setActive(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      role='separator'
      aria-orientation='vertical'
      aria-label={`Resize ${PANEL_LABEL[left]} / ${PANEL_LABEL[right]}`}
      title='Drag to resize · double-click to split evenly'
      onPointerDown={onPointerDown}
      onDoubleClick={() => {
        const half = (weights[left] + weights[right]) / 2
        setWeights({ [left]: half, [right]: half })
      }}
      className='group relative z-10 flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center'
    >
      <span
        className={cn(
          'h-full w-px rounded-full transition-colors',
          active
            ? 'w-0.5 bg-cyan-400'
            : 'bg-transparent group-hover:bg-cyan-400/60'
        )}
      />
      <span
        className={cn(
          'absolute h-8 w-1 rounded-full transition-colors',
          active ? 'bg-cyan-400' : 'bg-border group-hover:bg-cyan-400/80'
        )}
      />
    </div>
  )
}
