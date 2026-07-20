import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { customAlphabet } from 'nanoid'

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateNumericOTP = (length: number = 6): string => {
  const alphabet = '0123456789'
  const nanoid = customAlphabet(alphabet, length)
  return nanoid()
}

export const generateAuthToken = (
  payload: Record<string, any>,
  expiresIn: string = '7d'
): string => {
  const secret = process.env.JWT_SECRET as string
  if (!secret) {
    throw new Error('JWT_SECRET is not defined')
  }
  // Explicitly cast expiresIn to any to avoid type issue
  return jwt.sign(payload, secret, { expiresIn } as any)
}

export const verifyToken = (token: string): string | jwt.JwtPayload => {
  const secret = process.env.JWT_SECRET as string
  if (!secret) {
    throw new Error('JWT_SECRET is not defined')
  }
  return jwt.verify(token, secret)
}

export const generateRandomString = (length: number = 32): string => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const nanoid = customAlphabet(alphabet, length)
  return nanoid()
}

export const isOTPExpired = (expiryDate: Date): boolean => {
  return new Date() > expiryDate
}
