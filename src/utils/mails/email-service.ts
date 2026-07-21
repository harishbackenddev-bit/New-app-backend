// utils/mails/email-service.ts
import nodemailer from 'nodemailer'
import { configDotenv } from 'dotenv'

configDotenv()

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
})

interface SendInviteEmailParams {
    to: string
    tenantName: string
    tenantSubdomain: string
    tempPassword: string
    invitedBy: string
    role: string
}

export const sendTenantInviteEmail = async (params: SendInviteEmailParams) => {
    const { to, tenantName, tenantSubdomain, tempPassword, invitedBy, role } = params

    const subject = `You've been invited to join ${tenantName} as ${role}`
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
                .label { font-weight: 600; color: #374151; }
                .value { color: #1f2937; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to ${tenantName}</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p><strong>${invitedBy}</strong> has invited you to join <strong>${tenantName}</strong> as a <strong>${role}</strong>.</p>
                    
                    <div class="credentials">
                        <h3>Your Login Credentials</h3>
                        <p><span class="label">Email:</span> <span class="value">${to}</span></p>
                        <p><span class="label">Temporary Password:</span> <span class="value">${tempPassword}</span></p>
                        <p><span class="label">Tenant:</span> <span class="value">${tenantName}</span></p>
                        <p><span class="label">Subdomain:</span> <span class="value">${tenantSubdomain}</span></p>
                    </div>

                    <p><strong>Please log in and change your password immediately.</strong></p>

                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                        Click here to login
                    </a>

                    <div style="margin-top: 20px; font-size: 14px;">
                        <p><strong>Login URL:</strong></p>
                        <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
                            ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login
                        </p>
                        <p><strong>Tenant Login URL:</strong></p>
                        <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
                            http://${tenantSubdomain}.${process.env.BASE_DOMAIN || 'localhost:5173'}/login
                        </p>
                    </div>

                    <p style="color: #ef4444; font-size: 14px;">
                        ⚠️ This password is temporary. Please change it after your first login.
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

                    <p style="font-size: 14px;">
                        If you have any questions, please contact your tenant administrator.
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated message from ${process.env.APP_NAME || 'Your App'}.</p>
                    <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Your App'}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.APP_NAME || 'Your App'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html
        })

        console.log(`Email sent to ${to}: ${info.messageId}`)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('Email sending failed:', error)
        return { success: false, error: error }
    }
}

// Alternative: Send email using a simpler function
export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.APP_NAME || 'Your App'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html
        })
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('Email sending failed:', error)
        return { success: false, error: error }
    }
}