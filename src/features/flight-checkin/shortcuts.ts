import { useEffect, useRef } from 'react'

/*
| Counter keyboard commands — the legacy DCS (flightmodev2 dcs/Main.vue) Ctrl/Cmd shortcuts.
| One window listener (useShortcutKeys) maps a key to a command id; the panel that owns the action registers
| its handler with useCommand. A handler returning false means "nothing to do" — the key keeps its browser default.
| Letters are matched by physical key (event.code), so they also work with the Mongolian Cyrillic layout.
*/

export type CommandId =
  | 'search'
  | 'refresh'
  | 'passengerView'
  | 'baggageView'
  | 'boardingPass'
  | 'baggage'
  | 'bagTag'
  | 'checkIn'
  | 'group'
  | 'nextPax'
  | 'prevPax'
  | 'escape'

type Shortcut = {
  id: CommandId
  /** shown in the help dialog */
  keys: string[]
  label: string
  /** a match returns the command argument (bag number for Ctrl+1-9), or false */
  match: (e: KeyboardEvent) => number | boolean
  /** fire again while the key is held */
  repeat?: boolean
  /** keep the browser default while typing in a field (Ctrl+V pastes) */
  notWhileTyping?: boolean
}

export const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? 'Cmd' : 'Ctrl'

const ctrl = (code: string) => (e: KeyboardEvent) =>
  e.code === code && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey
const alt = (key: string) => (e: KeyboardEvent) =>
  e.key === key && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey

export const SHORTCUTS: Shortcut[] = [
  { id: 'search', keys: [MOD, 'S'], label: 'Search passengers', match: ctrl('KeyS') },
  { id: 'refresh', keys: [MOD, 'R'], label: 'Refresh (clears the passenger and the search)', match: ctrl('KeyR') },
  { id: 'passengerView', keys: [MOD, 'E'], label: 'Passenger view', match: ctrl('KeyE') },
  { id: 'baggageView', keys: [MOD, 'D'], label: 'Baggage view', match: ctrl('KeyD') },
  {
    id: 'boardingPass',
    keys: [MOD, 'V'],
    label: 'Print boarding pass',
    match: ctrl('KeyV'),
    notWhileTyping: true,
  },
  { id: 'baggage', keys: [MOD, 'B'], label: 'Baggage input (weight)', match: ctrl('KeyB') },
  {
    id: 'bagTag',
    keys: [MOD, '1-9'],
    label: 'Print bag tag no. 1-9 of the passenger',
    match: (e) => {
      const digit = /^Digit([1-9])$/.exec(e.code)?.[1]
      return !!digit && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && Number(digit)
    },
  },
  { id: 'checkIn', keys: [MOD, 'P'], label: 'Check in & print (picked seat or auto seat)', match: ctrl('KeyP') },
  { id: 'group', keys: [MOD, 'G'], label: 'Group the ticked passengers', match: ctrl('KeyG') },
  { id: 'nextPax', keys: ['Alt', '↓'], label: 'Next passenger in the list', match: alt('ArrowDown'), repeat: true },
  { id: 'prevPax', keys: ['Alt', '↑'], label: 'Previous passenger in the list', match: alt('ArrowUp'), repeat: true },
  {
    id: 'escape',
    keys: ['Esc'],
    label: 'Leave a text field · otherwise close the passenger',
    match: (e) => e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey,
  },
]

type Handler = (arg: number) => boolean | void

const handlers = new Map<CommandId, Handler>()

/** Registers the handler for a command while the component is mounted (always calls the latest closure) */
export function useCommand(id: CommandId, handler: Handler) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    const run: Handler = (arg) => ref.current(arg)
    handlers.set(id, run)
    return () => {
      // a remounted panel may already have registered its own handler
      if (handlers.get(id) === run) handlers.delete(id)
    }
  }, [id])
}

const isTyping = (el: Element | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** Mount once on the counter page */
export function useShortcutKeys() {
  useEffect(() => {
    let blocked = false

    const handle = (event: KeyboardEvent, shortcut: Shortcut, arg: number | true) => {
      if (event.repeat && !shortcut.repeat) return
      const typing = isTyping(document.activeElement)
      if (shortcut.notWhileTyping && typing) return

      // Esc in a text field only leaves it — back to "command mode"
      if (shortcut.id === 'escape' && typing) {
        ;(document.activeElement as HTMLElement).blur()
        return
      }

      const run = handlers.get(shortcut.id)
      if (!run || run(arg === true ? 0 : arg) === false) return
      event.preventDefault()
      event.stopPropagation()
    }

    const find = (event: KeyboardEvent) => {
      for (const shortcut of SHORTCUTS) {
        const arg = shortcut.match(event)
        if (arg !== false) return { shortcut, arg }
      }
      return null
    }

    // capture: Ctrl/Cmd commands win over the browser and the app (Ctrl+B also toggles the sidebar)
    const onCapture = (event: KeyboardEvent) => {
      // read before Radix closes a dialog on the same Esc, so that Esc does not also close the passenger
      blocked = !!document.querySelector('[role="dialog"], [role="alertdialog"]')
      if (blocked || !(event.ctrlKey || event.metaKey)) return
      const hit = find(event)
      if (hit) handle(event, hit.shortcut, hit.arg)
    }

    // bubble: Esc / Alt+arrows, after the seat map has had its own Enter / Esc
    const onBubble = (event: KeyboardEvent) => {
      if (blocked || event.defaultPrevented || event.ctrlKey || event.metaKey) return
      const hit = find(event)
      if (hit) handle(event, hit.shortcut, hit.arg)
    }

    window.addEventListener('keydown', onCapture, true)
    window.addEventListener('keydown', onBubble)
    return () => {
      window.removeEventListener('keydown', onCapture, true)
      window.removeEventListener('keydown', onBubble)
    }
  }, [])
}

/** Focus an element that may render only after a state change (view switch, selection cleared) */
export function focusSoon(find: () => HTMLElement | null | undefined, tries = 20) {
  const el = find()
  if (!el) {
    if (tries > 0) setTimeout(() => focusSoon(find, tries - 1), 25)
    return
  }
  el.focus()
  if (el instanceof HTMLInputElement) el.select()
}
