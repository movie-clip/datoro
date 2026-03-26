/**
 * Subscription Routes
 * Handles Stripe checkout, portal, and subscription management
 */

import { Router, type Request, type Response } from 'express'
import { authenticate } from '../middleware/auth'
import {
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  resumeSubscription,
  getPublishableKey
} from '../services/stripeService'
import logger from '../services/logger'

const router = Router()

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * GET /api/subscription/config
 * Get Stripe publishable key for frontend
 */
router.get('/config', (_req: Request, res: Response) => {
  try {
    const publishableKey = getPublishableKey()
    res.json({ publishableKey })
  } catch (error) {
    logger.error('[Subscription] Error getting config:', error)
    res.status(500).json({ error: 'Failed to get Stripe configuration' })
  }
})

/**
 * POST /api/subscription/checkout
 * Create Stripe Checkout session for subscription
 * Requires authentication
 */
router.post('/checkout', authenticate(true), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const email = req.user!.email
    const name = req.user!.name

    if (!email) {
      return res.status(400).json({ error: 'Email required for subscription' })
    }

    // Create Stripe Checkout session
    const session = await createCheckoutSession(userId, email, name || undefined)

    logger.info(`[Subscription] Created checkout session for user ${userId}`)
    res.json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error: unknown) {
    logger.error('[Subscription] Checkout error:', error)
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to create checkout session' })
  }
})

/**
 * POST /api/subscription/portal
 * Create Stripe Customer Portal session
 * Allows users to manage subscription, payment methods, billing
 * Requires authentication
 */
router.post('/portal', authenticate(true), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id

    // Create portal session
    const url = await createPortalSession(userId)

    logger.info(`[Subscription] Created portal session for user ${userId}`)
    res.json({ url })
  } catch (error: unknown) {
    logger.error('[Subscription] Portal error:', error)
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to create portal session' })
  }
})

/**
 * POST /api/subscription/cancel
 * Cancel subscription at period end
 * Requires authentication
 */
router.post('/cancel', authenticate(true), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id

    await cancelSubscription(userId)

    logger.info(`[Subscription] User ${userId} canceled subscription`)
    res.json({ message: 'Subscription will be canceled at the end of the billing period' })
  } catch (error: unknown) {
    logger.error('[Subscription] Cancel error:', error)
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to cancel subscription' })
  }
})

/**
 * POST /api/subscription/resume
 * Resume a canceled subscription
 * Requires authentication
 */
router.post('/resume', authenticate(true), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id

    await resumeSubscription(userId)

    logger.info(`[Subscription] User ${userId} resumed subscription`)
    res.json({ message: 'Subscription resumed successfully' })
  } catch (error: unknown) {
    logger.error('[Subscription] Resume error:', error)
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to resume subscription' })
  }
})

export default router
