import { prisma } from '../prisma/client.js'
import { Subject, TestCategory, AchievementType, MedalTier } from '@prisma/client'
import crypto from 'crypto'

export interface AwardXPResult {
  xpEarned: number
  levelUp: boolean
  oldLevel: number
  newLevel: number
  oldLevelName: string
  newLevelName: string
  newlyUnlockedAchievements: Array<{
    type: 'ACHIEVEMENT' | 'MEDAL'
    id: string
    title: string
    description: string
    points: number
    icon: string
  }>
}

// ─── Level System ────────────────────────────────────────────────────────────

/** XP thresholds: total XP needed to reach this level */
const LEVEL_THRESHOLDS: number[] = [
  0,      // Level 1 — Novice
  300,    // Level 2 — Apprentice
  700,    // Level 3 — Scholar
  1300,   // Level 4 — Adept
  2100,   // Level 5 — Expert
  3100,   // Level 6 — Virtuoso
  4300,   // Level 7 — Sage
  5700,   // Level 8 — Master
  7300,   // Level 9 — Grand Master
  9100,   // Level 10 — Legend
]

const LEVEL_NAMES: string[] = [
  'Novice',       // 1
  'Apprentice',   // 2
  'Scholar',      // 3
  'Adept',        // 4
  'Expert',       // 5
  'Virtuoso',     // 6
  'Sage',         // 7
  'Master',       // 8
  'Grand Master', // 9
  'Legend',       // 10
  'Transcendent', // 11+
]

export function getLevelFromXP(totalXP: number): number {
  let level = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= (LEVEL_THRESHOLDS[i] ?? 0)) {
      level = i + 1
      break
    }
  }
  // For XP beyond level 10: each additional level needs 2000 XP more
  const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 9100
  if (totalXP >= lastThreshold) {
    const xpBeyond = totalXP - lastThreshold
    level = LEVEL_THRESHOLDS.length + Math.floor(xpBeyond / 2000)
  }
  return level
}

export function getLevelName(level: number): string {
  if (level <= 0) return LEVEL_NAMES[0] ?? 'Novice'
  if (level <= LEVEL_NAMES.length) return LEVEL_NAMES[level - 1] ?? 'Transcendent'
  return LEVEL_NAMES[LEVEL_NAMES.length - 1] ?? 'Transcendent'
}

export function getXPForCurrentLevel(totalXP: number): number {
  const level = getLevelFromXP(totalXP)
  if (level <= LEVEL_THRESHOLDS.length) {
    return totalXP - (LEVEL_THRESHOLDS[level - 1] ?? 0)
  }
  const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 9100
  const xpBeyond = totalXP - lastThreshold
  return xpBeyond % 2000
}

export function getXPThresholdForLevel(level: number): number {
  if (level <= 1) return 300
  if (level <= LEVEL_THRESHOLDS.length) {
    return (LEVEL_THRESHOLDS[level] ?? 9100) - (LEVEL_THRESHOLDS[level - 1] ?? 0)
  }
  return 2000
}

// ─── Award XP & Check Achievements ──────────────────────────────────────────

/**
 * Award XP to a student and check for new achievement or medal unlocks.
 */
export async function awardXPAndCheckAchievements(
  studentId: string,
  testCategory: TestCategory,
  subject: Subject,
  scoreTotal: number,
  maxScore: number,
  submissionId?: string,
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
  let baseXP = 20 // PRACTICE default
  if (testCategory === TestCategory.HOMEWORK) {
    baseXP = 50
  } else if (testCategory === TestCategory.TEST || testCategory === TestCategory.UNIT_TEST) {
    baseXP = 100
  } else if (testCategory === TestCategory.WEEKLY_TEST) {
    baseXP = 120
  } else if (testCategory === TestCategory.MONTHLY_TEST) {
    baseXP = 150
  }

  const scorePercent = maxScore > 0 ? scoreTotal / maxScore : 0

  // Performance XP — scaled to max 80
  const performanceXP = Math.round(scorePercent * 80)

  // Perfect score bonus
  const isPerfect = scoreTotal === maxScore && maxScore > 0
  const perfectBonus = isPerfect ? 60 : scorePercent >= 0.95 ? 30 : 0

  // Streak bonuses
  let streakBonus = 0
  if (testCategory === TestCategory.HOMEWORK && student.streakCount > 0) {
    if (student.streakCount >= 30) {
      streakBonus = 300
    } else if (student.streakCount >= 10) {
      streakBonus = 120
    } else if (student.streakCount >= 7) {
      streakBonus = 75
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

  // 4. Calculate new level using scaling curve
  const newLevel = getLevelFromXP(updatedXp)
  const levelUp = newLevel > student.currentLevel
  const levelXP = getXPForCurrentLevel(updatedXp)
  const levelThreshold = getXPThresholdForLevel(newLevel)

  // Update profile in DB first
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

  // Upsert StudentLevelProgress
  try {
    await prisma.studentLevelProgress.upsert({
      where: { studentId },
      update: {
        totalXP: updatedXp,
        currentLevel: newLevel,
        levelXP,
        levelThreshold,
        lastLevelUpAt: levelUp ? new Date() : undefined,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        studentId,
        totalXP: updatedXp,
        currentLevel: newLevel,
        levelXP,
        levelThreshold,
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

  // Fetch all submissions for the student
  const submissions = await prisma.submission.findMany({
    where: { studentId, submittedAt: { not: null } },
    include: { test: true },
    orderBy: { submittedAt: 'desc' },
  })

  const totalSubmissions = submissions.length
  const physicsSubmissions = submissions.filter((s) => s.test.subject === Subject.PHYSICS)
  const chemistrySubmissions = submissions.filter((s) => s.test.subject === Subject.CHEMISTRY)
  const mathSubmissions = submissions.filter((s) => s.test.subject === Subject.MATHEMATICS)

  const physicsPracticeCount = physicsSubmissions.filter((s) => s.test.category === TestCategory.PRACTICE).length
  const chemistryPracticeCount = chemistrySubmissions.filter((s) => s.test.category === TestCategory.PRACTICE).length
  const mathPracticeCount = mathSubmissions.filter((s) => s.test.category === TestCategory.PRACTICE).length

  // Time-based check
  const submitHour = new Date().getHours()
  const isNightOwl = submitHour >= 22 || submitHour < 1
  const isEarlyBird = submitHour >= 4 && submitHour < 7

  // Submission timing for SPEED_DEMON
  let isSpeedDemon = false
  if (submissionId && testCategory !== TestCategory.PRACTICE) {
    const sub = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { test: { select: { durationMinutes: true } } },
    })
    if (sub && sub.startedAt && sub.submittedAt && sub.test.durationMinutes > 0) {
      const takenSeconds = (sub.submittedAt.getTime() - sub.startedAt.getTime()) / 1000
      const allowedSeconds = sub.test.durationMinutes * 60
      isSpeedDemon = scorePercent >= 0.8 && takenSeconds < allowedSeconds * 0.3
    }
  }

  // Same-day submissions count
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todaySubmissions = submissions.filter((s) => {
    if (!s.submittedAt) return false
    const d = new Date(s.submittedAt)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  // Comeback logic: check previous submission of same subject
  const prevSameSubjectSubs = submissions.filter(
    (s) => s.test.subject === subject && s.test.category !== TestCategory.PRACTICE
  )
  const prevSubjectScore = (() => {
    const prev = prevSameSubjectSubs[1]
    if (prevSameSubjectSubs.length < 2 || !prev) return null
    return (prev.scoreTotal ?? 0) / Math.max(prev.maxScore ?? 1, 1)
  })()

  const isEpicComeback = prevSubjectScore !== null && prevSubjectScore < 0.4 && scorePercent >= 0.8
  const isResiliency = prevSubjectScore !== null && prevSubjectScore < 0.5 && scorePercent >= 0.5

  // Comeback kid: same-test improvement ≥ 30%
  const prevSameTestSubs = submissions.filter((s) => s.testId === submissions[0]?.testId)
  const prevSameTestScore = (() => {
    const prev = prevSameTestSubs[1]
    if (prevSameTestSubs.length < 2 || !prev) return null
    return (prev.scoreTotal ?? 0) / Math.max(prev.maxScore ?? 1, 1)
  })()
  const isComebackKid = prevSameTestScore !== null && scorePercent - prevSameTestScore >= 0.3

  // Check today homework + practice for DAILY_GOAL
  const todayHasHomework = todaySubmissions.some((s) => s.test.category === TestCategory.HOMEWORK)
  const todayHasPractice = todaySubmissions.some((s) => s.test.category === TestCategory.PRACTICE)
  const isDailyGoal = todayHasHomework && todayHasPractice

  // Consecutive perfects: last N all perfect
  const recentSubs = submissions.slice(0, 5)
  const hasThreeConsecutivePerfect =
    recentSubs.length >= 3 &&
    recentSubs.slice(0, 3).every((s) => s.scoreTotal !== null && s.maxScore !== null && s.scoreTotal === s.maxScore && s.maxScore > 0)
  const hasFiveConsecutivePerfectPractice = (() => {
    const practiceSubs = submissions.filter((s) => s.test.category === TestCategory.PRACTICE)
    const last5 = practiceSubs.slice(0, 5)
    return last5.length >= 5 && last5.every(
      (s) => s.scoreTotal !== null && s.maxScore !== null && s.scoreTotal === s.maxScore && (s.maxScore ?? 0) > 0
    )
  })()

  // First attempt win: very first formal test with ≥ 90%
  const formalSubs = submissions.filter(
    (s) => s.test.category !== TestCategory.PRACTICE && s.test.category !== TestCategory.HOMEWORK
  )
  const isFirstAttemptWin = formalSubs.length === 1 && scorePercent >= 0.9 &&
    testCategory !== TestCategory.PRACTICE && testCategory !== TestCategory.HOMEWORK

  // Knowledge seeker: submissions in all 3 subjects
  const hasPhysics = physicsSubmissions.length > 0
  const hasChemistry = chemistrySubmissions.length > 0
  const hasMath = mathSubmissions.length > 0
  const isKnowledgeSeeker = hasPhysics && hasChemistry && hasMath

  // Versatility: 5+ tests across different subjects (unique subjects with ≥ 1 submission each, at least 2)
  const uniqueSubjectsAttempted = new Set(submissions.map((s) => s.test.subject)).size
  const isVersatile = uniqueSubjectsAttempted >= 2 && totalSubmissions >= 5

  // Subject devotee: 20+ in single subject
  const maxSubCount = Math.max(physicsSubmissions.length, chemistrySubmissions.length, mathSubmissions.length)
  const isSubjectDevotee = maxSubCount >= 20

  // A. --- Check General Achievements ---
  const unlockedAchievements = await prisma.studentAchievement.findMany({
    where: { studentId },
    select: { achievementType: true },
  })
  const unlockedAchievementSet = new Set(unlockedAchievements.map((a) => a.achievementType))

  const achievementTriggers = [
    // ── Milestone ──
    {
      type: AchievementType.QUICK_LEARNER,
      title: 'First Step',
      description: 'Completed your first assignment or practice drill on VidyaVault!',
      points: 50,
      icon: 'first_step',
      trigger: () => totalSubmissions >= 1,
    },
    {
      type: AchievementType.DAILY_GOAL,
      title: 'Daily Double',
      description: 'Completed both homework and a practice drill in a single day — double the effort!',
      points: 100,
      icon: 'daily_goal',
      trigger: () => isDailyGoal,
    },
    {
      type: AchievementType.CENTURION,
      title: 'Century Club',
      description: 'A true warrior of knowledge — 100 total submissions completed!',
      points: 500,
      icon: 'centurion',
      trigger: () => totalSubmissions >= 100,
    },
    {
      type: AchievementType.GRIND_MODE,
      title: 'Grind Mode',
      description: 'Five submissions in a single day. Absolute dedication!',
      points: 150,
      icon: 'grind_mode',
      trigger: () => todaySubmissions.length >= 5,
    },

    // ── Streak ──
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
      type: AchievementType.MANIAC,
      title: 'Maniac',
      description: 'Absolutely relentless — a 10-day homework streak. Nothing can stop you!',
      points: 400,
      icon: 'maniac',
      trigger: () => student.streakCount >= 10,
    },
    {
      type: AchievementType.MARATHON_RUNNER,
      title: 'Marathon Runner',
      description: 'Legendary 30-day homework streak. You are unstoppable!',
      points: 750,
      icon: 'marathon_runner',
      trigger: () => student.streakCount >= 30,
    },

    // ── Accuracy / Performance ──
    {
      type: AchievementType.PERFECT_SCORE,
      title: 'Perfect Scholar',
      description: 'Scored 100% accuracy on any test or daily homework set!',
      points: 150,
      icon: 'perfect_scholar',
      trigger: () => isPerfect || submissions.some((s) => s.scoreTotal === s.maxScore && (s.maxScore ?? 0) > 0),
    },
    {
      type: AchievementType.ACCURACY_CHAMPION,
      title: 'Accuracy Champion',
      description: 'Five consecutive perfect practice drill scores. Flawless execution!',
      points: 300,
      icon: 'accuracy_champion',
      trigger: () => hasFiveConsecutivePerfectPractice,
    },
    {
      type: AchievementType.PERFECTIONIST,
      title: 'Perfectionist',
      description: 'Three consecutive perfect scores across any test type. Exceptional precision!',
      points: 250,
      icon: 'perfectionist',
      trigger: () => hasThreeConsecutivePerfect,
    },
    {
      type: AchievementType.FIRST_ATTEMPT_WIN,
      title: 'First Strike',
      description: 'Scored 90% or higher on your very first formal test attempt!',
      points: 200,
      icon: 'first_strike',
      trigger: () => isFirstAttemptWin,
    },
    {
      type: AchievementType.SPEED_DEMON,
      title: 'Speed Demon',
      description: 'Scored 80%+ while using less than 30% of the allowed time. Lightning fast!',
      points: 200,
      icon: 'speed_demon',
      trigger: () => isSpeedDemon,
    },

    // ── Improvement / Comeback ──
    {
      type: AchievementType.COMEBACK_KID,
      title: 'Comeback Kid',
      description: 'Improved your score by 30%+ compared to your previous attempt on the same test!',
      points: 200,
      icon: 'comeback_kid',
      trigger: () => isComebackKid,
    },
    {
      type: AchievementType.EPIC_COMEBACK,
      title: 'Epic Comeback',
      description: 'From below 40% to above 80% in the same subject. What a turnaround!',
      points: 350,
      icon: 'epic_comeback',
      trigger: () => isEpicComeback,
    },
    {
      type: AchievementType.RESILIENT,
      title: 'Resilient',
      description: 'Bounced back from a rough patch and scored above 50%. Never give up!',
      points: 150,
      icon: 'resilient',
      trigger: () => isResiliency,
    },

    // ── Knowledge / Subject ──
    {
      type: AchievementType.KNOWLEDGE_SEEKER,
      title: 'Knowledge Seeker',
      description: 'Completed practice drills in all three subjects — Physics, Chemistry, and Mathematics!',
      points: 250,
      icon: 'knowledge_seeker',
      trigger: () => isKnowledgeSeeker,
    },
    {
      type: AchievementType.VERSATILITY_AWARD,
      title: 'Polymath',
      description: 'Completed tests across multiple subjects. Your knowledge knows no bounds!',
      points: 200,
      icon: 'polymath',
      trigger: () => isVersatile,
    },
    {
      type: AchievementType.SUBJECT_MASTERY,
      title: 'Academic Titan',
      description: 'Demonstrated outstanding dedication by reaching Level 5!',
      points: 300,
      icon: 'academic_titan',
      trigger: () => newLevel >= 5,
    },
    {
      type: AchievementType.SUBJECT_DEVOTEE,
      title: 'Subject Devotee',
      description: '20+ submissions in a single subject — true mastery through dedication!',
      points: 300,
      icon: 'subject_devotee',
      trigger: () => isSubjectDevotee,
    },

    // ── Time-Based ──
    {
      type: AchievementType.NIGHT_OWL,
      title: 'Night Owl',
      description: 'Submitted after 10 PM. Burning the midnight oil for knowledge!',
      points: 75,
      icon: 'night_owl',
      trigger: () => isNightOwl,
    },
    {
      type: AchievementType.EARLY_BIRD,
      title: 'Early Bird',
      description: 'Submitted before 7 AM. The early bird catches the knowledge!',
      points: 75,
      icon: 'early_bird',
      trigger: () => isEarlyBird,
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

        await prisma.studentProfile.update({
          where: { id: studentId },
          data: {
            totalXP: { increment: item.points },
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

  // Consecutive high scores for "3 consecutive ≥85%" medals
  const physicsHighScoreSeries = physicsSubmissions
    .filter((s) => s.test.category !== TestCategory.PRACTICE)
    .slice(0, 3)
    .every((s) => s.maxScore && s.maxScore > 0 && (s.scoreTotal ?? 0) / s.maxScore >= 0.85)
  const chemHighScoreSeries = chemistrySubmissions
    .filter((s) => s.test.category !== TestCategory.PRACTICE)
    .slice(0, 3)
    .every((s) => s.maxScore && s.maxScore > 0 && (s.scoreTotal ?? 0) / s.maxScore >= 0.85)
  const mathHighScoreSeries = mathSubmissions
    .filter((s) => s.test.category !== TestCategory.PRACTICE)
    .slice(0, 3)
    .every((s) => s.maxScore && s.maxScore > 0 && (s.scoreTotal ?? 0) / s.maxScore >= 0.85)

  // Check for gold medals in all 3 subjects (for TRIPLE_CROWN achievement)
  const hasPhysicsGold = unlockedMedalKeySet.has('Quantum Leap_GOLD_PHYSICS')
  const hasChemGold = unlockedMedalKeySet.has('Covalent Bond_GOLD_CHEMISTRY')
  const hasMathGold = unlockedMedalKeySet.has('Pythagorean Explorer_GOLD_MATHEMATICS')

  const medalTriggers = [
    // ════════════════════════════════════════════════════════
    // PHYSICS MEDALS (12)
    // ════════════════════════════════════════════════════════
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
      name: 'Force Field Master',
      tier: MedalTier.BRONZE,
      subject: Subject.PHYSICS,
      description: 'Completed 5 Physics submissions — the force is strong with this one!',
      points: 60,
      icon: 'force_field_master',
      trigger: () => physicsSubmissions.length >= 5,
    },
    {
      name: 'Wave Rider',
      tier: MedalTier.BRONZE,
      subject: Subject.PHYSICS,
      description: 'Scored above 70% on a Physics practice drill. Riding the waves!',
      points: 55,
      icon: 'wave_rider',
      trigger: () =>
        subject === Subject.PHYSICS &&
        testCategory === TestCategory.PRACTICE &&
        scorePercent >= 0.7,
    },
    {
      name: "Galileo's Observer",
      tier: MedalTier.SILVER,
      subject: Subject.PHYSICS,
      description: 'Completed 3 practice drills in Physics!',
      points: 75,
      icon: 'galileos_observer',
      trigger: () => physicsPracticeCount >= 3,
    },
    {
      name: 'Relativistic Scholar',
      tier: MedalTier.SILVER,
      subject: Subject.PHYSICS,
      description: 'Completed 10 Physics submissions — a relativistic journey!',
      points: 100,
      icon: 'relativistic_scholar',
      trigger: () => physicsSubmissions.length >= 10,
    },
    {
      name: 'Optics Ace',
      tier: MedalTier.SILVER,
      subject: Subject.PHYSICS,
      description: 'Completed 5 Physics practice drills. Vision sharpened!',
      points: 90,
      icon: 'optics_ace',
      trigger: () => physicsPracticeCount >= 5,
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
      name: 'Einsteinian Genius',
      tier: MedalTier.GOLD,
      subject: Subject.PHYSICS,
      description: 'Scored 85%+ on 3 consecutive Physics assessments. Brilliant!',
      points: 150,
      icon: 'einsteinian_genius',
      trigger: () =>
        subject === Subject.PHYSICS &&
        physicsSubmissions.filter((s) => s.test.category !== TestCategory.PRACTICE).length >= 3 &&
        physicsHighScoreSeries,
    },
    {
      name: 'Particle Pioneer',
      tier: MedalTier.GOLD,
      subject: Subject.PHYSICS,
      description: 'Completed 20 Physics submissions — a dedicated particle hunter!',
      points: 150,
      icon: 'particle_pioneer',
      trigger: () => physicsSubmissions.length >= 20,
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
    {
      name: 'Singularity',
      tier: MedalTier.PLATINUM,
      subject: Subject.PHYSICS,
      description: 'Scored 100% on a Physics Monthly test. Beyond the event horizon!',
      points: 300,
      icon: 'singularity',
      trigger: () =>
        subject === Subject.PHYSICS && isPerfect && testCategory === TestCategory.MONTHLY_TEST,
    },
    {
      name: 'Nobel Contender',
      tier: MedalTier.PLATINUM,
      subject: Subject.PHYSICS,
      description: 'Completed 50 Physics submissions — Nobel Prize territory!',
      points: 400,
      icon: 'nobel_contender',
      trigger: () => physicsSubmissions.length >= 50,
    },

    // ════════════════════════════════════════════════════════
    // CHEMISTRY MEDALS (12)
    // ════════════════════════════════════════════════════════
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
      name: 'Lab Initiate',
      tier: MedalTier.BRONZE,
      subject: Subject.CHEMISTRY,
      description: 'Completed 5 Chemistry submissions — the lab is calling!',
      points: 60,
      icon: 'lab_initiate',
      trigger: () => chemistrySubmissions.length >= 5,
    },
    {
      name: 'Titration Expert',
      tier: MedalTier.BRONZE,
      subject: Subject.CHEMISTRY,
      description: 'Scored above 70% on a Chemistry practice drill. Precision achieved!',
      points: 55,
      icon: 'titration_expert',
      trigger: () =>
        subject === Subject.CHEMISTRY &&
        testCategory === TestCategory.PRACTICE &&
        scorePercent >= 0.7,
    },
    {
      name: "Alchemist's Trial",
      tier: MedalTier.SILVER,
      subject: Subject.CHEMISTRY,
      description: 'Completed 3 practice drills in Chemistry!',
      points: 75,
      icon: 'alchemists_trial',
      trigger: () => chemistryPracticeCount >= 3,
    },
    {
      name: 'Reaction Specialist',
      tier: MedalTier.SILVER,
      subject: Subject.CHEMISTRY,
      description: 'Completed 10 Chemistry submissions — reactions mastered!',
      points: 100,
      icon: 'reaction_specialist',
      trigger: () => chemistrySubmissions.length >= 10,
    },
    {
      name: 'Organic Voyager',
      tier: MedalTier.SILVER,
      subject: Subject.CHEMISTRY,
      description: 'Completed 5 Chemistry practice drills. Organic mastery awaits!',
      points: 90,
      icon: 'organic_voyager',
      trigger: () => chemistryPracticeCount >= 5,
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
      name: 'Periodic Master',
      tier: MedalTier.GOLD,
      subject: Subject.CHEMISTRY,
      description: 'Scored 85%+ on 3 consecutive Chemistry assessments. Table mastered!',
      points: 150,
      icon: 'periodic_master',
      trigger: () =>
        subject === Subject.CHEMISTRY &&
        chemistrySubmissions.filter((s) => s.test.category !== TestCategory.PRACTICE).length >= 3 &&
        chemHighScoreSeries,
    },
    {
      name: 'Electrode Pioneer',
      tier: MedalTier.GOLD,
      subject: Subject.CHEMISTRY,
      description: 'Completed 20 Chemistry submissions — electrochemistry champion!',
      points: 150,
      icon: 'electrode_pioneer',
      trigger: () => chemistrySubmissions.length >= 20,
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
    {
      name: 'Catalyst Prime',
      tier: MedalTier.PLATINUM,
      subject: Subject.CHEMISTRY,
      description: 'Scored 100% on a Chemistry Monthly test. Unstoppable reaction!',
      points: 300,
      icon: 'catalyst_prime',
      trigger: () =>
        subject === Subject.CHEMISTRY && isPerfect && testCategory === TestCategory.MONTHLY_TEST,
    },
    {
      name: 'Curie Award',
      tier: MedalTier.PLATINUM,
      subject: Subject.CHEMISTRY,
      description: 'Completed 50 Chemistry submissions — worthy of Marie Curie!',
      points: 400,
      icon: 'curie_award',
      trigger: () => chemistrySubmissions.length >= 50,
    },

    // ════════════════════════════════════════════════════════
    // MATHEMATICS MEDALS (12)
    // ════════════════════════════════════════════════════════
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
      name: 'Geometry Initiate',
      tier: MedalTier.BRONZE,
      subject: Subject.MATHEMATICS,
      description: 'Completed 5 Mathematics submissions — angles aligned!',
      points: 60,
      icon: 'geometry_initiate',
      trigger: () => mathSubmissions.length >= 5,
    },
    {
      name: 'Number Theorist',
      tier: MedalTier.BRONZE,
      subject: Subject.MATHEMATICS,
      description: 'Scored above 70% on a Mathematics practice drill. Numbers decoded!',
      points: 55,
      icon: 'number_theorist',
      trigger: () =>
        subject === Subject.MATHEMATICS &&
        testCategory === TestCategory.PRACTICE &&
        scorePercent >= 0.7,
    },
    {
      name: "Euler's Disciple",
      tier: MedalTier.SILVER,
      subject: Subject.MATHEMATICS,
      description: 'Completed 3 practice drills in Mathematics!',
      points: 75,
      icon: 'eulers_disciple',
      trigger: () => mathPracticeCount >= 3,
    },
    {
      name: 'Algebra Specialist',
      tier: MedalTier.SILVER,
      subject: Subject.MATHEMATICS,
      description: 'Completed 10 Mathematics submissions — algebraic mastery!',
      points: 100,
      icon: 'algebra_specialist',
      trigger: () => mathSubmissions.length >= 10,
    },
    {
      name: 'Trigonometry Ace',
      tier: MedalTier.SILVER,
      subject: Subject.MATHEMATICS,
      description: 'Completed 5 Mathematics practice drills. Angles conquered!',
      points: 90,
      icon: 'trigonometry_ace',
      trigger: () => mathPracticeCount >= 5,
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
      name: 'Calculus Commander',
      tier: MedalTier.GOLD,
      subject: Subject.MATHEMATICS,
      description: 'Scored 85%+ on 3 consecutive Mathematics assessments. Derived success!',
      points: 150,
      icon: 'calculus_commander',
      trigger: () =>
        subject === Subject.MATHEMATICS &&
        mathSubmissions.filter((s) => s.test.category !== TestCategory.PRACTICE).length >= 3 &&
        mathHighScoreSeries,
    },
    {
      name: 'Infinite Series',
      tier: MedalTier.GOLD,
      subject: Subject.MATHEMATICS,
      description: 'Completed 20 Mathematics submissions — an infinite journey!',
      points: 150,
      icon: 'infinite_series',
      trigger: () => mathSubmissions.length >= 20,
    },
    {
      name: 'Fields Medalist',
      tier: MedalTier.PLATINUM,
      subject: Subject.MATHEMATICS,
      description: 'Scored 90% or higher on a Weekly or Monthly Mathematics exam!',
      points: 200,
      icon: 'fields_medalist',
      trigger: () =>
        subject === Subject.MATHEMATICS &&
        scorePercent >= 0.9 &&
        (testCategory === TestCategory.WEEKLY_TEST || testCategory === TestCategory.MONTHLY_TEST),
    },
    {
      name: "Ramanujan's Heir",
      tier: MedalTier.PLATINUM,
      subject: Subject.MATHEMATICS,
      description: "Scored 100% on a Mathematics Monthly test. Ramanujan's legacy lives on!",
      points: 300,
      icon: 'ramanujans_heir',
      trigger: () =>
        subject === Subject.MATHEMATICS && isPerfect && testCategory === TestCategory.MONTHLY_TEST,
    },
    {
      name: 'Abel Prize',
      tier: MedalTier.PLATINUM,
      subject: Subject.MATHEMATICS,
      description: 'Completed 50 Mathematics submissions — worthy of the Abel Prize!',
      points: 400,
      icon: 'abel_prize',
      trigger: () => mathSubmissions.length >= 50,
    },

    // ════════════════════════════════════════════════════════
    // CROSS-SUBJECT SPECIAL MEDALS (5)
    // ════════════════════════════════════════════════════════
    {
      name: 'Triple Scholar',
      tier: MedalTier.BRONZE,
      subject: Subject.SPECIAL,
      description: 'Submitted at least once in all three subjects. The journey begins!',
      points: 100,
      icon: 'triple_scholar',
      trigger: () => hasPhysics && hasChemistry && hasMath,
    },
    {
      name: 'Multidisciplinary',
      tier: MedalTier.SILVER,
      subject: Subject.SPECIAL,
      description: '5 submissions in each of the three subjects. A true all-rounder!',
      points: 200,
      icon: 'multidisciplinary',
      trigger: () =>
        physicsSubmissions.length >= 5 && chemistrySubmissions.length >= 5 && mathSubmissions.length >= 5,
    },
    {
      name: 'Omniscient',
      tier: MedalTier.GOLD,
      subject: Subject.SPECIAL,
      description: '10 submissions in each of the three subjects. All-knowing scholar!',
      points: 300,
      icon: 'omniscient',
      trigger: () =>
        physicsSubmissions.length >= 10 && chemistrySubmissions.length >= 10 && mathSubmissions.length >= 10,
    },
    {
      name: 'Polymath Supreme',
      tier: MedalTier.PLATINUM,
      subject: Subject.SPECIAL,
      description: 'Scored 100% in each of Physics, Chemistry, and Mathematics. Supreme intellect!',
      points: 600,
      icon: 'polymath_supreme',
      trigger: () => hasPhysicsGold && hasChemGold && hasMathGold,
    },
    {
      name: 'Grand Champion',
      tier: MedalTier.PLATINUM,
      subject: Subject.SPECIAL,
      description: 'All three gold medals plus the Triple Crown achievement. Legendary!',
      points: 800,
      icon: 'grand_champion',
      trigger: () =>
        hasPhysicsGold && hasChemGold && hasMathGold && unlockedAchievementSet.has(AchievementType.TRIPLE_CROWN),
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

        await prisma.studentProfile.update({
          where: { id: studentId },
          data: {
            totalXP: { increment: item.points },
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

  // Check TRIPLE_CROWN achievement (requires all 3 gold medals)
  const updatedMedalSet = new Set([
    ...unlockedMedalKeySet,
    ...newlyUnlockedAchievements.filter((a) => a.type === 'MEDAL').map((a) => a.id),
  ])
  const nowHasPhysicsGold = updatedMedalSet.has('Quantum Leap_GOLD_PHYSICS')
  const nowHasChemGold = updatedMedalSet.has('Covalent Bond_GOLD_CHEMISTRY')
  const nowHasMathGold = updatedMedalSet.has('Pythagorean Explorer_GOLD_MATHEMATICS')

  if (
    !unlockedAchievementSet.has(AchievementType.TRIPLE_CROWN) &&
    nowHasPhysicsGold && nowHasChemGold && nowHasMathGold
  ) {
    try {
      await prisma.studentAchievement.create({
        data: {
          studentId,
          achievementType: AchievementType.TRIPLE_CROWN,
          description: 'Earned gold medals in all three subjects — Physics, Chemistry, and Mathematics!',
          xpRewarded: 600,
          subject: null,
        },
      })
      await prisma.studentProfile.update({
        where: { id: studentId },
        data: { totalXP: { increment: 600 }, lastAchievementAt: new Date() },
      })
      newlyUnlockedAchievements.push({
        type: 'ACHIEVEMENT',
        id: AchievementType.TRIPLE_CROWN,
        title: 'Triple Crown',
        description: 'Earned gold medals in all three subjects — Physics, Chemistry, and Mathematics!',
        points: 600,
        icon: 'triple_crown',
      })
    } catch (err) {
      console.warn('Duplicate Triple Crown unlock caught:', err)
    }
  }

  // Refetch final level
  const finalProfile = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { currentLevel: true },
  })

  const finalLevel = finalProfile?.currentLevel ?? newLevel

  return {
    xpEarned,
    levelUp: finalLevel > student.currentLevel,
    oldLevel: student.currentLevel,
    newLevel: finalLevel,
    oldLevelName: getLevelName(student.currentLevel),
    newLevelName: getLevelName(finalLevel),
    newlyUnlockedAchievements,
  }
}
