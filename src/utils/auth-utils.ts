import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { customAlphabet } from 'nanoid'

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(password, salt)
}

/**
 * Compare password with hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash)
}

/**
 * Generate numeric OTP
 */
export const generateNumericOTP = (length: number = 6): string => {
    const alphabet = '0123456789'
    const nanoid = customAlphabet(alphabet, length)
    return nanoid()
}

/**
 * Generate JWT token
 */
export const generateAuthToken = (
    payload: Record<string, any>,
    expiresIn: string = '7d'
): string => {
    return jwt.sign(
        payload,
        process.env.JWT_SECRET as string,
        { expiresIn }
    )
}

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): string | jwt.JwtPayload => {
    return jwt.verify(token, process.env.JWT_SECRET as string)
}

/**
 * Generate random alphanumeric string
 */
export const generateRandomString = (length: number = 32): string => {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    const nanoid = customAlphabet(alphabet, length)
    return nanoid()
}

/**
 * Check if OTP is expired
 */
export const isOTPExpired = (expiryDate: Date): boolean => {
    return new Date() > expiryDate
}