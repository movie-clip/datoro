// server/middleware/security.js
// Security headers middleware using helmet
// Protects against XSS, clickjacking, MIME sniffing, and other common attacks

import helmet from 'helmet'

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
  return helmet({
    // Content Security Policy - controls what resources can load
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        
        // Vue requires 'unsafe-eval' for template compilation
        // 'unsafe-inline' needed for inline styles/scripts
        // 'data:' needed for Vite's base64-encoded module preloads
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "data:"],
        
        // Allow inline styles (common in Vue components)
        styleSrc: ["'self'", "'unsafe-inline'"],
        
        // Allow images from anywhere (chart.js, external logos, data URIs)
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        
        // Allow connections to FMP API and local backend
        connectSrc: [
          "'self'",
          "https://financialmodelingprep.com",
          "http://localhost:*",
          "ws://localhost:*"  // WebSocket for HMR in development
        ],
        
        // Allow web fonts
        fontSrc: ["'self'", "data:"],
        
        // Disallow object/embed tags
        objectSrc: ["'none'"],
        
        // Block all plugins (Flash, Java, etc.)
        frameSrc: ["'none'"],
        
        // Upgrade insecure requests to HTTPS in production
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
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
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false
  })
}

/**
 * Additional custom security headers
 */
export function customSecurityHeaders(req, res, next) {
  // Prevent browsers from performing DNS prefetching
  res.setHeader('X-DNS-Prefetch-Control', 'off')
  
  // Disable browser features and APIs
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // Referrer policy - only send origin for cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  next()
}
