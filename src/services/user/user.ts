import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt, { JwtPayload } from 'jsonwebtoken'
import { customAlphabet } from "nanoid"
import prisma from "../../lib/prisma"
import { errorResponseHandler } from "../../lib/errors/error-response-handler"
import { httpStatusCode } from "../../lib/constant"
import { sendPasswordResetEmail } from "../../utils/mails/mail"
import { generateAuthToken, hashPassword, comparePassword, generateNumericOTP } from "../../utils/auth-utils"

// ============================================
// TYPES
// ============================================

interface SignupPayload {
    email: string
    password: string
    fullName?: string
    phoneNumber?: string
    [key: string]: any
}

interface LoginPayload {
    email: string
    password: string
}

interface UpdateUserPayload {
    userId: string
    body: any
}

interface UpdatePasswordPayload {
    userId: string
    body: {
        currentPassword?: string
        newPassword?: string
        confirmPassword?: string
    }
}

// ============================================
// AUTH SERVICES
// ============================================

/**
 * Signup Service
 */
export const signupService = async (payload: SignupPayload, res: Response) => {
    try {
        const { email, password, fullName, phoneNumber } = payload
        const normalizedEmail = email.toLowerCase().trim()

        // Check if email exists
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        })

        if (existingUser) {
            return errorResponseHandler(
                "Email already exists",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        // Hash password
        const hashedPassword = await hashPassword(password)

        // Create user
        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password_hash: hashedPassword,
                full_name: fullName,
                phone: phoneNumber
            }
        })

        // Generate token
        const token = generateAuthToken({
            id: user.user_id,
            email: user.email,
            phone: user.phone
        })

        // Remove sensitive data
        const { password_hash, reset_token, reset_token_expires, reset_otp, reset_otp_expires, ...userData } = user

        return {
            success: true,
            message: "User signup successful",
            token,
            user: userData
        }
    } catch (error: any) {
        console.error("Signup error:", error)
        return errorResponseHandler(
            error.message || "Failed to create user",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Login Service
 */
export const loginService = async (payload: LoginPayload, res: Response) => {
    try {
        const { email, password } = payload
        const normalizedEmail = email.toLowerCase().trim()

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
                memberships: {
                    include: {
                        tenant: true
                    }
                }
            }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash)
        if (!isValidPassword) {
            return errorResponseHandler(
                "Invalid password",
                httpStatusCode.UNAUTHORIZED,
                res
            )
        }

        // Determine role from memberships
        let role = "user"
        if (user.memberships.length > 0) {
            const hasAdminRole = user.memberships.some((m: { role: string }) => m.role === "super-admin")
            if (hasAdminRole) {
                role = "admin"
            } else {
                role = "member"
            }
        }

        // Generate token
        const token = generateAuthToken({
            id: user.user_id,
            email: user.email,
            role
        })

        // Remove sensitive data
        const { password_hash, reset_token, reset_token_expires, reset_otp, reset_otp_expires, ...userData } = user

        return {
            success: true,
            message: "Login successful",
            data: {
                ...userData,
                role
            },
            token
        }
    } catch (error: any) {
        console.error("Login error:", error)
        return errorResponseHandler(
            error.message || "Failed to login",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Get User Data Service
 */
export const userdataServive = async (payload: { userId: string }, res: Response) => {
    try {
        const { userId } = payload

        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            include: {
                memberships: {
                    include: {
                        tenant: true
                    }
                }
            }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Remove sensitive data
        const { password_hash, reset_token, reset_token_expires, reset_otp, reset_otp_expires, ...userData } = user

        return {
            success: true,
            message: "User data fetched successfully",
            data: userData
        }
    } catch (error: any) {
        console.error("Fetch user error:", error)
        return errorResponseHandler(
            error.message || "Failed to fetch user data",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

// ============================================
// PASSWORD RESET SERVICES - OTP FLOW (NEW)
// ============================================

/**
 * Forgot Password with OTP Service
 */
export const forgotPasswordOTPService = async (payload: { email: string }, res: Response) => {
    try {
        const { email } = payload
        const normalizedEmail = email.toLowerCase().trim()

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Generate OTP
        const otp = generateNumericOTP(6)
        const otpExpiry = new Date()
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10) // 10 minutes expiry

        // Save OTP to database
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                reset_otp: otp,
                reset_otp_expires: otpExpiry
            }
        })

        // Send OTP via email
        // await sendPasswordResetOTP(email, otp)

        return {
            success: true,
            message: "OTP sent successfully to your email"
        }
    } catch (error: any) {
        console.error("Forgot password OTP error:", error)
        return errorResponseHandler(
            error.message || "Failed to send OTP",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Verify OTP Service
 */
export const verifyOTPService = async (payload: { email: string; otp: string }, res: Response) => {
    try {
        const { email, otp } = payload
        const normalizedEmail = email.toLowerCase().trim()

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Check if OTP exists
        if (!user.reset_otp || !user.reset_otp_expires) {
            return errorResponseHandler(
                "No OTP found. Please request a new one.",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        // Check if OTP is expired
        if (new Date() > user.reset_otp_expires) {
            return errorResponseHandler(
                "OTP has expired. Please request a new one.",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        // Verify OTP
        if (user.reset_otp !== otp) {
            return errorResponseHandler(
                "Invalid OTP",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        // Generate reset token for password reset
        const resetToken = generateAuthToken(
            { id: user.user_id },
            "15m"
        )

        // Clear OTP after verification
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                reset_otp: null,
                reset_otp_expires: null
            }
        })

        return {
            success: true,
            message: "OTP verified successfully",
            reset_token: resetToken
        }
    } catch (error: any) {
        console.error("Verify OTP error:", error)
        return errorResponseHandler(
            error.message || "Failed to verify OTP",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Reset Password with OTP Service
 */
export const resetPasswordWithOTPService = async (
    payload: { email: string; otp: string; newPassword: string; confirmPassword: string },
    res: Response
) => {
    try {
        const { email, otp, newPassword, confirmPassword } = payload

        // Validate input
        if (!email || !otp || !newPassword) {
            return errorResponseHandler(
                "Email, OTP, and new password are required",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        if (newPassword !== confirmPassword) {
            return errorResponseHandler(
                "Passwords do not match",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        if (newPassword.length < 8) {
            return errorResponseHandler(
                "Password must be at least 8 characters",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        const normalizedEmail = email.toLowerCase().trim()
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Check OTP
        if (!user.reset_otp || !user.reset_otp_expires) {
            return errorResponseHandler(
                "No OTP found. Please request a new one.",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        if (new Date() > user.reset_otp_expires) {
            return errorResponseHandler(
                "OTP has expired. Please request a new one.",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        if (user.reset_otp !== otp) {
            return errorResponseHandler(
                "Invalid OTP",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        // Hash new password and update
        const hashedPassword = await hashPassword(newPassword)
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                password_hash: hashedPassword,
                reset_otp: null,
                reset_otp_expires: null
            }
        })

        return {
            success: true,
            message: "Password reset successful. Please login with your new password."
        }
    } catch (error: any) {
        console.error("Reset password error:", error)
        return errorResponseHandler(
            error.message || "Failed to reset password",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

// ============================================
// PASSWORD RESET SERVICES - TOKEN FLOW (LEGACY)
// ============================================

/**
 * Forgot Password with Token Service (Legacy)
 */
export const forgotPasswordService = async (payload: { email: string }, res: Response) => {
    try {
        const { email } = payload
        console.log("emaildd", email)

        const user = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase().trim()
            }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        const resetToken = jwt.sign(
            { id: user.user_id },
            process.env.JWT_SECRET as string,
            { expiresIn: "1h" }
        )

        const tokenExpiry = new Date()
        tokenExpiry.setHours(tokenExpiry.getHours() + 1)

        // Save token to database
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                reset_token: resetToken,
                reset_token_expires: tokenExpiry
            }
        })

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        await sendPasswordResetEmail(email, resetLink)

        return {
            success: true,
            message: "Password reset link sent successfully"
        }
    } catch (error: any) {
        console.error("Forgot password error:", error)
        return errorResponseHandler(
            error.message || "Failed to send reset link",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Verify Password Reset with Token Service (Legacy)
 */
export const verifyPasswordResetService = async (
    payload: { token: string; newPassword: string; confirmPassword: string },
    res: Response
) => {
    try {
        const { token, newPassword, confirmPassword } = payload

        // Validate input
        if (!token || !newPassword) {
            return errorResponseHandler(
                "Token and new password are required",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        if (newPassword !== confirmPassword) {
            return errorResponseHandler(
                "Passwords do not match",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        if (newPassword.length < 8) {
            return errorResponseHandler(
                "Password must be at least 8 characters",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        // Verify JWT token
        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return errorResponseHandler(
                    "Reset link has expired. Please request a new one.",
                    httpStatusCode.BAD_REQUEST,
                    res
                )
            }
            return errorResponseHandler(
                "Invalid reset link. Please request a new one.",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        // Find user by ID from token
        const user = await prisma.user.findUnique({
            where: { user_id: decoded.id }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword)

        // Update user password
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                password_hash: hashedPassword,
                reset_token: null,
                reset_token_expires: null
            }
        })

        return {
            success: true,
            message: "Password reset successful. Please login with your new password."
        }
    } catch (error: any) {
        console.error("Reset password error:", error)
        return errorResponseHandler(
            error.message || "Failed to reset password",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

// ============================================
// USER MANAGEMENT SERVICES
// ============================================

/**
 * Get User Info Service
 */
export const getUserInfoService = async (userId: string, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            include: {
                memberships: {
                    include: {
                        tenant: true
                    }
                }
            }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        const { password_hash, reset_token, reset_token_expires, reset_otp, reset_otp_expires, ...userData } = user

        return {
            success: true,
            message: "User data fetched successfully",
            data: userData
        }
    } catch (error: any) {
        console.error("Get user info error:", error)
        return errorResponseHandler(
            error.message || "Failed to fetch user data",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Update User Service
 */
export const updateAUserService = async (payload: UpdateUserPayload, res: Response) => {
    try {
        const { userId, body } = payload

        const user = await prisma.user.findUnique({
            where: { user_id: userId }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { user_id: userId },
            data: {
                full_name: body.fullName || body.full_name,
                phone: body.phoneNumber || body.phone,
                ...(body.email && { email: body.email.toLowerCase().trim() })
            }
        })

        const { password_hash, reset_token, reset_token_expires, reset_otp, reset_otp_expires, ...userData } = updatedUser

        return {
            success: true,
            message: "User updated successfully",
            data: userData
        }
    } catch (error: any) {
        console.error("Update user error:", error)
        return errorResponseHandler(
            error.message || "Failed to update user",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Delete User Service
 */
export const deleteAUserService = async (userId: string, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { user_id: userId }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Delete user (cascading will handle related records)
        await prisma.user.delete({
            where: { user_id: userId }
        })

        return {
            success: true,
            message: "User deleted successfully"
        }
    } catch (error: any) {
        console.error("Delete user error:", error)
        return errorResponseHandler(
            error.message || "Failed to delete user",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Update Password Service
 */
export const updateAPasswordService = async (payload: UpdatePasswordPayload, res: Response) => {
    try {
        const { userId, body } = payload
        const { currentPassword, newPassword, confirmPassword } = body

        // Validate input
        if (!currentPassword || !newPassword) {
            return errorResponseHandler(
                "Current password and new password are required",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        if (newPassword !== confirmPassword) {
            return errorResponseHandler(
                "Passwords do not match",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        if (newPassword.length < 8) {
            return errorResponseHandler(
                "Password must be at least 8 characters",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        const user = await prisma.user.findUnique({
            where: { user_id: userId }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Verify current password
        const isValidPassword = await comparePassword(currentPassword, user.password_hash)
        if (!isValidPassword) {
            return errorResponseHandler(
                "Current password is incorrect",
                httpStatusCode.UNAUTHORIZED,
                res
            )
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword)

        // Update password
        await prisma.user.update({
            where: { user_id: userId },
            data: {
                password_hash: hashedPassword
            }
        })

        return {
            success: true,
            message: "Password updated successfully"
        }
    } catch (error: any) {
        console.error("Update password error:", error)
        return errorResponseHandler(
            error.message || "Failed to update password",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

// ============================================
// DASHBOARD SERVICE
// ============================================

/**
 * Get Dashboard Stats Service
 */
export const getDashboardStatsService = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser

        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            include: {
                memberships: {
                    include: {
                        tenant: true,
                        event_members: {
                            include: {
                                event: true,
                                contributions: true
                            }
                        }
                    }
                }
            }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Calculate stats
        const totalEvents = user.memberships.reduce((acc, membership) => {
            return acc + membership.event_members.length
        }, 0)

        const totalContributions = user.memberships.reduce((acc, membership) => {
            return acc + membership.event_members.reduce((sum, em) => {
                return sum + em.contributions.reduce((s, c) => s + Number(c.amount), 0)
            }, 0)
        }, 0)

        const pendingPayments = user.memberships.reduce((acc, membership) => {
            return acc + membership.event_members.filter(em => em.status === 'pending').length
        }, 0)

        const stats = {
            totalTenants: user.memberships.length,
            totalEvents,
            totalContributions,
            pendingPayments,
            memberships: user.memberships.map(m => ({
                tenantId: m.tenant_id,
                tenantName: m.tenant.name,
                role: m.role,
                joinedAt: m.joined_at
            }))
        }

        return {
            success: true,
            message: "Dashboard stats fetched successfully",
            data: stats
        }
    } catch (error: any) {
        console.error("Dashboard stats error:", error)
        return errorResponseHandler(
            error.message || "Failed to fetch dashboard stats",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}