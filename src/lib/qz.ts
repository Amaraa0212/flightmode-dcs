import qz from 'qz-tray'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { client } from '@/services/api/shared/client'

/*
| QZ Tray — prints straight to the counter's thermal printers without a print dialog (legacy DCS).
| QZ Tray runs on the counter PC (ws://localhost:8182). Its requests are signed by the API
| (GET /dcs/qz/certificate, POST /dcs/qz/sign) so the private key never reaches the browser.
*/

export type QzStatus = 'idle' | 'connecting' | 'connected' | 'offline'

export type PrinterSettings = {
  /** ATB / receipt printer for boarding passes (legacy "Printer POS-80") */
  boardingPass: string
  /** BTP bag tag printer, tried in order (legacy "PrinterBagTag", then "BTP") */
  bagTag: string
  bagTagFallback: string
  /** paper tray (QZ `bin`) of the bag tag printer, '' = the printer's default feeder */
  bagTagFeeder: string
  /**
   * Boarding pass as raw ESC/POS straight to the printer (no Windows driver): for a POS-80 that pauses midway
   * while the driver feeds it the page band by band
   */
  boardingPassRaw: boolean
}

export const DEFAULT_PRINTERS: PrinterSettings = {
  boardingPass: 'Printer POS-80',
  bagTag: 'PrinterBagTag',
  bagTagFallback: 'BTP',
  bagTagFeeder: '',
  boardingPassRaw: false,
}

/** Printer names are per counter PC → kept in this browser only */
export const usePrinterSettings = create<PrinterSettings & { set: (value: Partial<PrinterSettings>) => void }>()(
  persist((set) => ({ ...DEFAULT_PRINTERS, set: (value) => set(value) }), { name: 'dcs_printers' })
)

export const useQzStatus = create<{ status: QzStatus; error: string | null }>(() => ({
  status: 'idle',
  error: null,
}))

let securityReady = false

function setupSecurity() {
  if (securityReady) return
  securityReady = true

  qz.security.setCertificatePromise((resolve) => {
    client
      .get<{ data: { certificate: string | null } }>('/dcs/qz/certificate')
      .then((res) => resolve(res.data.data.certificate ?? undefined))
      // no certificate → QZ Tray asks the agent to allow the site
      .catch(() => resolve())
  })
  qz.security.setSignatureAlgorithm('SHA512')
  qz.security.setSignaturePromise((toSign) => (resolve) => {
    client
      .post<{ data: { signature: string } }>('/dcs/qz/sign', { request: toSign })
      .then((res) => resolve(res.data.data.signature))
      .catch(() => resolve())
  })
  qz.websocket.setClosedCallbacks(() => useQzStatus.setState({ status: 'offline' }))
}

let connecting: Promise<void> | null = null

/** qz.websocket.connect can stay pending (e.g. while the browser asks for local-network access) — never let a print wait on it */
const CONNECT_TIMEOUT_MS = 6000

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('QZ Tray did not answer')), ms)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}

/** Connects once; later calls reuse the open socket. Rejects when QZ Tray is not running. */
export function connectQz(): Promise<void> {
  setupSecurity()
  if (qz.websocket.isActive()) {
    useQzStatus.setState({ status: 'connected', error: null })
    return Promise.resolve()
  }
  if (!connecting) {
    useQzStatus.setState({ status: 'connecting' })
    connecting = withTimeout(qz.websocket.connect({ retries: 1, delay: 1 }), CONNECT_TIMEOUT_MS)
      .then(() => useQzStatus.setState({ status: 'connected', error: null }))
      .catch((error: unknown) => {
        useQzStatus.setState({ status: 'offline', error: errorText(error) })
        throw error
      })
      .finally(() => {
        connecting = null
      })
  }
  return connecting
}

/** All printers QZ Tray can see (for the printer settings) */
export async function listPrinters(): Promise<string[]> {
  await connectQz()
  const found = await qz.printers.find()
  return Array.isArray(found) ? found : [found]
}

/** First printer from `names` that exists on this PC */
async function findPrinter(names: string[]): Promise<string> {
  for (const name of names.filter(Boolean)) {
    try {
      const found = await qz.printers.find(name)
      return Array.isArray(found) ? found[0] : found
    } catch {
      // not installed — try the next one
    }
  }
  throw new Error(`Printer not found: ${names.filter(Boolean).join(' / ')}`)
}

/** Page setup of the legacy DCS print jobs (mm) */
const PAGE = {
  // black-white: a colour raster of the 80 × 215 mm page is several times the data, the POS-80 ran out of buffer
  // mid-print and paused until the rest arrived (its self-test, stored in the printer, did not)
  boardingPass: {
    size: { width: 80, height: 215 },
    units: 'mm',
    scaleContent: true,
    fitToPage: true,
    interpolation: 'nearest-neighbor',
    colorType: 'blackwhite',
  },
  // drawn at the printer's own density, without smoothing, in pure black: the thermal head has no grey, and
  // smoothed edges of the rotated parts (180° / 90° barcodes and text) printed faint
  bagTag: {
    size: { width: 51, height: 511 },
    units: 'mm',
    copies: 1,
    scaleContent: true,
    background: true,
    fitToPage: true,
    density: 'best',
    interpolation: 'nearest-neighbor',
    colorType: 'blackwhite',
  },
} as const

/** 80 mm printer head: 72 mm printable at 203 dpi = 576 dots */
const ESCPOS_WIDTH_DOTS = 576
/** the pass is laid out 80 mm wide (≈302 CSS px); zoomed so it fills the 576-dot head */
const ESCPOS_ZOOM = 1.9

/**
 * One boarding pass as raw ESC/POS: QZ renders the same HTML at the head's width, sends it as a raster image
 * straight to the printer (no Windows driver banding — the pass prints in one go), then feeds and cuts.
 */
function escposBoardingPass(html: string) {
  const zoomed = html.replace('<head>', `<head><style>html { zoom: ${ESCPOS_ZOOM}; }</style>`)
  const command = (data: string) => ({ type: 'raw' as const, format: 'command' as const, flavor: 'plain' as const, data })
  return [
    command('\x1B\x40'), // ESC @ — reset
    {
      type: 'raw' as const,
      format: 'html' as const,
      flavor: 'plain' as const,
      data: zoomed,
      options: { language: 'ESCPOS', dotDensity: 'double', pageWidth: ESCPOS_WIDTH_DOTS },
    },
    command('\x0A\x0A\x0A\x0A'), // feed past the cutter
    command('\x1D\x56\x41\x00'), // GS V A 0 — cut
  ]
}

/** Prints complete HTML documents, one job each, on the counter printer of that kind. */
export async function qzPrintHtml(kind: 'boardingPass' | 'bagTag', documents: string[]) {
  await connectQz()
  const printers = usePrinterSettings.getState()
  const printer = await findPrinter(
    kind === 'boardingPass' ? [printers.boardingPass] : [printers.bagTag, printers.bagTagFallback]
  )
  if (kind === 'boardingPass' && printers.boardingPassRaw) {
    const raw = qz.configs.create(printer)
    for (const html of documents) await qz.print(raw, escposBoardingPass(html))
    return printer
  }
  const feeder = kind === 'bagTag' ? printers.bagTagFeeder?.trim() : ''
  const config = qz.configs.create(printer, feeder ? { ...PAGE[kind], bin: feeder } : PAGE[kind])
  for (const html of documents) {
    await qz.print(config, [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }])
  }
  return printer
}

export function errorText(error: unknown) {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'QZ Tray is not available'
}
