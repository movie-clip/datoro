/**
 * Feedback Routes
 * Handles user feedback form submissions
 * 
 * Features:
 * - Email notifications
 * - Rate limiting (prevent spam)
 * - Input validation
 * - Database logging (optional)
 */

import express from 'express'
import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { body, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import logger from '../services/logger.js'

const router = express.Router()

interface MailTransport {
  sendMail(options: {
    from?: string
    to: string
    replyTo: string
    subject: string
    text: string
  }): Promise<unknown>
}

interface MailerLike {
  createTransport(options: {
    service: string
    auth: {
      user?: string
      pass?: string
    }
  }): MailTransport
}

// Email configuration (injected from server.ts)
let FEEDBACK_EMAIL = 'datoro.info@gmail.com'
let nodemailer: MailerLike | null = null

/**
 * Initialize route with dependencies
 */
function initFeedbackRoutes(deps: { 
  feedbackEmail?: string
  emailService?: MailerLike
}) {
  FEEDBACK_EMAIL = deps.feedbackEmail || 'datoro@gmail.com'
  nodemailer = deps.emailService || null
}

/**
 * Rate limiter for feedback submissions
 * 5 submissions per hour per IP (prevent spam)
 */
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many feedback submissions. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * POST /api/feedback
 * Submit user feedback
 * 
 * Body: { name, email, message, category?, url? }
 */
router.post('/',
  feedbackLimiter,
  // Validation middleware
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10, max: 2000 }),
  body('category').optional().isIn(['bug', 'feature', 'general', 'other']).withMessage('Invalid category'),
  // URL is optional and we don't validate format - just accept any string
  
  asyncHandler(async (req: Request, res: Response) => {
    // Check validation results
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      })
    }
    
    const { name, email, message, category = 'general', url } = req.body
    
    logger.info('[Feedback] New submission from:', email)
    
    // Prepare email content
    const emailSubject = `Datoro Feedback: ${category.toUpperCase()}`
    const emailBody = `
New Feedback Submission
========================

From: ${name}
Email: ${email}
Category: ${category}
${url ? `Page URL: ${url}` : ''}

Message:
--------
${message}

========================
Submitted: ${new Date().toISOString()}
IP: ${req.ip}
    `.trim()
    
    try {
      // Send email using nodemailer
      if (nodemailer) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS
          }
        })
        
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: FEEDBACK_EMAIL,
          replyTo: email,
          subject: emailSubject,
          text: emailBody
        })
        
        logger.info('[Feedback] Email sent successfully')
      } else {
        // Fallback: Log to console if email not configured
        logger.info('[Feedback] Email service not configured. Logging to console:')
        logger.info(emailBody)
      }
      
      // Optional: Save to database
      // await prisma.feedback.create({
      //   data: { name, email, message, category, url, ip: req.ip }
      // })
      
      res.json({ 
        success: true, 
        message: 'Feedback submitted successfully. Thank you!' 
      })
      
    } catch (error: unknown) {
      logger.error('[Feedback] Failed to send email:', error)
      
      // Still return success to user (don't expose email errors)
      // Log the feedback for manual review
      res.json({ 
        success: true, 
        message: 'Feedback received. Thank you!' 
      })
    }
  })
)

/**
 * GET /api/feedback/test
 * Test endpoint to verify email configuration
 */
router.get('/test', asyncHandler(async (req: Request, res: Response) => {
  const configured = {
    emailService: !!nodemailer,
    smtpUser: !!process.env.SMTP_USER,
    smtpPass: !!(process.env.SMTP_PASSWORD || process.env.SMTP_PASS),
    feedbackEmail: FEEDBACK_EMAIL
  }
  
  res.json({ 
    status: 'Feedback service initialized',
    configured
  })
}))

export { initFeedbackRoutes }
export default router
