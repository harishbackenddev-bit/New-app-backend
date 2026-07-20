import nodemailer from 'nodemailer'

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export interface EmailOptions {
  from: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: Array<{
    filename: string
    content?: string | Buffer
    path?: string
    contentType?: string
  }>
  priority?: 'high' | 'normal' | 'low'
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const mailOptions = {
      from: options.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      priority: options.priority || 'normal'
    }

    const info = await transporter.sendMail(mailOptions)
    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
}

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  const mailOptions: EmailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    to: email,
    subject: 'Welcome to Our Platform',
    html: `
      <h2>Welcome ${name}!</h2>
      <p>Thank you for signing up. We're excited to have you on board.</p>
      <p>Get started by exploring our features.</p>
    `
  }

  await sendEmail(mailOptions)
}

export const sendPasswordResetOTP = async (email: string, otp: string): Promise<void> => {
  const mailOptions: EmailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    to: email,
    subject: 'Password Reset OTP',
    html: `
      <h2>Password Reset Request</h2>
      <p>Your OTP for password reset is:</p>
      <div style="font-size: 32px; letter-spacing: 5px; background: #f5f5f5; padding: 15px; text-align: center; border-radius: 8px; font-weight: bold;">
        ${otp}
      </div>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  }

  await sendEmail(mailOptions)
}

export const sendPasswordResetEmail = async (email: string, resetLink: string): Promise<void> => {
  const mailOptions: EmailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    to: email,
    subject: 'Password Reset Link',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">
        Reset Password
      </a>
      <p>This link is valid for 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  }

  await sendEmail(mailOptions)
}