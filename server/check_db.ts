import { prisma } from './src/prisma/client.js'

async function check() {
  try {
    const result = await prisma.$queryRaw`SELECT enum_range(NULL::"Subject")`
    console.log('Subject enum values:', result)
    
    const roleResult = await prisma.$queryRaw`SELECT enum_range(NULL::"UserRole")`
    console.log('UserRole enum values:', roleResult)

  } catch (err) {
    console.error('Check failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

check()
