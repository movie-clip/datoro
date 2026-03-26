/**
 * Stripe Webhook Routes
 * Handles Stripe webhook events for subscription lifecycle
 */

import { Router, type Request, type Response } from 'express'
import type Stripe from 'stripe'
import { constructWebhookEvent } from '../services/stripeService'
import { getPrismaClient } from '../services/databaseService'
import { SubscriptionStatus, PaymentStatus } from '@prisma/client'
import logger from '../services/logger'

const router = Router()

type StripeCheckoutSessionWithSubscription = Stripe.Checkout.Session & {
  subscription?: string | Stripe.Subscription | null
}

type StripeSubscriptionWithPeriods = Stripe.Subscription & {
  current_period_end?: number
  current_period_start?: number
  cancel_at_period_end?: boolean
}

type StripeInvoiceWithRefs = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null
  payment_intent?: string | Stripe.PaymentIntent | null
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * 
 * IMPORTANT: This endpoint must use raw body (not JSON parsed)
 * Webhook signature verification requires the raw request body
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string

  if (!signature) {
    logger.error('[Webhook] No Stripe signature header')
    return res.status(400).json({ error: 'No signature' })
  }

  try {
    // Verify webhook signature and construct event
    const event = constructWebhookEvent(req.body, signature)

    logger.info(`[Webhook] Received event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        logger.info(`[Webhook] Unhandled event type: ${event.type}`)
    }

    // Acknowledge receipt
    res.json({ received: true })
  } catch (error: unknown) {
    logger.error('[Webhook] Error processing webhook:', error)
    res.status(400).json({ error: getErrorMessage(error) || 'Webhook processing failed' })
  }
})

// ============================================
// Webhook Event Handlers
// ============================================

/**
 * Handle checkout.session.completed event
 * Called when user successfully completes checkout
 * This is the first event that fires - before subscription.created
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const db = getPrismaClient()
  const userId = session.metadata?.userId

  if (!userId) {
    logger.error('[Webhook] No userId in checkout session metadata')
    return
  }

  try {
    // Get subscription ID from session
    const sessionData = session as StripeCheckoutSessionWithSubscription
    const subscriptionId = typeof sessionData.subscription === 'string' ? sessionData.subscription : null

    if (!subscriptionId) {
      logger.warn('[Webhook] Checkout completed but no subscription ID')
      return
    }

    // Update subscription with Stripe customer and subscription IDs
    await db.subscription.update({
      where: { userId },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        // Status will be updated by subscription.created event
      }
    })

    logger.info(`[Webhook] Checkout completed for user ${userId}`)
  } catch (error) {
    logger.error(`[Webhook] Error processing checkout completion for user ${userId}:`, error)
  }
}

/**
 * Handle subscription.created event
 * Called when a new subscription is created (after checkout)
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const db = getPrismaClient()
  const userId = subscription.metadata.userId

  if (!userId) {
    logger.error('[Webhook] No userId in subscription metadata')
    return
  }

  try {
    const stripeSubscription = subscription as StripeSubscriptionWithPeriods
    
    await db.subscription.update({
      where: { userId },
      data: {
        status: subscription.status === 'trialing' ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
        currentPeriodStart: stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : null,
        currentPeriodEnd: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
        isInTrial: subscription.status === 'trialing'
      }
    })

    logger.info(`[Webhook] Subscription created for user ${userId}`)
  } catch (error) {
    logger.error(`[Webhook] Error updating subscription for user ${userId}:`, error)
  }
}

/**
 * Handle subscription.updated event
 * Called when subscription status changes (trial ends, canceled, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const db = getPrismaClient()
  const userId = subscription.metadata.userId

  if (!userId) {
    logger.error('[Webhook] No userId in subscription metadata')
    return
  }

  try {
    // Map Stripe status to our SubscriptionStatus enum
    let status: SubscriptionStatus
    switch (subscription.status) {
      case 'trialing':
        status = SubscriptionStatus.TRIALING
        break
      case 'active':
        status = SubscriptionStatus.ACTIVE
        break
      case 'past_due':
        status = SubscriptionStatus.PAST_DUE
        break
      case 'canceled':
        status = SubscriptionStatus.CANCELED
        break
      case 'unpaid':
        status = SubscriptionStatus.UNPAID
        break
      case 'paused':
        status = SubscriptionStatus.CANCELED  // Map paused to canceled
        break
      case 'incomplete':
        status = SubscriptionStatus.INCOMPLETE
        break
      case 'incomplete_expired':
      default:
        status = SubscriptionStatus.INCOMPLETE_EXPIRED
    }

    // Access Stripe subscription properties safely
    const stripeSubscription = subscription as StripeSubscriptionWithPeriods

    await db.subscription.update({
      where: { userId },
      data: {
        status,
        stripeCurrentPeriodEnd: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
        currentPeriodStart: stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : null,
        currentPeriodEnd: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
        isInTrial: subscription.status === 'trialing',
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
      }
    })

    logger.info(`[Webhook] Subscription updated for user ${userId} - status: ${status}`)
  } catch (error) {
    logger.error(`[Webhook] Error updating subscription for user ${userId}:`, error)
  }
}

/**
 * Handle subscription.deleted event
 * Called when subscription is permanently deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const db = getPrismaClient()
  const userId = subscription.metadata.userId

  if (!userId) {
    logger.error('[Webhook] No userId in subscription metadata')
    return
  }

  try {
    await db.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELED,
        isInTrial: false,
        canceledAt: new Date()
      }
    })

    logger.info(`[Webhook] Subscription deleted for user ${userId}`)
  } catch (error) {
    logger.error(`[Webhook] Error deleting subscription for user ${userId}:`, error)
  }
}

/**
 * Handle subscription.trial_will_end event
 * Called 3 days before trial ends (configurable in Stripe)
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId

  if (!userId) {
    logger.error('[Webhook] No userId in subscription metadata')
    return
  }

  // TODO: Send email notification to user
  logger.info(`[Webhook] Trial will end soon for user ${userId}`)
  
  // Future: Trigger email service to send trial ending notification
  // await emailService.sendTrialEndingNotification(userId, subscription.trial_end)
}

/**
 * Handle invoice.payment_succeeded event
 * Called when a subscription payment is successful
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const db = getPrismaClient()
  const invoiceData = invoice as StripeInvoiceWithRefs
  const subscriptionId = typeof invoiceData.subscription === 'string' ? invoiceData.subscription : null
  
  if (!subscriptionId) {
    logger.warn('[Webhook] Payment succeeded but no subscription ID')
    return
  }

  try {
    // Find user by Stripe subscription ID
    const subscription = await db.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { userId: true }
    })

    if (!subscription) {
      logger.error(`[Webhook] No subscription found for Stripe ID: ${subscriptionId}`)
      return
    }

    // Record payment in history
    await db.paymentHistory.create({
      data: {
        userId: subscription.userId,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: PaymentStatus.SUCCEEDED,
        stripePaymentIntentId: typeof invoiceData.payment_intent === 'string' ? invoiceData.payment_intent : null,
        stripeInvoiceId: invoice.id
      }
    })

    logger.info(`[Webhook] Payment succeeded for user ${subscription.userId} - $${invoice.amount_paid / 100}`)
  } catch (error) {
    logger.error('[Webhook] Error recording payment:', error)
  }
}

/**
 * Handle invoice.payment_failed event
 * Called when a subscription payment fails
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const db = getPrismaClient()
  const invoiceData = invoice as StripeInvoiceWithRefs
  const subscriptionId = typeof invoiceData.subscription === 'string' ? invoiceData.subscription : null
  
  if (!subscriptionId) {
    logger.warn('[Webhook] Payment failed but no subscription ID')
    return
  }

  try {
    // Find user by Stripe subscription ID
    const subscription = await db.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { userId: true }
    })

    if (!subscription) {
      logger.error(`[Webhook] No subscription found for Stripe ID: ${subscriptionId}`)
      return
    }

    // Record failed payment
    await db.paymentHistory.create({
      data: {
        userId: subscription.userId,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: PaymentStatus.FAILED,
        stripePaymentIntentId: typeof invoiceData.payment_intent === 'string' ? invoiceData.payment_intent : null,
        stripeInvoiceId: invoice.id
      }
    })

    logger.warn(`[Webhook] Payment failed for user ${subscription.userId}`)
    
    // TODO: Send email notification about failed payment
    // await emailService.sendPaymentFailedNotification(subscription.userId)
  } catch (error) {
    logger.error('[Webhook] Error recording failed payment:', error)
  }
}

export default router
