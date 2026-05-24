import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import { requireTeacherId } from '../services/accessService.js'
import { ApiError } from '../utils/apiError.js'

const classQuerySchema = z.object({
  classLevel: z.string().optional(),
})

const batchQuerySchema = z.object({
  batchId: z.string().optional(),
})

export const getClassLeaderboard = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const query = classQuerySchema.parse(req.query)

  let classLevel = query.classLevel
  let teacherIdFilter: string | undefined

  if (req.user.role === 'teacher_admin') {
    teacherIdFilter = requireTeacherId(req.user)
  } else if (req.user.role === 'student') {
    const student = await prisma.studentProfile.findUnique({
      where: { id: req.user.studentId },
      select: { classLevel: true },
    })
    classLevel = student?.classLevel
  }

  const submissions = await prisma.submission.findMany({
    where: {
      submittedAt: { not: null },
      student: classLevel ? { classLevel } : undefined,
      test: teacherIdFilter ? { teacherId: teacherIdFilter } : undefined,
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
  })

  const byStudent = new Map<string, { username: string; classLevel: string; obtained: number; max: number }>()

  for (const submission of submissions) {
    const existing = byStudent.get(submission.studentId) ?? {
      username: submission.student.user.username,
      classLevel: submission.student.classLevel,
      obtained: 0,
      max: 0,
    }
    existing.obtained += submission.scoreTotal ?? 0
    existing.max += submission.maxScore ?? 0
    byStudent.set(submission.studentId, existing)
  }

  const leaderboard = [...byStudent.entries()]
    .map(([studentId, stats]) => ({
      studentId,
      username: stats.username,
      classLevel: stats.classLevel,
      normalizedScore: stats.max === 0 ? 0 : Number((stats.obtained / stats.max).toFixed(4)),
    }))
    .sort((left, right) => right.normalizedScore - left.normalizedScore)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }))

  res.json({
    success: true,
    data: leaderboard,
  })
}

export const getBatchLeaderboard = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const query = batchQuerySchema.parse(req.query)
  let allowedBatchIds: string[] | undefined
  let teacherIdFilter: string | undefined

  if (req.user.role === 'teacher_admin') {
    teacherIdFilter = requireTeacherId(req.user)
  }

  if (req.user.role === 'student') {
    const studentBatchLinks = await prisma.batchStudent.findMany({
      where: { studentId: req.user.studentId },
      select: { batchId: true },
    })
    allowedBatchIds = studentBatchLinks.map((link) => link.batchId)
  }

  const batchFilter = query.batchId
    ? [query.batchId]
    : allowedBatchIds && allowedBatchIds.length > 0
      ? allowedBatchIds
      : undefined

  const submissions = await prisma.submission.findMany({
    where: {
      submittedAt: { not: null },
      test: teacherIdFilter ? { teacherId: teacherIdFilter } : undefined,
      student: batchFilter
        ? {
            batchLinks: {
              some: {
                batchId: { in: batchFilter },
              },
            },
          }
        : undefined,
    },
    include: {
      student: {
        include: {
          batchLinks: {
            include: {
              batch: true,
            },
          },
        },
      },
    },
  })

  const byBatch = new Map<string, { name: string; medium: string; obtained: number; max: number }>()

  for (const submission of submissions) {
    for (const batchLink of submission.student.batchLinks) {
      if (teacherIdFilter && batchLink.batch.teacherId !== teacherIdFilter) {
        continue
      }
      if (batchFilter && !batchFilter.includes(batchLink.batchId)) {
        continue
      }

      const existing = byBatch.get(batchLink.batchId) ?? {
        name: batchLink.batch.name,
        medium: batchLink.batch.medium,
        obtained: 0,
        max: 0,
      }
      existing.obtained += submission.scoreTotal ?? 0
      existing.max += submission.maxScore ?? 0
      byBatch.set(batchLink.batchId, existing)
    }
  }

  const leaderboard = [...byBatch.entries()]
    .map(([batchId, stats]) => ({
      batchId,
      name: stats.name,
      medium: stats.medium,
      averageNormalizedScore: stats.max === 0 ? 0 : Number((stats.obtained / stats.max).toFixed(4)),
    }))
    .sort((left, right) => right.averageNormalizedScore - left.averageNormalizedScore)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }))

  res.json({
    success: true,
    data: leaderboard,
  })
}

export const getGamifiedLeaderboard = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { subject, classLevel } = z.object({
    subject: z.enum(['overall', 'PHYSICS', 'CHEMISTRY', 'MATHEMATICS']).optional().default('overall'),
    classLevel: z.string().optional(),
  }).parse(req.query)

  let filterClassLevel = classLevel
  if (req.user.role === 'student' && !filterClassLevel) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: req.user.studentId },
      select: { classLevel: true },
    })
    filterClassLevel = student?.classLevel
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      classLevel: filterClassLevel ? filterClassLevel : undefined,
    },
    include: {
      user: {
        select: {
          username: true,
          fullName: true,
        },
      },
      achievements: {
        select: { achievementType: true },
      },
      StudentMedal: {
        select: { medalName: true, medalType: true, subject: true },
      },
    },
  })

  // Medal tier ordering for top-tier display
  const MEDAL_TIER_ORDER: Record<string, number> = { PLATINUM: 4, GOLD: 3, SILVER: 2, BRONZE: 1 }

  // Flair badge definitions — priority order (highest priority first)
  const FLAIR_BADGES: Array<{
    achievementType?: string
    label: string
    icon: string
    color: string
    check: (achievementSet: Set<string>, medalSet: Set<string>, streakCount: number) => boolean
  }> = [
    {
      achievementType: 'MARATHON_RUNNER',
      label: 'Marathon Runner',
      icon: '🏃',
      color: 'purple',
      check: (a) => a.has('MARATHON_RUNNER'),
    },
    {
      achievementType: 'MANIAC',
      label: 'Maniac',
      icon: '🔥',
      color: 'orange',
      check: (a) => a.has('MANIAC'),
    },
    {
      achievementType: 'EPIC_COMEBACK',
      label: 'Epic Comeback',
      icon: '⚡',
      color: 'yellow',
      check: (a) => a.has('EPIC_COMEBACK'),
    },
    {
      achievementType: 'TRIPLE_CROWN',
      label: 'Triple Crown',
      icon: '👑',
      color: 'gold',
      check: (a) => a.has('TRIPLE_CROWN'),
    },
    {
      achievementType: 'ACCURACY_CHAMPION',
      label: 'Accuracy Champion',
      icon: '🎯',
      color: 'blue',
      check: (a) => a.has('ACCURACY_CHAMPION'),
    },
    {
      achievementType: 'PERFECTIONIST',
      label: 'Perfectionist',
      icon: '⭐',
      color: 'gold',
      check: (a) => a.has('PERFECTIONIST'),
    },
    {
      achievementType: 'COMEBACK_KID',
      label: 'Comeback Kid',
      icon: '📈',
      color: 'green',
      check: (a) => a.has('COMEBACK_KID'),
    },
    {
      achievementType: 'CENTURION',
      label: 'Centurion',
      icon: '💯',
      color: 'silver',
      check: (a) => a.has('CENTURION'),
    },
    {
      achievementType: 'KNOWLEDGE_SEEKER',
      label: 'Knowledge Seeker',
      icon: '📚',
      color: 'teal',
      check: (a) => a.has('KNOWLEDGE_SEEKER'),
    },
    {
      label: 'Streak ≥5',
      icon: '🔥',
      color: 'red',
      check: (_a, _m, streakCount) => streakCount >= 5,
    },
  ]

  type StudentWithRelations = typeof students[number]
  let sortFn = (a: StudentWithRelations, b: StudentWithRelations) => b.totalXP - a.totalXP
  if (subject === 'PHYSICS') {
    sortFn = (a: StudentWithRelations, b: StudentWithRelations) => b.physicsXp - a.physicsXp
  } else if (subject === 'CHEMISTRY') {
    sortFn = (a: StudentWithRelations, b: StudentWithRelations) => b.chemistryXp - a.chemistryXp
  } else if (subject === 'MATHEMATICS') {
    sortFn = (a: StudentWithRelations, b: StudentWithRelations) => b.mathematicsXp - a.mathematicsXp
  }

  const LEVEL_NAMES = [
    'Novice', 'Apprentice', 'Scholar', 'Adept', 'Expert',
    'Virtuoso', 'Sage', 'Master', 'Grand Master', 'Legend', 'Transcendent',
  ]
  const getLevelName = (level: number) => {
    if (level <= 0) return LEVEL_NAMES[0]
    if (level <= LEVEL_NAMES.length) return LEVEL_NAMES[level - 1]
    return LEVEL_NAMES[LEVEL_NAMES.length - 1]
  }

  const sorted = [...students]
    .sort(sortFn)
    .map((student, idx) => {
      const achievementSet = new Set(student.achievements.map((a) => a.achievementType))
      const medalSet = new Set(student.StudentMedal.map((m) => `${m.medalName}_${m.medalType}_${m.subject}`))

      // Calculate top medal tier
      const tierValues = student.StudentMedal.map((m) => MEDAL_TIER_ORDER[m.medalType] ?? 0)
      const topTierValue = tierValues.length > 0 ? Math.max(...tierValues) : 0
      const topMedalTier = Object.entries(MEDAL_TIER_ORDER).find(([, v]) => v === topTierValue)?.[0] ?? null

      // Build flair badges (max 3)
      const flair = FLAIR_BADGES
        .filter((badge) => badge.check(achievementSet, medalSet, student.streakCount))
        .slice(0, 3)
        .map((badge) => ({
          id: badge.achievementType ?? badge.label,
          icon: badge.icon,
          label: badge.label,
          color: badge.color,
        }))

      return {
        rank: idx + 1,
        studentId: student.id,
        username: student.user.username,
        fullName: student.user.fullName || student.user.username,
        xp: subject === 'overall' ? student.totalXP
          : subject === 'PHYSICS' ? student.physicsXp
          : subject === 'CHEMISTRY' ? student.chemistryXp
          : student.mathematicsXp,
        level: student.currentLevel,
        levelName: getLevelName(student.currentLevel),
        streakCount: student.streakCount,
        topMedalTier,
        flair,
        achievementCount: student.achievements.length,
        medalCount: student.StudentMedal.length,
      }
    })

  res.json({
    success: true,
    data: sorted,
  })
}

