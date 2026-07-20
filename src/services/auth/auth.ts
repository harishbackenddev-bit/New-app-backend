import { User } from '@prisma/client'

export interface SignupPayload {
  email: string
  password: string
  fullName?: string
  phoneNumber?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface VerifyOTPPayload {
  email: string
  otp: string
}

export interface ResetPasswordWithOTPPayload {
  email: string
  otp: string
  newPassword: string
  confirmPassword: string
}

export interface ResetPasswordWithTokenPayload {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface UserDataPayload {
  userId: string
}

export interface AuthResponse {
  success: boolean
  message: string
  token?: string
  user?: Omit<User, 'password_hash' | 'reset_token' | 'reset_token_expires' | 'reset_otp' | 'reset_otp_expires'>
  data?: any
  reset_token?: string
}

export interface ServiceResponse {
  success: boolean
  message: string
  [key: string]: any
}