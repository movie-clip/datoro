// src/utils/apiConfig.js
// Smart API URL configuration for dev and production

/**
 * Get the API base URL based on environment and access method
 * - Production: Uses relative URLs (same origin)
 * - Dev (localhost): Uses relative URLs (Vite proxy)
 * - Dev (network IP): Uses direct API server connection
 */
export function getApiBaseUrl() {
  // If explicitly set in env, use it (production or override)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  // In development mode
  if (import.meta.env.DEV) {
    const hostname = window.location.hostname
    
    // If accessing via localhost, use Vite proxy (relative URLs)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '' // Relative URLs will go through Vite proxy
    }
    
    // If accessing via network IP (e.g., from mobile), connect directly to API server
    // Assumes API server is on same machine, port 7071
    return `http://${hostname}:7071`
  }

  // Production: use relative URLs (same origin)
  return ''
}

export const API_BASE_URL = getApiBaseUrl()
