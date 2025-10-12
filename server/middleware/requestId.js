// server/middleware/requestId.js
// Request ID middleware for tracing requests across logs and services

import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID middleware
 * 
 * Generates a unique ID for each request and:
 * - Attaches it to req.id
 * - Returns it in X-Request-ID header
 * - Can be used in logs and passed to Sentry
 * 
 * Usage:
 *   import { requestId } from './middleware/requestId.js'
 *   app.use(requestId())
 * 
 * In route handlers:
 *   console.log(`[${req.id}] Processing request...`)
 */
export function requestId() {
  return (req, res, next) => {
    // Check if request already has an ID (from load balancer/proxy)
    const existingId = req.headers['x-request-id'];
    
    // Generate or reuse request ID
    req.id = existingId || uuidv4();
    
    // Add to response headers
    res.setHeader('X-Request-ID', req.id);
    
    next();
  };
}

/**
 * Helper to format log messages with request ID
 * 
 * Usage:
 *   import { logWithId } from './middleware/requestId.js'
 *   logWithId(req, 'Processing request...')
 */
export function logWithId(req, message, ...args) {
  const prefix = req.id ? `[${req.id}]` : '';
  console.log(`${prefix} ${message}`, ...args);
}

export default requestId;
