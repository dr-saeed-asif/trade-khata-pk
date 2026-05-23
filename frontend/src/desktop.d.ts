export {}

declare global {
  interface Window {
    desktop?: {
      platform: string
      isElectron: boolean
      printLabel: (html: string, options?: { copies?: number }) => Promise<{ ok: boolean }>
    }
  }
}
