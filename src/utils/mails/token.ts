import { customAlphabet } from "nanoid";
import prisma from "../../lib/prisma";

export const generatePasswordResetToken = async (email: string) => {
  const genId = customAlphabet('0123456789', 6);
  const token = genId();
  const expires = new Date(new Date().getTime() + 3600 * 1000);

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
    const passwordResetToken = await prisma.passwordResetToken.findFirst({
      where: { token: token }
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
    await prisma.passwordResetToken.deleteMany({
      where: { token: token }
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
  const expires = new Date(new Date().getTime() + 3600 * 1000);

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

export const isTokenExpired = (expires: Date): boolean => {
  return new Date() > expires;
}

export const verifyPasswordResetToken = async (token: string) => {
  try {
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { token: token }
    });

    if (!resetToken) {
      return { valid: false, error: 'Token not found' };
    }

    if (isTokenExpired(resetToken.expires)) {
      await prisma.passwordResetToken.deleteMany({
        where: { token: token }
      });
      return { valid: false, error: 'Token expired' };
    }

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