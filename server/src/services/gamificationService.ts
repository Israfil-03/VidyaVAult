import { prisma } from '../prisma/client.js'
import { Subject, TestCategory, AchievementType, MedalTier } from '@prisma/client'
import crypto from 'crypto'

export interface AwardXPResult {
  xpEarned: number
  levelUp: boolean
  oldLevel: number
  newLevel: number
  newlyUnlockedAchievements: Array<{
    type: 'ACHIEVEMENT' | 'MEDAL'
    id: string
    title: string
    description: string
    points: number
    icon: string
  }>
}

/**
 * Award XP to a student and check for new achievement or medal unlocks.
 */
export async function awardXPAndCheckAchievements(
  studentId: string,
  testCategory: TestCategory,
  subject: Subject,
  scoreTotal: number,
  maxScore: number
): Promise<AwardXPResult> {
  // 1. Fetch current student stats
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      totalXP: true,
      currentLevel: true,
      streakCount: true,
      physicsXp: true,
      chemistryXp: true,
      mathematicsXp: true,
    },
  })

  if (!student) {
    throw new Error('Student profile not found')
  }

  // 2. Calculate XP earned in this submission
  let baseXP = 30 // Default base XP
  if (testCategory === TestCategory.HOMEWORK) {
    baseXP = 50
  } else if (
    testCategory === TestCategory.WEEKLY_TEST ||
    testCategory === TestCategory.MONTHLY_TEST ||
    testCategory === TestCategory.UNIT_TEST ||
    testCategory === TestCategory.TEST
  ) {
    baseXP = 100
  }

  const scorePercent = maxScore > 0 ? scoreTotal / maxScore : 0
  const performanceXP = Math.round(scorePercent * 100) // E.g., 85% accuracy = +85 XP
  
  // Perfect score bonus (+50 XP)
  const isPerfect = scoreTotal === maxScore && maxScore > 0
  const perfectBonus = isPerfect ? 50 : 0

  // Streak bonus
  let streakBonus = 0
  if (testCategory === TestCategory.HOMEWORK && student.streakCount > 0) {
    if (student.streakCount >= 7) {
      streakBonus = 100
    } else if (student.streakCount >= 5) {
      streakBonus = 50
    } else if (student.streakCount >= 3) {
      streakBonus = 30
    }
  }

  const xpEarned = baseXP + performanceXP + perfectBonus + streakBonus

  // 3. Update overall and subject-specific XP
  const updatedXp = student.totalXP + xpEarned
  const updatedPhysicsXp = student.physicsXp + (subject === Subject.PHYSICS ? xpEarned : 0)
  const updatedChemistryXp = student.chemistryXp + (subject === Subject.CHEMISTRY ? xpEarned : 0)
  const updatedMathematicsXp = student.mathematicsXp + (subject === Subject.MATHEMATICS ? xpEarned : 0)

  // 4. Calculate new level (500 XP per level)
  const newLevel = Math.floor(updatedXp / 500) + 1
  const levelUp = newLevel > student.currentLevel

  // Update profile in DB first, so queries inside achievement triggers reflect recent values
  await prisma.studentProfile.update({
    where: { id: studentId },
    data: {
      totalXP: updatedXp,
      currentLevel: newLevel,
      physicsXp: updatedPhysicsXp,
      chemistryXp: updatedChemistryXp,
      mathematicsXp: updatedMathematicsXp,
    },
  })

  // Ensure StudentLevelProgress exists or is updated
  try {
    await prisma.studentLevelProgress.upsert({
      where: { studentId },
      update: {
        totalXP: updatedXp,
        currentLevel: newLevel,
        levelXP: updatedXp % 500,
        levelThreshold: 500,
        lastLevelUpAt: levelUp ? new Date() : undefined,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        studentId,
        totalXP: updatedXp,
        currentLevel: newLevel,
        levelXP: updatedXp % 500,
        levelThreshold: 500,
        lastLevelUpAt: levelUp ? new Date() : null,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    console.error('Failed to update StudentLevelProgress:', err)
  }

  // 5. Check and unlock achievements & medals
  const newlyUnlockedAchievements: AwardXPResult['newlyUnlockedAchievements'] = []

  // Fetch counts to evaluate conditions
  const submissions = await prisma.submission.findMany({
    where: { studentId, submittedAt: { not: null } },
    include: { test: true },
  })

  const physicsSubmissions = submissions.filter((s) => s.test.subject === Subject.PHYSICS)
  const chemistrySubmissions = submissions.filter((s) => s.test.subject === Subject.CHEMISTRY)
  const mathSubmissions = submissions.filter((s) => s.test.subject === Subject.MATHEMATICS)

  const physicsPracticeCount = physicsSubmissions.filter((s) => s.test.category === TestCategory.PRACTICE).length
  const chemistryPracticeCount = chemistrySubmissions.filter((s) => s.test.category === TestCategory.PRACTICE).length
  const mathPracticeCount = mathSubmissions.filter((s) => s.test.category === TestCategory.PRACTICE).length

  // A. --- Check General Achievements ---
  const unlockedAchievements = await prisma.studentAchievement.findMany({
    where: { studentId },
    select: { achievementType: true },
  })
  const unlockedAchievementSet = new Set(unlockedAchievements.map((a) => a.achievementType))

  const achievementTriggers = [
    {
      type: AchievementType.QUICK_LEARNER,
      title: 'First Step',
      description: 'Completed your first assignment or practice drill on VidyaVault!',
      points: 50,
      icon: 'first_step',
      trigger: () => submissions.length >= 1,
    },
    {
      type: AchievementType.CONSISTENCY_BONUS,
      title: 'Consistent Scholar',
      description: 'Maintained a 3-day streak in daily homework submissions!',
      points: 100,
      icon: 'consistent_scholar',
      trigger: () => student.streakCount >= 3,
    },
    {
      type: AchievementType.STREAK_MILESTONE,
      title: 'Daily Champion',
      description: 'Unstoppable! Reached a 5-day daily homework streak!',
      points: 200,
      icon: 'daily_champion',
      trigger: () => student.streakCount >= 5,
    },
    {
      type: AchievementType.PERFECT_SCORE,
      title: 'Perfect Scholar',
      description: 'Scored 100% accuracy on any test or daily homework set!',
      points: 150,
      icon: 'perfect_scholar',
      trigger: () => isPerfect || submissions.some((s) => s.scoreTotal === s.maxScore && (s.maxScore ?? 0) > 0),
    },
    {
      type: AchievementType.SUBJECT_MASTERY,
      title: 'Academic Titan',
      description: 'Demonstrated outstanding dedication by reaching Level 5!',
      points: 300,
      icon: 'academic_titan',
      trigger: () => newLevel >= 5,
    },
  ]

  for (const item of achievementTriggers) {
    if (!unlockedAchievementSet.has(item.type) && item.trigger()) {
      try {
        await prisma.studentAchievement.create({
          data: {
            studentId,
            achievementType: item.type,
            description: item.description,
            xpRewarded: item.points,
            subject: null,
          },
        })

        // Give additional bonus XP for unlocking achievement!
        await prisma.studentProfile.update({
          where: { id: studentId },
          data: {
            totalXP: { increment: item.points },
            physicsXp: subject === Subject.PHYSICS ? { increment: item.points } : undefined,
            chemistryXp: subject === Subject.CHEMISTRY ? { increment: item.points } : undefined,
            mathematicsXp: subject === Subject.MATHEMATICS ? { increment: item.points } : undefined,
            lastAchievementAt: new Date(),
          },
        })

        newlyUnlockedAchievements.push({
          type: 'ACHIEVEMENT',
          id: item.type,
          title: item.title,
          description: item.description,
          points: item.points,
          icon: item.icon,
        })
      } catch (err) {
        console.warn(`Duplicate achievement unlock caught for ${item.type}:`, err)
      }
    }
  }

  // B. --- Check Subject Medals ---
  const unlockedMedals = await prisma.studentMedal.findMany({
    where: { studentId },
    select: { medalName: true, medalType: true, subject: true },
  })
  const unlockedMedalKeySet = new Set(
    unlockedMedals.map((m) => `${m.medalName}_${m.medalType}_${m.subject}`)
  )

  const medalTriggers = [
    // --- Physics Medals ---
    {
      name: 'Newtonian Pioneer',
      tier: MedalTier.BRONZE,
      subject: Subject.PHYSICS,
      description: 'Submitted your first Physics assignment. Welcome to gravity!',
      points: 50,
      icon: 'newtonian_pioneer',
      trigger: () => subject === Subject.PHYSICS && physicsSubmissions.length >= 1,
    },
    {
      name: 'Galileo\'s Observer',
      tier: MedalTier.SILVER,
      subject: Subject.PHYSICS,
      description: 'Completed 3 stress-free practice drills in Physics!',
      points: 75,
      icon: 'galileos_observer',
      trigger: () => physicsPracticeCount >= 3,
    },
    {
      name: 'Quantum Leap',
      tier: MedalTier.GOLD,
      subject: Subject.PHYSICS,
      description: 'Achieved a perfect score (100%) in a Physics assessment!',
      points: 100,
      icon: 'quantum_leap',
      trigger: () => subject === Subject.PHYSICS && isPerfect,
    },
    {
      name: 'Cosmic Explorer',
      tier: MedalTier.PLATINUM,
      subject: Subject.PHYSICS,
      description: 'Scored 90% or higher on a Weekly or Monthly Physics exam!',
      points: 200,
      icon: 'cosmic_explorer',
      trigger: () =>
        subject === Subject.PHYSICS &&
        scorePercent >= 0.9 &&
        (testCategory === TestCategory.WEEKLY_TEST || testCategory === TestCategory.MONTHLY_TEST),
    },

    // --- Chemistry Medals ---
    {
      name: 'Molecular Apprentice',
      tier: MedalTier.BRONZE,
      subject: Subject.CHEMISTRY,
      description: 'Submitted your first Chemistry assignment. Elements react!',
      points: 50,
      icon: 'molecular_apprentice',
      trigger: () => subject === Subject.CHEMISTRY && chemistrySubmissions.length >= 1,
    },
    {
      name: 'Alchemist\'s Trial',
      tier: MedalTier.SILVER,
      subject: Subject.CHEMISTRY,
      description: 'Completed 3 stress-free practice drills in Chemistry!',
      points: 75,
      icon: 'alchemists_trial',
      trigger: () => chemistryPracticeCount >= 3,
    },
    {
      name: 'Covalent Bond',
      tier: MedalTier.GOLD,
      subject: Subject.CHEMISTRY,
      description: 'Achieved a perfect score (100%) in a Chemistry assessment!',
      points: 100,
      icon: 'covalent_bond',
      trigger: () => subject === Subject.CHEMISTRY && isPerfect,
    },
    {
      name: 'Noble Gas Status',
      tier: MedalTier.PLATINUM,
      subject: Subject.CHEMISTRY,
      description: 'Scored 90% or higher on a Weekly or Monthly Chemistry exam!',
      points: 200,
      icon: 'noble_gas_status',
      trigger: () =>
        subject === Subject.CHEMISTRY &&
        scorePercent >= 0.9 &&
        (testCategory === TestCategory.WEEKLY_TEST || testCategory === TestCategory.MONTHLY_TEST),
    },

    // --- Mathematics Medals ---
    {
      name: 'Arithmetic Ace',
      tier: MedalTier.BRONZE,
      subject: Subject.MATHEMATICS,
      description: 'Submitted your first Mathematics assignment. Geometry and logic await!',
      points: 50,
      icon: 'arithmetic_ace',
      trigger: () => subject === Subject.MATHEMATICS && mathSubmissions.length >= 1,
    },
    {
      name: 'Euler\'s Disciple',
      tier: MedalTier.SILVER,
      subject: Subject.MATHEMATICS,
      description: 'Completed 3 stress-free practice drills in Mathematics!',
      points: 75,
      icon: 'eulers_disciple',
      trigger: () => mathPracticeCount >= 3,
    },
    {
      name: 'Pythagorean Explorer',
      tier: MedalTier.GOLD,
      subject: Subject.MATHEMATICS,
      description: 'Achieved a perfect score (100%) in a Mathematics assessment!',
      points: 100,
      icon: 'pythagorean_explorer',
      trigger: () => subject === Subject.MATHEMATICS && isPerfect,
    },
    {
      name: 'Fields Medalist',
      tier: MedalTier.PLATINUM,
      subject: Subject.MATHEMATICS,
      description: 'Scored 90% or higher on a Weekly or Monthly Math exam!',
      points: 200,
      icon: 'fields_medalist',
      trigger: () =>
        subject === Subject.MATHEMATICS &&
        scorePercent >= 0.9 &&
        (testCategory === TestCategory.WEEKLY_TEST || testCategory === TestCategory.MONTHLY_TEST),
    },
  ]

  for (const item of medalTriggers) {
    const key = `${item.name}_${item.tier}_${item.subject}`
    if (!unlockedMedalKeySet.has(key) && item.trigger()) {
      try {
        await prisma.studentMedal.create({
          data: {
            id: crypto.randomUUID(),
            studentId,
            medalName: item.name,
            medalType: item.tier,
            subject: item.subject,
            description: item.description,
            iconName: item.icon,
          },
        })

        // Give additional bonus XP for unlocking medal!
        await prisma.studentProfile.update({
          where: { id: studentId },
          data: {
            totalXP: { increment: item.points },
            physicsXp: item.subject === Subject.PHYSICS ? { increment: item.points } : undefined,
            chemistryXp: item.subject === Subject.CHEMISTRY ? { increment: item.points } : undefined,
            mathematicsXp: item.subject === Subject.MATHEMATICS ? { increment: item.points } : undefined,
            lastAchievementAt: new Date(),
          },
        })

        newlyUnlockedAchievements.push({
          type: 'MEDAL',
          id: key,
          title: `${item.name} (${item.tier})`,
          description: item.description,
          points: item.points,
          icon: item.icon,
        })
      } catch (err) {
        console.warn(`Duplicate medal unlock caught for ${key}:`, err)
      }
    }
  }

  // Refetch new final level to be exact
  const finalProfile = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { currentLevel: true },
  })

  return {
    xpEarned,
    levelUp: finalProfile ? finalProfile.currentLevel > student.currentLevel : levelUp,
    oldLevel: student.currentLevel,
    newLevel: finalProfile?.currentLevel ?? newLevel,
    newlyUnlockedAchievements,
  }
}
