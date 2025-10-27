// src/utils/apiConfig.ts
// Smart API URL configuration for dev and production

/**
 * Get the API base URL based on environment and access method
 * - Production: Uses relative URLs (same origin)
 * - Dev: ALWAYS uses Vite proxy (relative URLs) for security
 * 
 * SECURITY: We use Vite proxy even for network IP access to maintain
 * HttpOnly cookie security. This means cookies work properly and JavaScript
 * cannot access the auth token (XSS protection).
 */
export function getApiBaseUrl(): string {
  // If explicitly set in env, use it (production or override)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string
  }

  // In development: ALWAYS use Vite proxy (relative URLs)
  // This ensures HttpOnly cookies work properly even from network IP
  if (import.meta.env.DEV) {
    return '' // Relative URLs go through Vite proxy
  }

  // Production: use relative URLs (same origin)
  return ''
}

/**
 * Get absolute API URL (for cases like image URLs in ECharts that require absolute paths)
 * - If VITE_API_BASE_URL is set, use it (already absolute)
 * - Otherwise, use window.location.origin (same-origin deployment)
 * 
 * Use API_BASE_URL for fetch() calls (supports relative URLs)
 * Use API_ABSOLUTE_URL for image src, ECharts backgrounds, etc. (require absolute URLs)
 */
export function getAbsoluteApiUrl(): string {
  return getApiBaseUrl() || window.location.origin
}

export const API_BASE_URL = getApiBaseUrl()
export const API_ABSOLUTE_URL = getAbsoluteApiUrl()
