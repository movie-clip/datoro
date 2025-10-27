// server/utils/asyncHandler.ts

import type { Request, Response, NextFunction, RequestHandler } from 'express'

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
 * Async route handler function type
 */
export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>

/**
 * Wraps async route handlers to catch errors and pass them to next()
 * 
 * @param fn - Async route handler function
 * @returns Wrapped route handler that catches errors
 */
export const asyncHandler = (fn: AsyncRouteHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Alternative: asyncHandler with timeout support
 * Automatically times out long-running requests
 * 
 * @param fn - Async route handler function
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Wrapped route handler with timeout
 */
export const asyncHandlerWithTimeout = (
  fn: AsyncRouteHandler,
  timeoutMs: number = 30000
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    Promise.race([
      Promise.resolve(fn(req, res, next)),
      timeoutPromise
    ]).catch(next)
  }
}
