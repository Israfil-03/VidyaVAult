import { RewardCycleStatus, Subject } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import { calculateAndPersistRewardCycle } from '../services/rewardService.js'
import { ApiError } from '../utils/apiError.js'

const createCycleSchema = z.object({
  teacherId: z.string().optional(),
  subject: z.nativeEnum(Subject),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
})

const getCycleScopeTeacherId = (req: Request, providedTeacherId?: string): string => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  if (req.user.role === 'teacher_admin') {
    if (!req.user.teacherId) {
      throw new ApiError('Teacher scope missing', 403)
    }
    return req.user.teacherId
  }

  if (req.user.role === 'superadmin') {
    if (!providedTeacherId) {
      throw new ApiError('teacherId is required', 400)
    }
    return providedTeacherId
  }

  throw new ApiError('Forbidden', 403)
}

export const createRewardCycle = async (req: Request, res: Response): Promise<void> => {
  const payload = createCycleSchema.parse(req.body)
  const teacherId = getCycleScopeTeacherId(req, payload.teacherId)

  if (payload.periodEnd <= payload.periodStart) {
    throw new ApiError('periodEnd must be after periodStart', 400)
  }

  const cycle = await prisma.rewardCycle.create({
    data: {
      teacherId,
      subject: payload.subject,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      status: RewardCycleStatus.ACTIVE,
    },
  })

  res.status(201).json({
    success: true,
    data: cycle,
  })
}

export const listRewardCycles = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const teacherId =
    req.user.role === 'teacher_admin'
      ? req.user.teacherId
      : typeof req.query.teacherId === 'string'
        ? req.query.teacherId
        : undefined

  const cycles = await prisma.rewardCycle.findMany({
    where: { teacherId },
    include: {
      teacher: {
        include: {
          user: {
            select: { username: true },
          },
        },
      },
      results: {
        include: {
          batch: true,
        },
      },
    },
    orderBy: { periodStart: 'desc' },
  })

  res.json({
    success: true,
    data: cycles,
  })
}

export const closeAndCalculateRewardCycle = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { rewardCycleId } = z.object({ rewardCycleId: z.string().min(1) }).parse(req.params)
  const cycle = await prisma.rewardCycle.findUnique({ where: { id: rewardCycleId } })

  if (!cycle) {
    throw new ApiError('Reward cycle not found', 404)
  }

  if (req.user.role === 'teacher_admin' && req.user.teacherId !== cycle.teacherId) {
    throw new ApiError('Forbidden', 403)
  }

  const result = await calculateAndPersistRewardCycle(rewardCycleId)

  res.json({
    success: true,
    data: result,
  })
}
