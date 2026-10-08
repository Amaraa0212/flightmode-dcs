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
}

export const DEFAULT_PRINTERS: PrinterSettings = {
  boardingPass: 'Printer POS-80',
  bagTag: 'PrinterBagTag',
  bagTagFallback: 'BTP',
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
  boardingPass: { size: { width: 80, height: 215 }, units: 'mm', scaleContent: true, fitToPage: true },
  bagTag: { size: { width: 51, height: 511 }, units: 'mm', copies: 1, scaleContent: true, background: true, fitToPage: true },
} as const

/** Prints complete HTML documents, one job each, on the counter printer of that kind. */
export async function qzPrintHtml(kind: 'boardingPass' | 'bagTag', documents: string[]) {
  await connectQz()
  const printers = usePrinterSettings.getState()
  const printer = await findPrinter(
    kind === 'boardingPass' ? [printers.boardingPass] : [printers.bagTag, printers.bagTagFallback]
  )
  const config = qz.configs.create(printer, PAGE[kind])
  for (const html of documents) {
    await qz.print(config, [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }])
  }
  return printer
}

export function errorText(error: unknown) {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'QZ Tray is not available'
}
