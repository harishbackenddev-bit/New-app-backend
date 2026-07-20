import twilio from 'twilio'
import prisma from '../../lib/prisma'
import { generatePasswordResetTokenByPhone } from '../mails/token'

export const generatePasswordResetTokenByPhoneWithTwilio = async (phoneNumber: string) => {
  const token = await generatePasswordResetTokenByPhone(phoneNumber);
  // Send SMS with twilio
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const message = await client.messages.create({
      body: `Your password reset token is: ${token.token}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    return { success: true, token, message };
  } catch (error) {
    console.error('SMS send error:', error);
    throw error;
  }
}