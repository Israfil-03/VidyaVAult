import { Medium, RewardCycleStatus, StudentBadgeType } from '@prisma/client'

import { prisma } from '../prisma/client.js'
import { ApiError } from '../utils/apiError.js'

export const MIN_TESTS_PER_STUDENT = 1
export const MIN_ACTIVE_STUDENTS_PER_BATCH = 1

export interface BatchSubmissionRow {
  batchId: string
  studentId: string
  scoreTotal: number
  maxScore: number
}

export interface StudentCycleScore {
  studentId: string
  normalizedScore: number
  testsAttempted: number
}

export interface BatchCycleScore {
  batchId: string
  averageNormalizedScore: number
  eligibleStudentCount: number
  eligible: boolean
  studentScores: StudentCycleScore[]
  improvementScore: number
}

const roundTo4 = (value: number): number => Math.round(value * 10_000) / 10_000

export const aggregateBatchScores = (
  rows: BatchSubmissionRow[],
  minTestsPerStudent = MIN_TESTS_PER_STUDENT,
  minActiveStudentsPerBatch = MIN_ACTIVE_STUDENTS_PER_BATCH,
): BatchCycleScore[] => {
  const byBatch = new Map<string, Map<string, { obtained: number; max: number; tests: number }>>()

  for (const row of rows) {
    const students = byBatch.get(row.batchId) ?? new Map<string, { obtained: number; max: number; tests: number }>()
    const existing = students.get(row.studentId) ?? { obtained: 0, max: 0, tests: 0 }
    existing.obtained += row.scoreTotal
    existing.max += row.maxScore
    existing.tests += 1
    students.set(row.studentId, existing)
    byBatch.set(row.batchId, students)
  }

  const result: BatchCycleScore[] = []

  for (const [batchId, students] of byBatch.entries()) {
    const eligibleStudents: StudentCycleScore[] = []

    for (const [studentId, totals] of students.entries()) {
      if (totals.tests < minTestsPerStudent || totals.max <= 0) {
        continue
      }
      eligibleStudents.push({
        studentId,
        normalizedScore: totals.obtained / totals.max,
        testsAttempted: totals.tests,
      })
    }

    const averageNormalizedScore =
      eligibleStudents.length === 0
        ? 0
        : eligibleStudents.reduce((sum, value) => sum + value.normalizedScore, 0) /
          eligibleStudents.length

    result.push({
      batchId,
      averageNormalizedScore: roundTo4(averageNormalizedScore),
      eligibleStudentCount: eligibleStudents.length,
      eligible: eligibleStudents.length >= minActiveStudentsPerBatch,
      studentScores: eligibleStudents
        .sort((left, right) => right.normalizedScore - left.normalizedScore)
        .map((entry) => ({
          ...entry,
          normalizedScore: roundTo4(entry.normalizedScore),
        })),
      improvementScore: 0,
    })
  }

  return result.sort((left, right) => right.averageNormalizedScore - left.averageNormalizedScore)
}

export const applyImprovementScores = (
  current: BatchCycleScore[],
  previousAverageByBatch: Map<string, number>,
): BatchCycleScore[] =>
  current.map((batch) => ({
    ...batch,
    improvementScore: roundTo4(
      batch.averageNormalizedScore - (previousAverageByBatch.get(batch.batchId) ?? 0),
    ),
  }))

export const determineRewardWinners = (
  batches: BatchCycleScore[],
): { winnerBatchId?: string; mostImprovedBatchId?: string } => {
  const eligible = batches.filter((batch) => batch.eligible)
  const winnerBatchId = eligible[0]?.batchId

  const mostImproved = [...eligible].sort((left, right) => right.improvementScore - left.improvementScore)

  return {
    winnerBatchId,
    mostImprovedBatchId: mostImproved[0]?.batchId,
  }
}

export const calculateAndPersistRewardCycle = async (rewardCycleId: string) => {
  const cycle = await prisma.rewardCycle.findUnique({
    where: { id: rewardCycleId },
  })

  if (!cycle) {
    throw new ApiError('Reward cycle not found', 404)
  }

  const tests = await prisma.test.findMany({
    where: {
      teacherId: cycle.teacherId,
      subject: cycle.subject,
      startTime: { gte: cycle.periodStart },
      endTime: { lte: cycle.periodEnd },
    },
    select: { id: true },
  })

  const testIds = tests.map((test) => test.id)

  const submissions =
    testIds.length === 0
      ? []
      : await prisma.submission.findMany({
          where: {
            testId: { in: testIds },
            submittedAt: { not: null },
          },
          select: {
            studentId: true,
            scoreTotal: true,
            maxScore: true,
            student: {
              select: {
                batchLinks: {
                  where: {
                    batch: {
                      teacherId: cycle.teacherId,
                      medium: { in: [Medium.ENGLISH, Medium.BENGALI] },
                    },
                  },
                  select: {
                    batchId: true,
                  },
                },
              },
            },
          },
        })

  const scoreRows: BatchSubmissionRow[] = submissions
    .map((submission) => {
      const batchId = submission.student.batchLinks[0]?.batchId
      if (!batchId || submission.maxScore === null || submission.maxScore <= 0) {
        return null
      }

      return {
        batchId,
        studentId: submission.studentId,
        scoreTotal: submission.scoreTotal ?? 0,
        maxScore: submission.maxScore,
      }
    })
    .filter((entry): entry is BatchSubmissionRow => entry !== null)

  const currentScores = aggregateBatchScores(scoreRows)

  const previousCycle = await prisma.rewardCycle.findFirst({
    where: {
      teacherId: cycle.teacherId,
      subject: cycle.subject,
      status: RewardCycleStatus.COMPLETED,
      periodEnd: { lt: cycle.periodStart },
    },
    orderBy: { periodEnd: 'desc' },
    include: {
      results: true,
    },
  })

  const previousAverageByBatch = new Map<string, number>(
    (previousCycle?.results ?? []).map((result) => [result.batchId, result.averageNormalizedScore]),
  )

  const scoredWithImprovements = applyImprovementScores(currentScores, previousAverageByBatch)
  const winners = determineRewardWinners(scoredWithImprovements)

  await prisma.$transaction(async (tx) => {
    await tx.batchRewardResult.deleteMany({ where: { rewardCycleId } })

    if (scoredWithImprovements.length > 0) {
      await tx.batchRewardResult.createMany({
        data: scoredWithImprovements.map((score) => ({
          rewardCycleId,
          batchId: score.batchId,
          averageNormalizedScore: score.averageNormalizedScore,
          improvementScore: score.improvementScore,
          isWinner: winners.winnerBatchId === score.batchId,
          isMostImproved: winners.mostImprovedBatchId === score.batchId,
        })),
      })
    }

    await tx.rewardCycle.update({
      where: { id: rewardCycleId },
      data: { status: RewardCycleStatus.COMPLETED },
    })

    const periodStudentIds = [...new Set(scoredWithImprovements.flatMap((item) => item.studentScores.map((s) => s.studentId)))]

    if (periodStudentIds.length > 0) {
      await tx.studentBadge.deleteMany({
        where: {
          studentId: { in: periodStudentIds },
          periodStart: cycle.periodStart,
          periodEnd: cycle.periodEnd,
        },
      })
    }

    const winnerBatch = scoredWithImprovements.find((entry) => entry.batchId === winners.winnerBatchId)
    if (winnerBatch) {
      const topStudents = winnerBatch.studentScores.slice(0, 3)
      if (topStudents.length > 0) {
        await tx.studentBadge.createMany({
          data: topStudents.map((student, index) => ({
            studentId: student.studentId,
            type: StudentBadgeType.SUBJECT_STAR,
            periodStart: cycle.periodStart,
            periodEnd: cycle.periodEnd,
            description: `Top performer #${index + 1} in winning batch`,
          })),
        })
      }
    }

    const improvedBatch = scoredWithImprovements.find(
      (entry) => entry.batchId === winners.mostImprovedBatchId,
    )
    if (improvedBatch) {
      const improvedStudents = improvedBatch.studentScores.slice(0, 3)
      if (improvedStudents.length > 0) {
        await tx.studentBadge.createMany({
          data: improvedStudents.map((student, index) => ({
            studentId: student.studentId,
            type: StudentBadgeType.TOP_IMPROVER,
            periodStart: cycle.periodStart,
            periodEnd: cycle.periodEnd,
            description: `Most improved batch contributor #${index + 1}`,
          })),
        })
      }
    }
  })

  const persistedCycle = await prisma.rewardCycle.findUnique({
    where: { id: rewardCycleId },
    include: {
      results: {
        include: {
          batch: {
            select: { id: true, name: true, medium: true },
          },
        },
      },
    },
  })

  return {
    rewardCycleId,
    status: RewardCycleStatus.COMPLETED,
    winnerBatchId: winners.winnerBatchId,
    mostImprovedBatchId: winners.mostImprovedBatchId,
    results: persistedCycle?.results ?? [],
    // TODO: Move reward rules to DB-backed configuration table for runtime adjustability.
  }
}
