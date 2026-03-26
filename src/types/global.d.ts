/**
 * Global type declarations for external libraries and browser APIs
 */

type GtagCommand = 'event' | 'config' | 'set' | 'consent'

// Google Analytics gtag
interface Window {
  gtag?: (
    command: GtagCommand,
    targetId: string,
    config?: Record<string, unknown>
  ) => void
  dataLayer: unknown[]
  GA_MEASUREMENT_ID?: string
}
