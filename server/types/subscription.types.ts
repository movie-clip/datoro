/**
 * Subscription-related TypeScript types
 * Defines interfaces for subscription management
 */

import { SubscriptionStatus, PaymentStatus } from '@prisma/client'

// ============================================
// Subscription Types
// ============================================

export interface SubscriptionData {
  id: string
  userId: string
  status: SubscriptionStatus
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  stripeCurrentPeriodEnd: Date | null
  trialStartsAt: Date
  trialEndsAt: Date
  isInTrial: boolean
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  canceledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateSubscriptionInput {
  userId: string
  trialDays?: number // Default 30
}

export interface UpdateSubscriptionInput {
  status?: SubscriptionStatus
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  stripeCurrentPeriodEnd?: Date
  isInTrial?: boolean
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
  canceledAt?: Date
}

// ============================================
// Payment History Types
// ============================================

export interface PaymentHistoryData {
  id: string
  userId: string
  amount: number // cents
  currency: string
  status: PaymentStatus
  stripePaymentIntentId: string | null
  stripeInvoiceId: string | null
  description: string | null
  failureReason: string | null
  receiptUrl: string | null
  createdAt: Date
  paidAt: Date | null
}

export interface CreatePaymentHistoryInput {
  userId: string
  amount: number
  currency?: string
  status: PaymentStatus
  stripePaymentIntentId?: string
  stripeInvoiceId?: string
  description?: string
  failureReason?: string
  receiptUrl?: string
  paidAt?: Date
}

// ============================================
// Subscription Status Check
// ============================================

export interface SubscriptionStatusCheck {
  hasAccess: boolean
  reason: string
  subscription: SubscriptionData | null
}

// ============================================
// Stripe Webhook Event Types
// ============================================

export interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
}

export interface SubscriptionWebhookData {
  subscriptionId: string
  customerId: string
  status: string
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  trialEnd: number | null
}

// ============================================
// API Response Types
// ============================================

export interface SubscriptionResponse {
  subscription: SubscriptionData
  daysLeftInTrial: number | null
  isActive: boolean
}

export interface CheckoutSessionResponse {
  sessionId: string
  url: string
}

export interface CustomerPortalResponse {
  url: string
}

// ============================================
// Subscription Metrics
// ============================================

export interface SubscriptionMetrics {
  totalSubscriptions: number
  activeTrials: number
  activePaid: number
  pastDue: number
  canceled: number
  mrr: number // Monthly Recurring Revenue in cents
  trialConversionRate: number
  churnRate: number
}

// ============================================
// Export Enums (re-export from Prisma)
// ============================================

export { SubscriptionStatus, PaymentStatus }
