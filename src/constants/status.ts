export type Tone = 'cyan' | 'green' | 'amber' | 'red' | 'indigo' | 'slate'

export type StatusMeta = { label: string; tone: Tone }

function toOptions(map: Record<string, StatusMeta>) {
  return Object.entries(map).map(([value, meta]) => ({ label: meta.label, value }))
}

export const FLIGHT_STATUS: Record<string, StatusMeta> = {
  scheduled: { label: 'Scheduled', tone: 'slate' },
  checkin_open: { label: 'Check-in open', tone: 'amber' },
  checkin_closed: { label: 'Check-in closed', tone: 'indigo' },
  gate_closed: { label: 'Boarding', tone: 'green' },
  departed: { label: 'Departed', tone: 'cyan' },
  cancelled: { label: 'Cancelled', tone: 'red' },
}

export const SEGMENT_STATUS: Record<string, StatusMeta> = {
  booked: { label: 'Not checked', tone: 'slate' },
  waitlisted: { label: 'Waitlist', tone: 'amber' },
  checked_in: { label: 'Checked in', tone: 'green' },
  boarded: { label: 'Boarded', tone: 'cyan' },
  flown: { label: 'Flown', tone: 'indigo' },
  cancelled: { label: 'Cancelled', tone: 'red' },
}

export const PASSENGER_TYPE: Record<string, StatusMeta> = {
  ADT: { label: 'ADT', tone: 'slate' },
  CHD: { label: 'CHD', tone: 'amber' },
  INF: { label: 'INF', tone: 'indigo' },
}

export const CABIN_CLASS: Record<string, string> = {
  F: 'First',
  C: 'Business',
  W: 'Premium',
  Y: 'Econ',
}

export const SSR_LABELS: Record<string, string> = {
  WCHR: 'Wheelchair',
  VGML: 'Vegetarian meal',
  CHML: 'Child meal',
  UMNR: 'Unaccompanied minor',
  MEDA: 'Medical case',
  DEAF: 'Deaf passenger',
  PETC: 'Pet in cabin',
}

export const FLIGHT_STATUS_OPTIONS = toOptions(FLIGHT_STATUS)
export const SEGMENT_STATUS_OPTIONS = toOptions(SEGMENT_STATUS).filter(
  (o) => o.value !== 'flown'
)
export const CABIN_OPTIONS = [
  { label: 'Business (C)', value: 'C' },
  { label: 'Economy (Y)', value: 'Y' },
]
