/**
 * Stripe Service
 * Handles all Stripe API interactions for subscription management
 */

import Stripe from 'stripe'
import { getPrismaClient } from './databaseService'
import logger from './logger'

interface StripeServiceErrorLike {
  message?: string
  type?: string
  code?: string
  statusCode?: number
  raw?: unknown
}

function toStripeServiceError(error: unknown): StripeServiceErrorLike {
  if (typeof error === 'object' && error !== null) {
    return error as StripeServiceErrorLike
  }

  return {
    message: String(error)
  }
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
let stripeClient: Stripe | null = null

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true
    })
  }

  return stripeClient
}

// Stripe configuration
const STRIPE_CONFIG = {
  priceId: process.env.STRIPE_PRICE_ID || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  successUrl: process.env.APP_URL ? `${process.env.APP_URL}/subscription/success` : 'http://localhost:5173/subscription/success',
  cancelUrl: process.env.APP_URL ? `${process.env.APP_URL}/pricing` : 'http://localhost:5173/pricing'
}

// Validate Stripe configuration
if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn('[Stripe] STRIPE_SECRET_KEY not set - subscription features will be disabled')
}
if (!process.env.STRIPE_PRICE_ID) {
  logger.warn('[Stripe] STRIPE_PRICE_ID not set - checkout will fail')
} else if (!process.env.STRIPE_PRICE_ID.startsWith('price_')) {
  logger.error(`[Stripe] STRIPE_PRICE_ID is invalid: ${process.env.STRIPE_PRICE_ID} (must start with "price_")`)
}
if (!process.env.STRIPE_PUBLISHABLE_KEY) {
  logger.warn('[Stripe] STRIPE_PUBLISHABLE_KEY not set')
}

logger.info(`[Stripe] Configuration loaded:`)
logger.info(`  - Price ID: ${STRIPE_CONFIG.priceId ? STRIPE_CONFIG.priceId : 'NOT SET'}`)
logger.info(`  - Publishable Key: ${STRIPE_CONFIG.publishableKey ? 'SET' : 'NOT SET'}`)
logger.info(`  - Webhook Secret: ${STRIPE_CONFIG.webhookSecret ? 'SET' : 'NOT SET'}`)
logger.info(`  - Success URL: ${STRIPE_CONFIG.successUrl}`)
logger.info(`  - Cancel URL: ${STRIPE_CONFIG.cancelUrl}`)


/**
 * Create or retrieve a Stripe customer for a user
 */
export async function createOrGetStripeCustomer(userId: string, email: string, name?: string): Promise<string> {
  const db = getPrismaClient()
  
  try {
    // Check if user already has a Stripe customer ID
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true }
    })

    if (subscription?.stripeCustomerId) {
      // Verify customer still exists in Stripe
      try {
        await getStripe().customers.retrieve(subscription.stripeCustomerId)
        return subscription.stripeCustomerId
      } catch (error) {
        logger.warn(`[Stripe] Customer ${subscription.stripeCustomerId} not found, creating new one`)
      }
    }

    // Create new Stripe customer
    const customer = await getStripe().customers.create({
      email,
      name: name || undefined,
      metadata: {
        userId
      }
    })

    // Update subscription with Stripe customer ID
    await db.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customer.id }
    })

    logger.info(`[Stripe] Created customer ${customer.id} for user ${userId}`)
    return customer.id
  } catch (error) {
    logger.error('[Stripe] Error creating/getting customer:', error)
    throw new Error('Failed to create Stripe customer')
  }
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Checkout.Session> {
  const db = getPrismaClient()
  
  try {
    // Check if user already has an active subscription
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { 
        status: true, 
        isInTrial: true,
        stripeSubscriptionId: true 
      }
    })

    // Determine if user should get a trial
    // Only offer trial if user has never had a paid subscription
    const shouldOfferTrial = !subscription?.stripeSubscriptionId
    
    // Create or get Stripe customer
    const customerId = await createOrGetStripeCustomer(userId, email, name)

    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.priceId,
          quantity: 1
        }
      ],
      success_url: STRIPE_CONFIG.successUrl,
      cancel_url: STRIPE_CONFIG.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        userId
      }
    }

    // Only add trial if user hasn't had a Stripe subscription before
    if (shouldOfferTrial) {
      sessionConfig.subscription_data = {
        trial_period_days: 30,
        metadata: {
          userId
        }
      }
      logger.info(`[Stripe] Offering 30-day trial for new user ${userId}`)
    } else {
      sessionConfig.subscription_data = {
        metadata: {
          userId
        }
      }
      logger.info(`[Stripe] No trial offered for returning user ${userId}`)
    }

    const session = await getStripe().checkout.sessions.create(sessionConfig)

    logger.info(`[Stripe] Created checkout session ${session.id} for user ${userId}`)
    return session
  } catch (error: unknown) {
    const stripeError = toStripeServiceError(error)
    logger.error('[Stripe] Error creating checkout session:', {
      error: stripeError.message,
      type: stripeError.type,
      code: stripeError.code,
      statusCode: stripeError.statusCode,
      raw: stripeError.raw
    })
    throw new Error(stripeError.message || 'Failed to create checkout session')
  }
}

/**
 * Create a Stripe Customer Portal session
 * Allows users to manage their subscription, payment methods, and billing
 */
export async function createPortalSession(userId: string): Promise<string> {
  const db = getPrismaClient()
  
  try {
    // Get user's Stripe customer ID
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true }
    })

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found for user')
    }

    // Create portal session
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: process.env.APP_URL ? `${process.env.APP_URL}/account` : 'http://localhost:5173/account'
    })

    logger.info(`[Stripe] Created portal session for user ${userId}`)
    return session.url
  } catch (error) {
    logger.error('[Stripe] Error creating portal session:', error)
    throw new Error('Failed to create portal session')
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const db = getPrismaClient()
  
  try {
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true }
    })

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No subscription found for user')
    }

    // Cancel subscription at period end (user keeps access until end of billing period)
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    // Update database
    await db.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date()
      }
    })

    logger.info(`[Stripe] Canceled subscription for user ${userId} at period end`)
  } catch (error) {
    logger.error('[Stripe] Error canceling subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(userId: string): Promise<void> {
  const db = getPrismaClient()
  
  try {
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true }
    })

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No subscription found for user')
    }

    // Resume subscription
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    })

    // Update database
    await db.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null
      }
    })

    logger.info(`[Stripe] Resumed subscription for user ${userId}`)
  } catch (error) {
    logger.error('[Stripe] Error resuming subscription:', error)
    throw new Error('Failed to resume subscription')
  }
}

/**
 * Get Stripe publishable key (safe to expose to frontend)
 */
export function getPublishableKey(): string {
  return STRIPE_CONFIG.publishableKey
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  try {
    return getStripe().webhooks.constructEvent(
      payload,
      signature,
      STRIPE_CONFIG.webhookSecret
    )
  } catch (error) {
    logger.error('[Stripe] Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY)
}
