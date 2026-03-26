// server/middleware/security.ts
// Security headers middleware using helmet
// Protects against XSS, clickjacking, MIME sniffing, and other common attacks

import helmet from 'helmet'
import type { Request, Response, NextFunction } from 'express'

/**
 * Configure security headers for the application
 * 
 * Helmet sets various HTTP headers to secure the app:
 * - Content-Security-Policy: Controls resource loading
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Strict-Transport-Security: Enforces HTTPS
 * - X-XSS-Protection: Legacy XSS protection
 */
export function securityHeaders() {
  const isProduction = process.env.NODE_ENV === 'production'

  const scriptSrc = isProduction
    ? [
        "'self'",
        "'unsafe-inline'",
        "data:",
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com'
      ]
    : [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "'wasm-unsafe-eval'",
        'data:',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com'
      ]

  const connectSrc = isProduction
    ? [
        "'self'",
        'https://financialmodelingprep.com',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com'
      ]
    : [
        "'self'",
        'https://financialmodelingprep.com',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'http://localhost:*',
        'ws://localhost:*'
      ]

  return helmet({
    // Content Security Policy - controls what resources can load
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        
        // Vue requires 'unsafe-eval' for template compilation in dev
        // ECharts requires 'unsafe-eval' for dynamic function generation
        // 'wasm-unsafe-eval' is safer but included for compatibility
        // 'unsafe-inline' needed for inline styles/scripts
        // 'data:' needed for Vite's base64-encoded module preloads
        // Google Analytics requires googletagmanager.com
        scriptSrc,
        
        // Allow inline styles (common in Vue components)
        styleSrc: ["'self'", "'unsafe-inline'"],
        
        // Allow images from anywhere (chart.js, external logos, data URIs)
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        
        // Allow connections to FMP API, Google Analytics (all regions), and local backend
        connectSrc,
        
        // Allow web fonts
        fontSrc: ["'self'", "data:"],
        
        // Disallow object/embed tags
        objectSrc: ["'none'"],
        
        // Block all plugins (Flash, Java, etc.)
        frameSrc: ["'none'"],
        
        // Upgrade insecure requests to HTTPS in production
        upgradeInsecureRequests: isProduction ? [] : null
      }
    },
    
    // Allow embedding for iframes (needed for charts)
    crossOriginEmbedderPolicy: false,
    
    // Allow cross-origin resource sharing
    crossOriginResourcePolicy: { policy: "cross-origin" },
    
    // Prevent clickjacking - don't allow site to be embedded in iframes
    frameguard: {
      action: 'deny'
    },
    
    // Prevent MIME type sniffing
    noSniff: true,
    
    // Enable XSS filter in older browsers
    xssFilter: true,
    
    // HSTS - Force HTTPS in production (31536000 = 1 year)
    hsts: isProduction ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false
  })
}

/**
 * Additional custom security headers
 */
export function customSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent browsers from performing DNS prefetching
  res.setHeader('X-DNS-Prefetch-Control', 'off')
  
  // Disable browser features and APIs
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // Referrer policy - only send origin for cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  next()
}
