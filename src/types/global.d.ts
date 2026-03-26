/**
 * Global type declarations for external libraries and browser APIs
 */

type GtagCommand = 'event' | 'config' | 'set' | 'consent'
type FbqConsentAction = 'grant' | 'revoke'

// Google Analytics gtag
interface Window {
  gtag?: (
    command: GtagCommand,
    targetId: string,
    config?: Record<string, unknown>
  ) => void
  fbq?: (command: 'consent', action: FbqConsentAction) => void
  dataLayer: unknown[]
  GA_MEASUREMENT_ID?: string
}
