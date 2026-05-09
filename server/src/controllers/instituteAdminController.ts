import {
  Board,
  RequestStatus,
  Subject,
  UserRole,
  type Prisma,
  type RegistrationRequest,
} from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import { generateLongId, generateShortId, getSubjectBatchNo } from '../utils/idGenerator.js'
import { ApiError } from '../utils/apiError.js'

const requestIdParamSchema = z.object({
  requestId: z.string().min(1),
})

const createBatchForApprovalSchema = z.object({
  name: z.string().trim().min(1),
  boardTarget: z.nativeEnum(Board).optional(),
})

const approvalAssignmentSchema = z
  .object({
    subject: z.nativeEnum(Subject),
    teacherId: z.string().min(1),
    batchId: z.string().min(1).optional(),
    createBatch: createBatchForApprovalSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasBatchId = Boolean(value.batchId)
    const hasCreateBatch = Boolean(value.createBatch)

    if (hasBatchId === hasCreateBatch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of batchId or createBatch for each subject assignment',
      })
    }
  })

const approveRequestSchema = z.object({
  assignments: z.array(approvalAssignmentSchema).min(1),
})

type ApprovalAssignment = z.infer<typeof approvalAssignmentSchema>

const getPendingRequestById = async (requestId: string): Promise<RegistrationRequest> => {
  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
  })

  if (!request || request.status !== RequestStatus.PENDING) {
    throw new ApiError('Valid pending registration request not found', 404)
  }

  return request
}

const buildRegistrationPreview = async (
  tx: Prisma.TransactionClient,
  request: RegistrationRequest,
) => {
  const batchNo = getSubjectBatchNo(request.subjects)
  const [maxSerial, maxBatchSerial] = await Promise.all([
    tx.studentProfile.aggregate({
      _max: { overallSerial: true },
    }),
    tx.studentProfile.aggregate({
      where: { batchNo },
      _max: { batchSerialNo: true },
    }),
  ])

  const overallSerial = Math.max((maxSerial._max.overallSerial ?? 0) + 1, 50)
  const batchSerialNo = (maxBatchSerial._max.batchSerialNo ?? 0) + 1

  const shortId = generateShortId({
    overallSerial,
    classLevel: request.classLevel,
    medium: request.medium,
    year: request.year,
  })

  const longId = generateLongId({
    overallSerial,
    subjects: request.subjects,
    classLevel: request.classLevel,
    medium: request.medium,
    batchNo,
    year: request.year,
    batchSerialNo,
  })

  return {
    overallSerial,
    batchSerialNo,
    batchNo,
    shortId,
    longId,
  }
}

const validateApprovalAssignments = async (
  request: RegistrationRequest,
  assignments: ApprovalAssignment[],
): Promise<void> => {
  const requestedSubjects = new Set(request.subjects)
  const uniqueRequestedSubjects = [...requestedSubjects]

  if (assignments.length !== uniqueRequestedSubjects.length) {
    throw new ApiError('Assignments must be provided for every requested subject exactly once', 400)
  }

  const seenSubjects = new Set<Subject>()
  for (const assignment of assignments) {
    if (!requestedSubjects.has(assignment.subject)) {
      throw new ApiError(`Subject ${assignment.subject} is not part of the request`, 400)
    }
    if (seenSubjects.has(assignment.subject)) {
      throw new ApiError(`Duplicate assignment received for subject ${assignment.subject}`, 400)
    }
    seenSubjects.add(assignment.subject)
  }

  const teacherIds = [...new Set(assignments.map((assignment) => assignment.teacherId))]
  const teachers = await prisma.teacherProfile.findMany({
    where: { id: { in: teacherIds } },
    select: {
      id: true,
      subject: true,
    },
  })

  if (teachers.length !== teacherIds.length) {
    throw new ApiError('One or more selected teachers are invalid', 400)
  }

  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]))
  for (const assignment of assignments) {
    const teacher = teacherById.get(assignment.teacherId)
    if (!teacher) {
      throw new ApiError('Teacher selection is invalid', 400)
    }
    if (teacher.subject !== assignment.subject) {
      throw new ApiError(
        `Teacher selected for ${assignment.subject} does not teach that subject`,
        400,
      )
    }
  }

  const assignmentsWithBatchId = assignments.filter(
    (assignment): assignment is ApprovalAssignment & { batchId: string } => Boolean(assignment.batchId),
  )

  if (assignmentsWithBatchId.length === 0) {
    return
  }

  const batchIds = [...new Set(assignmentsWithBatchId.map((assignment) => assignment.batchId))]
  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds } },
    select: {
      id: true,
      teacherId: true,
      classLevel: true,
      medium: true,
    },
  })

  if (batches.length !== batchIds.length) {
    throw new ApiError('One or more selected batches were not found', 400)
  }

  const batchById = new Map(batches.map((batch) => [batch.id, batch]))

  for (const assignment of assignmentsWithBatchId) {
    const batch = batchById.get(assignment.batchId)
    if (!batch) {
      throw new ApiError('Selected batch was not found', 400)
    }
    if (batch.teacherId !== assignment.teacherId) {
      throw new ApiError(`Selected batch for ${assignment.subject} is not owned by the chosen teacher`, 400)
    }
    if (batch.classLevel !== request.classLevel || batch.medium !== request.medium) {
      throw new ApiError(
        `Selected batch for ${assignment.subject} does not match student's class and medium`,
        400,
      )
    }
  }
}

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

export const listInstituteTeachers = async (_req: Request, res: Response): Promise<void> => {
  const teachers = await prisma.teacherProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json({
    success: true,
    data: teachers.map((teacher) => ({
      id: teacher.id,
      subject: teacher.subject,
      user: {
        id: teacher.user.id,
        username: teacher.user.username,
        email: teacher.user.email,
      },
    })),
  })
}

export const getApprovalOptions = async (req: Request, res: Response): Promise<void> => {
  const { requestId } = requestIdParamSchema.parse(req.params)

  const request = await getPendingRequestById(requestId)

  const teachers = await prisma.teacherProfile.findMany({
    where: {
      subject: {
        in: request.subjects,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      batches: {
        where: {
          classLevel: request.classLevel,
          medium: request.medium,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          classLevel: true,
          medium: true,
          boardTarget: true,
        },
      },
    },
    orderBy: [{ subject: 'asc' }, { createdAt: 'asc' }],
  })

  const optionsBySubject = request.subjects.map((subject) => ({
    subject,
    teachers: teachers
      .filter((teacher) => teacher.subject === subject)
      .map((teacher) => ({
        id: teacher.id,
        subject: teacher.subject,
        user: teacher.user,
        batches: teacher.batches,
      })),
  }))

  res.json({
    success: true,
    data: {
      request,
      subjects: optionsBySubject,
    },
  })
}

export const previewRequestApproval = async (req: Request, res: Response): Promise<void> => {
  const { requestId } = requestIdParamSchema.parse(req.params)
  const request = await getPendingRequestById(requestId)

  const preview = await prisma.$transaction(async (tx) => {
    return buildRegistrationPreview(tx, request)
  })

  res.json({
    success: true,
    data: preview,
  })
}

export const approveRequest = async (req: Request, res: Response): Promise<void> => {
  const { requestId } = requestIdParamSchema.parse(req.params)
  const payload = approveRequestSchema.parse(req.body)
  const request = await getPendingRequestById(requestId)
  await validateApprovalAssignments(request, payload.assignments)

  const result = await prisma.$transaction(async (tx) => {
    const preview = await buildRegistrationPreview(tx, request)

    const assignedBatchIds: string[] = []
    const resolvedAssignments: { subject: Subject; teacherId: string; batchId: string }[] = []
    for (const assignment of payload.assignments) {
      let linkedBatchId = assignment.batchId

      if (!linkedBatchId) {
        if (!assignment.createBatch) {
          throw new ApiError(`Batch configuration missing for subject ${assignment.subject}`, 400)
        }

        const newBatch = await tx.batch.create({
          data: {
            name: assignment.createBatch.name,
            boardTarget: assignment.createBatch.boardTarget,
            classLevel: request.classLevel,
            medium: request.medium,
            teacherId: assignment.teacherId,
          },
        })

        linkedBatchId = newBatch.id
      }

      assignedBatchIds.push(linkedBatchId)
      resolvedAssignments.push({
        subject: assignment.subject,
        teacherId: assignment.teacherId,
        batchId: linkedBatchId,
      })
    }

    const teacherIds = [...new Set(payload.assignments.map((assignment) => assignment.teacherId))]
    const uniqueBatchIds = [...new Set(assignedBatchIds)]

    const user = await tx.user.create({
      data: {
        username: preview.shortId,
        passwordHash: 'PENDING_SETUP',
        role: UserRole.STUDENT,
        forcePasswordChange: true,
      },
    })

    await tx.studentProfile.create({
      data: {
        userId: user.id,
        board: 'WEST_BENGAL',
        medium: request.medium,
        classLevel: request.classLevel,
        phone: request.phone,
        overallSerial: preview.overallSerial,
        shortId: preview.shortId,
        longId: preview.longId,
        batchNo: preview.batchNo,
        batchSerialNo: preview.batchSerialNo,
        year: request.year,
        subjects: request.subjects,
        teacherLinks: {
          createMany: {
            data: teacherIds.map((teacherId) => ({ teacherId })),
            skipDuplicates: true,
          },
        },
        batchLinks: {
          createMany: {
            data: uniqueBatchIds.map((batchId) => ({ batchId })),
            skipDuplicates: true,
          },
        },
      },
    })

    await tx.registrationRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.APPROVED },
    })

    return {
      ...preview,
      assignments: resolvedAssignments,
    }
  })

  res.json({
    success: true,
    data: result,
  })
}

export const declineRequest = async (req: Request, res: Response): Promise<void> => {
  const { requestId } = requestIdParamSchema.parse(req.params)

  await prisma.registrationRequest.update({
    where: { id: requestId },
    data: { status: RequestStatus.DECLINED },
  })

  res.json({
    success: true,
    data: { message: 'Request declined' },
  })
}
