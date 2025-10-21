// src/utils/apiConfig.js
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
export function getApiBaseUrl() {
  // If explicitly set in env, use it (production or override)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  // In development: ALWAYS use Vite proxy (relative URLs)
  // This ensures HttpOnly cookies work properly even from network IP
  if (import.meta.env.DEV) {
    return '' // Relative URLs go through Vite proxy
  }

  // Production: use relative URLs (same origin)
  return ''
}

export const API_BASE_URL = getApiBaseUrl()
