// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// For Prisma 7, we need to pass adapter or use default
const prisma = new PrismaClient({
  // No adapter needed for local PostgreSQL
  // Just use default configuration
})

export default prisma