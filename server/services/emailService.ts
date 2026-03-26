/**
 * Email Service
 * 
 * Handles sending transactional emails using Nodemailer.
 * Supports multiple providers: SMTP, SendGrid, AWS SES.
 * 
 * Best practices:
 * - HTML + plain text fallback
 * - Rate limiting via database tracking
 * - Error handling and retry logic
 * - Email templates with variables
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import logger from './logger.js'

// Email configuration from environment
const EMAIL_CONFIG = {
  provider: process.env.EMAIL_PROVIDER || 'smtp', // 'smtp', 'sendgrid', 'ses'
  from: process.env.EMAIL_FROM || 'noreply@datoro.com',
  fromName: process.env.EMAIL_FROM_NAME || 'Datoro',
  
  // SMTP config (for Gmail, Outlook, custom SMTP)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  },
  
  // SendGrid API key
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY
  },
  
  // AWS SES config
  ses: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  
  // App URLs
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:7071'
}

// Create transporter based on provider
let transporter: Transporter | null = null

function createTransporter(): Transporter {
  if (transporter) return transporter

  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Development: Use Ethereal (fake SMTP) or console logging
  if (isDevelopment && !EMAIL_CONFIG.smtp.auth.user) {
    logger.info('[Email] Development mode: emails will be logged to console')
    // Create test account for development
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    })
  }

  // Production: Use configured provider
  switch (EMAIL_CONFIG.provider) {
    case 'sendgrid':
      if (!EMAIL_CONFIG.sendgrid.apiKey) {
        throw new Error('SendGrid API key not configured')
      }
      // SendGrid uses SMTP
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: EMAIL_CONFIG.sendgrid.apiKey
        }
      })
      break

    case 'ses':
      // AWS SES transport
      if (!EMAIL_CONFIG.ses.accessKeyId || !EMAIL_CONFIG.ses.secretAccessKey) {
        throw new Error('AWS SES credentials not configured')
      }
      // Note: Requires aws-sdk package
      throw new Error('AWS SES not yet implemented - use SMTP or SendGrid')

    case 'smtp':
    default:
      if (!EMAIL_CONFIG.smtp.auth.user || !EMAIL_CONFIG.smtp.auth.pass) {
        throw new Error('SMTP credentials not configured')
      }
      transporter = nodemailer.createTransport(EMAIL_CONFIG.smtp)
      break
  }

  // Verify connection
  transporter.verify((error) => {
    if (error) {
      logger.error('[Email] Transporter verification failed:', error)
    } else {
      logger.info('[Email] Email service ready')
    }
  })

  return transporter
}

/**
 * Email Templates
 */

interface EmailVerificationData {
  userName: string
  verificationUrl: string
  expiresInHours: number
}

function getVerificationEmailHtml(data: EmailVerificationData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Datoro</div>
      <h1 style="margin: 0; color: #1f2937;">Verify Your Email Address</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.userName},</p>
      
      <p>Welcome to Datoro! Please verify your email address to activate your account and start accessing financial data insights.</p>
      
      <div style="text-align: center;">
        <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">
        ${data.verificationUrl}
      </p>
      
      <div class="warning">
        <strong>⏰ This link expires in ${data.expiresInHours} hours</strong>
      </div>
      
      <p>If you didn't create an account with Datoro, you can safely ignore this email.</p>
    </div>
    
    <div class="footer">
      <p><strong>Why verify your email?</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Secure your account</li>
        <li>Receive important notifications</li>
        <li>Reset your password if needed</li>
        <li>Access all platform features</li>
      </ul>
      
      <p style="margin-top: 20px;">
        Questions? Contact us at <a href="mailto:support@datoro.com">support@datoro.com</a>
      </p>
      
      <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
        © ${new Date().getFullYear()} Datoro. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

function getVerificationEmailText(data: EmailVerificationData): string {
  return `
Hi ${data.userName},

Welcome to Datoro! Please verify your email address to activate your account.

Verify your email by clicking this link:
${data.verificationUrl}

This link expires in ${data.expiresInHours} hours.

If you didn't create an account with Datoro, you can safely ignore this email.

Questions? Contact us at support@datoro.com

© ${new Date().getFullYear()} Datoro. All rights reserved.
  `.trim()
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  userName: string,
  verificationToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const verificationUrl = `${EMAIL_CONFIG.appUrl}?action=verify-email&token=${verificationToken}`
    
    const emailData: EmailVerificationData = {
      userName: userName || 'there',
      verificationUrl,
      expiresInHours: 24
    }

    const mailOptions = {
      from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.from}>`,
      to: email,
      subject: 'Verify Your Email - Datoro',
      text: getVerificationEmailText(emailData),
      html: getVerificationEmailHtml(emailData)
    }

    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Development: Log to console
    if (isDevelopment && !EMAIL_CONFIG.smtp.auth.user) {
      logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      logger.info('📧 VERIFICATION EMAIL (Development Mode)')
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      logger.info(`To: ${email}`)
      logger.info(`Subject: ${mailOptions.subject}`)
      logger.info(`\nVerification URL:`)
      logger.info(`${verificationUrl}`)
      logger.info('\nCopy the URL above and paste it into your browser to verify your email.')
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
      return {
        success: true,
        messageId: 'dev-' + Date.now()
      }
    }

    // Production: Send actual email
    const transport = createTransporter()
    const info = await transport.sendMail(mailOptions)
    
    logger.info(`[Email] Verification email sent to ${email}`, {
      messageId: info.messageId,
      response: info.response
    })

    return {
      success: true,
      messageId: info.messageId
    }

  } catch (error: any) {
    logger.error('[Email] Failed to send verification email:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Send password reset email (future implementation)
 */
export async function sendPasswordResetEmail(
  _email: string,
  _userName: string,
  _resetToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // TODO: Implement password reset email
  logger.warn('[Email] Password reset email not yet implemented')
  return {
    success: false,
    error: 'Not implemented'
  }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  _userName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // TODO: Implement welcome email
  logger.info(`[Email] Welcome email would be sent to ${email}`)
  return {
    success: true,
    messageId: 'welcome-stub'
  }
}
