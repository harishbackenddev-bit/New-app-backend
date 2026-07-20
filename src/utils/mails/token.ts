import { customAlphabet } from "nanoid";
import prisma from "../../lib/prisma";

export const generatePasswordResetToken = async (email: string) => {
  const genId = customAlphabet('0123456789', 6);
  const token = genId();
  const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

  // Delete existing token for this email
  await prisma.passwordResetToken.deleteMany({
    where: { email: email }
  });

  // Create new token
  const newPasswordResetToken = await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expires
    }
  });

  return newPasswordResetToken;
}

export const getPasswordResetTokenByToken = async (token: string) => {
  try {
    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });
    return passwordResetToken;
  } catch (error) {
    return null;
  }
}

export const getPasswordResetTokenByEmail = async (email: string) => {
  try {
    const passwordResetToken = await prisma.passwordResetToken.findFirst({
      where: { email: email }
    });
    return passwordResetToken;
  } catch (error) {
    return null;
  }
}

export const deletePasswordResetToken = async (token: string) => {
  try {
    await prisma.passwordResetToken.delete({
      where: { token }
    });
    return true;
  } catch (error) {
    return false;
  }
}

export const deletePasswordResetTokenByEmail = async (email: string) => {
  try {
    await prisma.passwordResetToken.deleteMany({
      where: { email: email }
    });
    return true;
  } catch (error) {
    return false;
  }
}

export const generatePasswordResetTokenByPhone = async (phoneNumber: string) => {
  const genId = customAlphabet('0123456789', 6);
  const token = genId();
  const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

  // Delete existing token for this phone number
  await prisma.passwordResetToken.deleteMany({
    where: { phoneNumber: phoneNumber }
  });

  // Create new token
  const newPasswordResetToken = await prisma.passwordResetToken.create({
    data: {
      phoneNumber,
      token,
      expires
    }
  });

  return newPasswordResetToken;
}

// Check if token is expired
export const isTokenExpired = (expires: Date): boolean => {
  return new Date() > expires;
}

// Verify token and get associated user
export const verifyPasswordResetToken = async (token: string) => {
  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetToken) {
      return { valid: false, error: 'Token not found' };
    }

    if (isTokenExpired(resetToken.expires)) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { token }
      });
      return { valid: false, error: 'Token expired' };
    }

    // Find user by email or phone
    let user = null;
    if (resetToken.email) {
      user = await prisma.user.findUnique({
        where: { email: resetToken.email }
      });
    } else if (resetToken.phoneNumber) {
      user = await prisma.user.findFirst({
        where: { phone: resetToken.phoneNumber }
      });
    }

    return { valid: true, user, token: resetToken };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
}