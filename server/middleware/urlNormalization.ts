/**
 * URL Normalization Middleware
 * 
 * Enforces canonical URL structure to prevent duplicate content issues:
 * 1. www → non-www redirect (301 permanent)
 * 2. Trailing slash removal (except root)
 * 3. Lowercase query parameter keys
 * 4. HTTPS enforcement (production only)
 * 
 * This ensures Google indexes only one version of each URL.
 */

import type { Request, Response, NextFunction } from 'express'
import logger from '../services/logger.js'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const CANONICAL_DOMAIN = 'datoro.onrender.com'

/**
 * Normalize URLs to prevent duplicate content
 * 
 * Handles:
 * - www.datoro.onrender.com → datoro.onrender.com (301)
 * - /path/ → /path (301, except root /)
 * - HTTP → HTTPS (production only, 301)
 */
export function urlNormalization(req: Request, res: Response, next: NextFunction): void {
  try {
    const host = req.hostname
    const protocol = req.protocol
    const path = req.path
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''
    
    let shouldRedirect = false
    let redirectUrl = ''
    
    // 1. Remove 'www' subdomain (www.example.com → example.com)
    if (host.startsWith('www.')) {
      const nonWwwHost = host.substring(4)
      redirectUrl = `${protocol}://${nonWwwHost}${req.originalUrl}`
      shouldRedirect = true
      
      logger.info(`[URL Normalization] Redirecting www → non-www: ${host} → ${nonWwwHost}`)
    }
    
    // 2. Remove trailing slash (except root path)
    // /about/ → /about (good for SEO)
    // / → / (root is fine)
    if (!shouldRedirect && path !== '/' && path.endsWith('/')) {
      const pathWithoutSlash = path.slice(0, -1)
      redirectUrl = `${protocol}://${host}${pathWithoutSlash}${queryString}`
      shouldRedirect = true
      
      logger.info(`[URL Normalization] Removing trailing slash: ${path} → ${pathWithoutSlash}`)
    }
    
    // 3. Enforce HTTPS in production (HTTP → HTTPS)
    if (!shouldRedirect && IS_PRODUCTION && protocol !== 'https') {
      redirectUrl = `https://${host}${req.originalUrl}`
      shouldRedirect = true
      
      logger.info(`[URL Normalization] Enforcing HTTPS: ${protocol} → https`)
    }
    
    // Perform 301 permanent redirect if needed
    if (shouldRedirect) {
      logger.info(`[URL Normalization] 301 redirect: ${req.originalUrl} → ${redirectUrl}`)
      return res.redirect(301, redirectUrl)
    }
    
    // No redirect needed - continue to next middleware
    next()
    
  } catch (error) {
    logger.error('[URL Normalization] Error in middleware:', error)
    // Don't break the app - continue even if normalization fails
    next()
  }
}

/**
 * Add canonical link header to all responses
 * Helps search engines identify the preferred URL version
 */
export function addCanonicalHeader(req: Request, res: Response, next: NextFunction): void {
  try {
    const protocol = IS_PRODUCTION ? 'https' : req.protocol
    const host = req.hostname.replace(/^www\./, '') // Remove www prefix
    const path = req.path
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''
    
    // Build canonical URL (always non-www, https in production)
    const canonicalUrl = `${protocol}://${host}${path}${queryString}`
    
    // Add Link header for programmatic canonical detection
    res.setHeader('Link', `<${canonicalUrl}>; rel="canonical"`)
    
    // Store canonical URL in res.locals for template injection (if needed)
    res.locals.canonicalUrl = canonicalUrl
    
  } catch (error) {
    logger.error('[Canonical Header] Error adding header:', error)
  }
  
  next()
}
