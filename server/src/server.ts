import { env } from './config/env.js'
import { prisma } from './prisma/client.js'
import { app } from './app.js'

const server = app.listen(env.PORT, () => {
  console.log(`VidyaVault API running on http://localhost:${env.PORT}`)
})

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGTERM', () => {
  void shutdown()
})
process.on('SIGINT', () => {
  void shutdown()
})
