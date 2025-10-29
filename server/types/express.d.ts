/**
 * Express type augmentation
 * Extends Express Request interface with custom properties
 */

import { User } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user from JWT token */
      user?: (Partial<User> & { id: string }) | null
      
      /** User ID extracted from JWT token */
      userId?: string
      
      /** Request ID for logging/tracking */
      id?: string
      
      /** Flag to track if FMP API call was tracked in database */
      fmpCallTracked?: boolean
    }
  }
}

export {}
