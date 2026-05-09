import { prisma } from './src/prisma/client.js'

async function check() {
  try {
    const userCount = await prisma.user.count()
    console.log('User count:', userCount)
    
    const superadmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' }
    })
    console.log('Superadmin found:', !!superadmin)
    
    if (superadmin) {
      console.log('Superadmin ID:', superadmin.id)
    }

    // Check columns
    try {
      await prisma.$queryRaw`SELECT subjects FROM "StudentProfile" LIMIT 1`
      console.log('StudentProfile has subjects column')
    } catch (e) {
      console.log('StudentProfile MISSING subjects column')
    }

    try {
      await prisma.$queryRaw`SELECT "shortId" FROM "StudentProfile" LIMIT 1`
      console.log('StudentProfile has shortId column')
    } catch (e) {
      console.log('StudentProfile MISSING shortId column')
    }

  } catch (err) {
    console.error('Check failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

check()
