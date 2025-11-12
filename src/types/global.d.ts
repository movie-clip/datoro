/**
 * Global type declarations for external libraries and browser APIs
 */

// Google Analytics gtag
interface Window {
  gtag?: (
    command: 'event' | 'config' | 'set',
    targetId: string,
    config?: Record<string, any>
  ) => void
}
