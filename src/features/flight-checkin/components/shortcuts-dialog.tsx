import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MOD, SHORTCUTS } from '../shortcuts'

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className='bg-muted inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 font-mono text-[11px] font-semibold'>
      {children}
    </kbd>
  )
}

/** Keyboard chip in the flight bar — the counter shortcuts */
export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Same keys as the old DCS; they work while typing in a field ({MOD}+V still pastes there). On
            the seat map: click a seat, <b>Enter</b> checks in and prints, <b>Esc</b> drops the pick.
          </DialogDescription>
        </DialogHeader>
        <ul className='divide-border/60 divide-y'>
          {SHORTCUTS.map((s) => (
            <li key={s.id} className='flex items-center justify-between gap-4 py-2 text-sm'>
              <span>{s.label}</span>
              <span className='flex shrink-0 items-center gap-1'>
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
