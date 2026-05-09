import { RequestStatus, UserRole } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import { generateLongId, generateShortId } from '../utils/idGenerator.js'
import { ApiError } from '../utils/apiError.js'

const approveRequestSchema = z.object({
  batchNo: z.string().min(1),
  teacherId: z.string().min(1),
})

export const getPendingRequests = async (_req: Request, res: Response): Promise<void> => {
  const requests = await prisma.registrationRequest.findMany({
    where: { status: RequestStatus.PENDING },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: requests,
  })
}

export const approveRequest = async (req: Request, res: Response): Promise<void> => {
  const { requestId } = z.object({ requestId: z.string() }).parse(req.params)
  const { batchNo, teacherId } = approveRequestSchema.parse(req.body)

  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
  })

  if (!request || request.status !== RequestStatus.PENDING) {
    throw new ApiError('Valid pending registration request not found', 404)
  }

  // 1. Check for teacher
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
  })
  if (!teacher) {
    throw new ApiError('Teacher not found', 404)
  }

  // 2. Start Transaction
  const result = await prisma.$transaction(async (tx) => {
    // 3. Get next overall serial
    // The user wants it to start after test students. We'll find max or start from 50.
    const maxSerial = await tx.studentProfile.aggregate({
      _max: { overallSerial: true },
    })
    const nextSerial = Math.max((maxSerial._max.overallSerial || 0) + 1, 50)

    // 4. Get next batch serial no
    const maxBatchSerial = await tx.studentProfile.aggregate({
      where: { batchNo },
      _max: { batchSerialNo: true },
    })
    const nextBatchSerial = (maxBatchSerial._max.batchSerialNo || 0) + 1

    // 5. Generate IDs
    const shortId = generateShortId({
      overallSerial: nextSerial,
      classLevel: request.classLevel,
      medium: request.medium,
      year: request.year,
    })

    const longId = generateLongId({
      overallSerial: nextSerial,
      subjects: request.subjects,
      classLevel: request.classLevel,
      medium: request.medium,
      batchNo: batchNo,
      year: request.year,
      batchSerialNo: nextBatchSerial,
    })

    // 6. Create User (password will be set by student later)
    // For now, we create a placeholder passwordHash or leave it empty if possible (but schema says string)
    // Actually, the requirement says student is prompted to set password AFTER approval.
    // So we can set a dummy one or handle it in a "setup" phase.
    const user = await tx.user.create({
      data: {
        username: shortId, // Short ID is the username
        passwordHash: 'PENDING_SETUP', // Placeholder
        role: UserRole.STUDENT,
        forcePasswordChange: true,
      },
    })

    // 7. Create Student Profile
    await tx.studentProfile.create({
      data: {
        userId: user.id,
        board: 'WEST_BENGAL', // Default or from request if added
        medium: request.medium,
        classLevel: request.classLevel,
        phone: request.phone,
        overallSerial: nextSerial,
        shortId: shortId,
        longId: longId,
        batchNo: batchNo,
        batchSerialNo: nextBatchSerial,
        year: request.year,
        subjects: request.subjects,
        teacherLinks: {
          create: { teacherId },
        },
      },
    })

    // 8. Update Request status
    await tx.registrationRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.APPROVED },
    })

    return { shortId, longId }
  })

  res.json({
    success: true,
    data: result,
  })
}

export const declineRequest = async (req: Request, res: Response): Promise<void> => {
  const { requestId } = z.object({ requestId: z.string() }).parse(req.params)

  await prisma.registrationRequest.update({
    where: { id: requestId },
    data: { status: RequestStatus.DECLINED },
  })

  res.json({
    success: true,
    data: { message: 'Request declined' },
  })
}
