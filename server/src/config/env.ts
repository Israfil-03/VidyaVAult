import 'dotenv/config'

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  GEMINI_API_KEY: z.string().optional(),
  INTERNAL_AI_TOKEN: z.string().default('dev-internal-ai-token'),
  SUPERADMIN_EMAIL: z.string().email().default('israfilhoque523@gmail.com'),
  SUPERADMIN_PASSWORD: z.string().min(8).default('Israfil@860974'),
  SUPERADMIN_USERNAME: z.string().min(3).default('superadmin'),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:', parsedEnv.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsedEnv.data
