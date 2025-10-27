/**
 * Async Error Handler Utility
 * 
 * Wraps async route handlers to automatically catch errors and pass them to Express error middleware.
 * This eliminates the need for try-catch blocks in every async route handler.
 * 
 * Usage:
 *   import { asyncHandler } from './utils/asyncHandler.js'
 * 
 *   app.get('/api/endpoint', asyncHandler(async (req, res) => {
 *     const data = await someAsyncOperation()
 *     res.json(data)
 *   }))
 * 
 * Without asyncHandler:
 *   app.get('/api/endpoint', async (req, res, next) => {
 *     try {
 *       const data = await someAsyncOperation()
 *       res.json(data)
 *     } catch (error) {
 *       next(error)  // Must manually pass to error handler
 *     }
 *   })
 */

/**
 * Wraps async route handlers to catch errors and pass them to next()
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped route handler that catches errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * Alternative: asyncHandler with timeout support
 * Automatically times out long-running requests
 * 
 * @param {Function} fn - Async route handler function
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {Function} - Wrapped route handler with timeout
 */
export const asyncHandlerWithTimeout = (fn, timeoutMs = 30000) => (req, res, next) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  Promise.race([
    Promise.resolve(fn(req, res, next)),
    timeoutPromise
  ]).catch(next)
}
