import 'dotenv/config'
import { PrismaClient, Subject, AchievementType, MedalTier } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding gamification data to Azure Database...')

  const students = await prisma.studentProfile.findMany({
    include: { user: true }
  })

  if (students.length === 0) {
    console.log('No student profiles found. Please run core seed first.')
    return
  }

  // Clear existing achievements, progress and medals to prevent duplicates
  await prisma.studentAchievement.deleteMany()
  await prisma.studentMedal.deleteMany()
  await prisma.studentLevelProgress.deleteMany()

  for (const s of students) {
    let totalXP = 0
    let currentLevel = 1
    let physicsXp = 0
    let chemistryXp = 0
    let mathematicsXp = 0
    let streakCount = 0

    // Assign custom data based on student name to populate beautiful leaderboards
    if (s.user.username.includes('student_chem_1') || s.user.username === '0112E26') {
      totalXP = 1680
      currentLevel = 4
      chemistryXp = 950
      physicsXp = 480
      mathematicsXp = 250
      streakCount = 6

      // Create achievements
      await prisma.studentAchievement.createMany({
        data: [
          {
            studentId: s.id,
            achievementType: AchievementType.QUICK_LEARNER,
            description: 'Completed your first assignment or practice drill on VidyaVault!',
            xpRewarded: 50,
          },
          {
            studentId: s.id,
            achievementType: AchievementType.CONSISTENCY_BONUS,
            description: 'Maintained a 3-day streak in daily homework submissions!',
            xpRewarded: 100,
          },
          {
            studentId: s.id,
            achievementType: AchievementType.STREAK_MILESTONE,
            description: 'Unstoppable! Reached a 5-day daily homework streak!',
            xpRewarded: 200,
          },
          {
            studentId: s.id,
            achievementType: AchievementType.PERFECT_SCORE,
            description: 'Scored 100% accuracy on any test or daily homework set!',
            xpRewarded: 150,
          }
        ]
      })

      // Create medals
      await prisma.studentMedal.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            studentId: s.id,
            medalName: 'Molecular Apprentice',
            medalType: MedalTier.BRONZE,
            subject: Subject.CHEMISTRY,
            description: 'Submitted your first Chemistry assignment. Elements react!',
            iconName: 'molecular_apprentice',
          },
          {
            id: crypto.randomUUID(),
            studentId: s.id,
            medalName: 'Alchemist\'s Trial',
            medalType: MedalTier.SILVER,
            subject: Subject.CHEMISTRY,
            description: 'Completed 3 stress-free practice drills in Chemistry!',
            iconName: 'alchemists_trial',
          },
          {
            id: crypto.randomUUID(),
            studentId: s.id,
            medalName: 'Newtonian Pioneer',
            medalType: MedalTier.BRONZE,
            subject: Subject.PHYSICS,
            description: 'Submitted your first Physics assignment. Welcome to gravity!',
            iconName: 'newtonian_pioneer',
          },
          {
            id: crypto.randomUUID(),
            studentId: s.id,
            medalName: 'Arithmetic Ace',
            medalType: MedalTier.BRONZE,
            subject: Subject.MATHEMATICS,
            description: 'Submitted your first Mathematics assignment. Geometry and logic await!',
            iconName: 'arithmetic_ace',
          }
        ]
      })

    } else if (s.user.username.includes('student_chem_2') || s.user.username === '0212E26') {
      totalXP = 1120
      currentLevel = 3
      chemistryXp = 680
      physicsXp = 340
      streakCount = 3

      await prisma.studentAchievement.createMany({
        data: [
          {
            studentId: s.id,
            achievementType: AchievementType.QUICK_LEARNER,
            description: 'Completed your first assignment or practice drill on VidyaVault!',
            xpRewarded: 50,
          },
          {
            studentId: s.id,
            achievementType: AchievementType.CONSISTENCY_BONUS,
            description: 'Maintained a 3-day streak in daily homework submissions!',
            xpRewarded: 100,
          }
        ]
      })

      await prisma.studentMedal.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            studentId: s.id,
            medalName: 'Molecular Apprentice',
            medalType: MedalTier.BRONZE,
            subject: Subject.CHEMISTRY,
            description: 'Submitted your first Chemistry assignment. Elements react!',
            iconName: 'molecular_apprentice',
          },
          {
            id: crypto.randomUUID(),
            studentId: s.id,
            medalName: 'Newtonian Pioneer',
            medalType: MedalTier.BRONZE,
            subject: Subject.PHYSICS,
            description: 'Submitted your first Physics assignment. Welcome to gravity!',
            iconName: 'newtonian_pioneer',
          }
        ]
      })

    } else if (s.user.username.includes('student_chem_3')) {
      totalXP = 450
      currentLevel = 1
      chemistryXp = 450
      streakCount = 1

      await prisma.studentAchievement.createMany({
        data: [
          {
            studentId: s.id,
            achievementType: AchievementType.QUICK_LEARNER,
            description: 'Completed your first assignment or practice drill on VidyaVault!',
            xpRewarded: 50,
          }
        ]
      })

      await prisma.studentMedal.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            studentId: s.id,
            medalName: 'Molecular Apprentice',
            medalType: MedalTier.BRONZE,
            subject: Subject.CHEMISTRY,
            description: 'Submitted your first Chemistry assignment. Elements react!',
            iconName: 'molecular_apprentice',
          }
        ]
      })

    } else {
      // Small random stats for other students
      totalXP = Math.floor(Math.random() * 280) + 20
      currentLevel = 1
      chemistryXp = Math.floor(totalXP * 0.7)
      physicsXp = totalXP - chemistryXp
      streakCount = totalXP > 150 ? 1 : 0
    }

    // Update StudentProfile
    await prisma.studentProfile.update({
      where: { id: s.id },
      data: {
        totalXP,
        currentLevel,
        physicsXp,
        chemistryXp,
        mathematicsXp,
        streakCount
      }
    })

    // Upsert StudentLevelProgress
    await prisma.studentLevelProgress.upsert({
      where: { studentId: s.id },
      update: {
        totalXP,
        currentLevel,
        levelXP: totalXP % 500,
        levelThreshold: 500,
        updatedAt: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        studentId: s.id,
        totalXP,
        currentLevel,
        levelXP: totalXP % 500,
        levelThreshold: 500,
        updatedAt: new Date()
      }
    })
  }

  console.log('Successfully seeded all student gamification records on Azure database!')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
