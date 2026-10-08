/** Minimal typings for the parts of qz-tray (https://qz.io/api) the counter uses. */
declare module 'qz-tray' {
  type Resolver<T> = (resolve: (value?: T) => void, reject: (reason?: unknown) => void) => void

  interface QzConfig {
    reconfigure(options: Record<string, unknown>): void
  }

  interface QzPrintData {
    type: 'pixel' | 'raw'
    format: 'html' | 'image' | 'pdf' | 'command'
    flavor?: 'plain' | 'file' | 'base64'
    data: string
    options?: Record<string, unknown>
  }

  const qz: {
    version: string
    websocket: {
      isActive(): boolean
      connect(options?: { host?: string; retries?: number; delay?: number; usingSecure?: boolean }): Promise<void>
      disconnect(): Promise<void>
      setClosedCallbacks(cb: (event: unknown) => void): void
    }
    security: {
      setCertificatePromise(resolver: Resolver<string>): void
      setSignatureAlgorithm(algorithm: 'SHA1' | 'SHA256' | 'SHA512'): void
      setSignaturePromise(factory: (toSign: string) => Resolver<string>): void
    }
    printers: {
      find(query?: string): Promise<string | string[]>
      getDefault(): Promise<string>
    }
    configs: {
      create(printer: string, options?: Record<string, unknown>): QzConfig
    }
    print(config: QzConfig, data: QzPrintData[]): Promise<void>
  }

  export default qz
}
