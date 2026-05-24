import {
  CalendarClock,
  CircleCheckBig,
  Clock3,
  Flame,
  ListChecks,
  Sparkles,
  Trophy,
  ChevronRight,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { StatCard } from '../components/StatCard'
import { ComparisonBarChart } from '../components/charts/ComparisonBarChart'
import { TrendAreaChart } from '../components/charts/TrendAreaChart'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'
import type { DashboardSection } from './shared/dashboardNavigation'
import { getDashboardNavigation } from './shared/dashboardNavigation'
import { GamificationCelebration, renderBadgeIcon } from '../components/GamificationCelebration'

interface StudentOverview {
  active: number
  upcoming: number
  completed: number
  activeHomework: number
  streakCount: number
  totalXP?: number
  currentLevel?: number
  physicsXp?: number
  chemistryXp?: number
  mathematicsXp?: number
  achievements?: Array<{ id: string; studentId: string; achievementType: string; description: string; xpRewarded: number }>
  medals?: Array<{ id: string; studentId: string; medalName: string; medalType: string; subject: string; iconName: string }>
}

interface TestCard {
  id: string
  title: string
  subject: string
  classLevel: string
  startTime: string
  endTime: string
  durationMinutes: number
  category: string
  isDaily: boolean
  _count: {
    questions: number
  }
  submissions: Array<{
    id: string
    submittedAt: string | null
    scoreTotal: number | null
    maxScore: number | null
  }>
}

interface ResultRow {
  id: string
  scoreTotal: number | null
  maxScore: number | null
  submittedAt: string | null
  test: {
    title: string
    subject: string
    category: string
  }
}

const sectionTitle: Record<DashboardSection, string> = {
  homework: 'Homework Section',
  practice: 'Practice',
  test: 'Assessments',
  leaderboard: 'Leaderboard',
  performance: 'Student Performance',
  profile: 'Profile',
  'question-bank': 'Question Bank',
}

const sectionSubtitle: Record<DashboardSection, string> = {
  homework: 'Track assigned work and upcoming deadlines.',
  practice: 'Build mastery through targeted practice cards.',
  test: 'Start Weekly and Monthly tests and monitor active assessments.',
  leaderboard: 'See class and batch rank insights.',
  performance: 'Review growth and submission outcomes.',
  profile: 'Manage account and quick learning summary.',
  'question-bank': 'Question Bank',
}

const getNormalizedPercent = (score: number | null, max: number | null): number =>
  max && max > 0 ? Number((((score ?? 0) / max) * 100).toFixed(1)) : 0

const formatShortDate = (dateLike: string): string =>
  new Date(dateLike).toLocaleDateString([], { month: 'short', day: 'numeric' })

interface StudentPortalPageProps {
  section: DashboardSection
}

export const StudentPortalPage = ({ section }: StudentPortalPageProps) => {
  const { user, token } = useAuth()
  const [overview, setOverview] = useState<StudentOverview | null>(null)
  const [activeTests, setActiveTests] = useState<TestCard[]>([])
  const [upcomingTests, setUpcomingTests] = useState<TestCard[]>([])
  const [completedTests, setCompletedTests] = useState<TestCard[]>([])
  const [results, setResults] = useState<ResultRow[]>([])
  const [classLeaderboard, setClassLeaderboard] = useState<
    Array<{ rank: number; username: string; normalizedScore: number }>
  >([])
  const [batchLeaderboard, setBatchLeaderboard] = useState<
    Array<{ rank: number; name: string; medium: string; averageNormalizedScore: number }>
  >([])
  const [error, setError] = useState<string | null>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const [leaderboardSubject, setLeaderboardSubject] = useState<'overall' | 'PHYSICS' | 'CHEMISTRY' | 'MATHEMATICS'>('overall')
  const [gamifiedLeaderboard, setGamifiedLeaderboard] = useState<
    Array<{
      rank: number
      studentId: string
      username: string
      fullName: string
      xp: number
      level: number
      levelName?: string
      streakCount?: number
      topMedalTier?: string | null
      flair?: Array<{ id: string; icon: string; label: string; color: string }>
      achievementCount?: number
      medalCount?: number
    }>
  >([])

  const [activeCelebration, setActiveCelebration] = useState<{
    type: 'LEVEL_UP' | 'MEDAL'
    title: string
    subtitle?: string
    description: string
    points?: number
    iconName: string
  } | null>(null)

  const location = useLocation()
  const [selectedReportSubmissionId, setSelectedReportSubmissionId] = useState<string | null>(null)
  const [reportWizardMode, setReportWizardMode] = useState<'practice' | 'homework' | 'assessment'>('practice')
  const [medalsViewMode, setMedalsViewMode] = useState<'wizard' | 'scroll'>('wizard')
  const [medalsPageIndex, setMedalsPageIndex] = useState(0)
  const [medalsExpanded, setMedalsExpanded] = useState(true)

  useEffect(() => {
    const routerState = location.state as { showReportSubmissionId?: string } | null
    if (routerState?.showReportSubmissionId) {
      setSelectedReportSubmissionId(routerState.showReportSubmissionId)
      // Clear the history state so that clicking refresh doesn't reopen the modal
      window.history.replaceState({}, document.title)
    }
  }, [location])

  useEffect(() => {
    const loadData = async () => {
      if (import.meta.env.VITE_UI_ONLY === 'true') {
        setOverview({ active: 2, upcoming: 3, completed: 16, activeHomework: 1, streakCount: 5 })
        setActiveTests([
          {
            id: 'ui-1',
            title: 'Weekly Mathematics Homework',
            subject: 'Mathematics',
            classLevel: '10',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 5400000).toISOString(),
            durationMinutes: 45,
            category: 'HOMEWORK',
            isDaily: true,
            _count: { questions: 20 },
            submissions: [],
          },
          {
            id: 'ui-2',
            title: 'Chemistry Reaction Practice',
            subject: 'Chemistry',
            classLevel: '10',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            durationMinutes: 30,
            category: 'PRACTICE',
            isDaily: false,
            _count: { questions: 15 },
            submissions: [],
          },
        ])
        setUpcomingTests([
          {
            id: 'ui-3',
            title: 'Physics Motion Drill',
            subject: 'Physics',
            classLevel: '10',
            startTime: new Date(Date.now() + 86400000).toISOString(),
            endTime: new Date(Date.now() + 90000000).toISOString(),
            durationMinutes: 40,
            category: 'HOMEWORK',
            isDaily: false,
            _count: { questions: 18 },
            submissions: [],
          },
        ])
        setCompletedTests([
          {
            id: 'ui-4',
            title: 'Physics Chapter Test',
            subject: 'Physics',
            classLevel: '10',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            durationMinutes: 35,
            category: 'TEST',
            isDaily: false,
            _count: { questions: 12 },
            submissions: [{ id: 'sub-1', submittedAt: new Date().toISOString(), scoreTotal: 9, maxScore: 12 }],
          },
        ])
        setResults([
          {
            id: 'sub-1',
            scoreTotal: 9,
            maxScore: 12,
            submittedAt: new Date().toISOString(),
            test: { title: 'Physics Chapter Test', subject: 'Physics', category: 'TEST' },
          },
        ])
        setClassLeaderboard([
          { rank: 1, username: 'Aarav', normalizedScore: 0.95 },
          { rank: 2, username: user?.username ?? 'You', normalizedScore: 0.91 },
          { rank: 3, username: 'Riya', normalizedScore: 0.88 },
        ])
        setBatchLeaderboard([
          { rank: 1, name: 'Alpha Batch', medium: 'ENGLISH', averageNormalizedScore: 0.92 },
          { rank: 2, name: 'Beta Batch', medium: 'BENGALI', averageNormalizedScore: 0.86 },
        ])
        return
      }

      if (!token) {
        return
      }

      try {
        setError(null)
        const [overviewData, active, upcoming, completed, resultRows, classRows, batchRows] = await Promise.all([
          apiRequest<StudentOverview>('/student/overview', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=active', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=upcoming', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=completed', { method: 'GET', token }),
          apiRequest<ResultRow[]>('/student/results', { method: 'GET', token }),
          apiRequest<Array<{ rank: number; username: string; normalizedScore: number }>>('/leaderboards/class', {
            method: 'GET',
            token,
          }),
          apiRequest<Array<{ rank: number; name: string; medium: string; averageNormalizedScore: number }>>(
            '/leaderboards/batch',
            {
              method: 'GET',
              token,
            },
          ),
        ])
        setOverview(overviewData)
        setActiveTests(active)
        setUpcomingTests(upcoming)
        setCompletedTests(completed)
        setResults(resultRows)
        setClassLeaderboard(classRows)
        setBatchLeaderboard(batchRows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student portal')
      }
    }

    void loadData()
  }, [token, user?.username, reloadTrigger])

  useEffect(() => {
    const fetchGamified = async () => {
      if (!token) return
      if (import.meta.env.VITE_UI_ONLY === 'true') {
        setGamifiedLeaderboard([
          { rank: 1, studentId: 'ui-1', username: 'Aarav', fullName: 'Aarav Sharma', xp: 1450, level: 3 },
          { rank: 2, studentId: 'you', username: user?.username ?? 'You', fullName: user?.fullName ?? 'You', xp: 1200, level: 3 },
          { rank: 3, studentId: 'ui-3', username: 'Riya', fullName: 'Riya Sen', xp: 950, level: 2 },
        ])
        return
      }
      try {
        const rows = await apiRequest<
          Array<{ rank: number; studentId: string; username: string; fullName: string; xp: number; level: number }>
        >(`/leaderboards/gamified?subject=${leaderboardSubject}`, {
          method: 'GET',
          token,
        })
        setGamifiedLeaderboard(rows)
      } catch (err) {
        console.error('Failed to load gamified leaderboard:', err)
      }
    }
    void fetchGamified()
  }, [token, leaderboardSubject, reloadTrigger, user?.username, user?.fullName])

  const handleReattempt = async (testId: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to reattempt this practice drill? Your previous score and AI analysis will be reset.')) {
      return
    }
    try {
      setError(null)
      await apiRequest(`/student/tests/${testId}/reattempt`, {
        method: 'POST',
        token,
      })
      setReloadTrigger(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset practice drill')
    }
  }

  const scoreTrendData = useMemo(
    () =>
      results
        .slice(0, 8)
        .reverse()
        .map((item, index) => ({
          label: `T${index + 1}`,
          value: getNormalizedPercent(item.scoreTotal, item.maxScore),
        })),
    [results],
  )

  // ─── Practice-ONLY derived data (strict category isolation) ─────────────
  const practiceCompletedTests = useMemo(
    () => completedTests.filter((t) => t.category === 'PRACTICE'),
    [completedTests],
  )

  const practiceResults = useMemo(
    () => results.filter((r) => r.test.category === 'PRACTICE'),
    [results],
  )

  const subjectPracticeData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of practiceCompletedTests) {         // ✅ PRACTICE only
      counts.set(row.subject, (counts.get(row.subject) ?? 0) + 1)
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value }))
  }, [practiceCompletedTests])

  const practiceTrendData = useMemo(
    () =>
      practiceResults
        .slice(0, 8)
        .reverse()
        .map((item, index) => ({
          label: `T${index + 1}`,
          value: getNormalizedPercent(item.scoreTotal, item.maxScore),
        })),
    [practiceResults],
  )

  const weakestAttempts = useMemo(
    () =>
      practiceCompletedTests                           // ✅ PRACTICE only
        .map((test) => {
          const submission = test.submissions[0]
          return {
            testId: test.id,
            title: test.title,
            subject: test.subject,
            submissionId: submission?.id,
            score: getNormalizedPercent(submission?.scoreTotal ?? null, submission?.maxScore ?? null),
          }
        })
        .sort((left, right) => left.score - right.score)
        .slice(0, 3),
    [practiceCompletedTests],
  )

  const classRank = useMemo(
    () => classLeaderboard.find((row) => row.username === user?.username)?.rank,
    [classLeaderboard, user?.username],
  )

  const averageScore = useMemo(() => {
    if (results.length === 0) return 0
    const total = results.reduce((sum, row) => sum + getNormalizedPercent(row.scoreTotal, row.maxScore), 0)
    return Number((total / results.length).toFixed(1))
  }, [results])

  const navigation = getDashboardNavigation('student')

  const renderHomework = () => (
    <>
      <div className="stats-grid">
        <div className="streak-badge" style={{ gridColumn: 'span 2' }}>
           <Flame size={20} fill="currentColor" /> {overview?.streakCount ?? 0} Day Streak!
        </div>
        <StatCard label="Homework Today" value={overview?.activeHomework ?? 0} icon={<ListChecks size={18} />} />
        <StatCard
          label="Tests Pending"
          value={overview?.active ?? 0}
          icon={<CalendarClock size={18} />}
          tone="warning"
        />
      </div>

      <div className="two-col">
        <Card title="Today's Homework" subtitle="Complete these to maintain your streak" variant="glass">
          {activeTests.filter(t => t.category === 'HOMEWORK').length === 0 ? (
            <div className="empty-state">All caught up! No homework for today.</div>
          ) : (
            <div className="premium-list">
              {activeTests.filter(t => t.category === 'HOMEWORK').map((test, idx) => (
                <div key={test.id} className={`daily-item fade-in-up stagger-${(idx % 4) + 1}`}>
                  <div>
                    <strong>{test.title}</strong>
                    <div className="muted">{test.subject} • {test.durationMinutes} min</div>
                  </div>
                  <Link to={`/student/tests/${test.id}/take`}>
                    <Button size="sm">Start</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Upcoming Work" subtitle="Plan your week ahead" variant="glass">
          {upcomingTests.filter(t => t.category === 'HOMEWORK').length === 0 ? (
            <div className="empty-state">No upcoming tasks.</div>
          ) : (
            <ul className="plain-list">
              {upcomingTests.filter(t => t.category === 'HOMEWORK').slice(0, 4).map((test, idx) => (
                <li key={test.id} className={`fade-in-up stagger-${(idx % 4) + 1}`}>
                  <strong>{test.title}</strong>
                  <div className="muted">{test.category.replace('_', ' ')} • {formatShortDate(test.startTime)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Homework Completion History" subtitle="Your past daily assignments" variant="glass">
        {results.filter(r => r.test.category === 'HOMEWORK').length === 0 ? (
          <div className="empty-state">No homework records yet.</div>
        ) : (
          <div className="premium-list">
            {results.filter(r => r.test.category === 'HOMEWORK').map((row) => (
              <div key={row.id} className="premium-item">
                <div>
                  <strong>{row.test.title}</strong>
                  <div className="muted">
                    {row.test.subject} • {row.scoreTotal ?? 0}/{row.maxScore ?? 0} •{' '}
                    {row.submittedAt ? formatShortDate(row.submittedAt) : 'Not submitted'}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setReportWizardMode('homework')
                    setSelectedReportSubmissionId(row.id)
                  }}
                >
                  Review 📋
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )

  const renderPractice = () => {
    const practiceDrills = activeTests.filter((t) => t.category === 'PRACTICE')

    return (
      <>
        <div className="two-col">
          <Card title="Practice Coverage by Subject" subtitle="Completed practice attempts per subject" variant="glass">
            <ComparisonBarChart data={subjectPracticeData} />
          </Card>
          <Card title="Accuracy Trend" subtitle="Recent practice drill quality" variant="glass">
            <TrendAreaChart data={practiceTrendData} valueSuffix="%" />
          </Card>
        </div>

        <Card 
          title="Practice Drills Library" 
          subtitle="Stress-free, untimed modules to master your subjects" 
          variant="gradient"
        >
          {practiceDrills.length === 0 ? (
            <div className="empty-state py-12">
              <div className="flex flex-col items-center gap-4">
                <Sparkles className="text-primary/40" size={48} />
                <p className="muted">No practice drills assigned to you at the moment.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {practiceDrills.map((drill, idx) => {
                const submission = drill.submissions?.[0]
                const isCompleted = submission && submission.submittedAt !== null
                const isInProgress = submission && submission.submittedAt === null
                
                const scorePercent = isCompleted && submission.scoreTotal !== null && submission.maxScore
                  ? (submission.scoreTotal / submission.maxScore) * 100
                  : 0

                // Custom HSL gradients based on subjects for rich aesthetics
                const subjectLower = drill.subject.toLowerCase()
                let cardTheme = 'from-indigo-500/10 to-purple-500/10 hover:shadow-indigo-500/5'
                if (subjectLower.includes('math')) cardTheme = 'from-indigo-500/10 to-blue-500/10 hover:shadow-blue-500/5'
                else if (subjectLower.includes('chem')) cardTheme = 'from-emerald-500/10 to-teal-500/10 hover:shadow-emerald-500/5'
                else if (subjectLower.includes('phys')) cardTheme = 'from-amber-500/10 to-orange-500/10 hover:shadow-amber-500/5'
                else if (subjectLower.includes('biol')) cardTheme = 'from-rose-500/10 to-pink-500/10 hover:shadow-rose-500/5'

                return (
                  <div 
                    key={drill.id} 
                    className={`practice-drill-card fade-in-up stagger-${(idx % 4) + 1} flex flex-col justify-between p-6 rounded-2xl border border-white/10 bg-gradient-to-br ${cardTheme} backdrop-blur-md hover:scale-[1.02] hover:border-primary-500/30 transition-all duration-300 shadow-lg`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/5 border border-white/10 text-primary-soft">
                          {drill.subject}
                        </span>
                        {isCompleted ? (
                          <span className="bg-success-500/10 text-success text-[10px] px-2 py-0.5 rounded-full font-bold border border-success-500/20">
                            COMPLETED
                          </span>
                        ) : isInProgress ? (
                          <span className="bg-warning-500/10 text-warning text-[10px] px-2 py-0.5 rounded-full font-bold border border-warning-500/20">
                            IN PROGRESS
                          </span>
                        ) : (
                          <span className="bg-white/5 text-muted text-[10px] px-2 py-0.5 rounded-full font-bold border border-white/10">
                            NOT STARTED
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-bold text-white mb-2 line-clamp-2" style={{ lineHeight: 1.4 }}>
                        {drill.title}
                      </h4>
                      <p className="text-xs text-white/50 mb-4">
                        📝 {drill._count.questions} Questions • Untimed Practice
                      </p>

                      {isCompleted && submission && (
                        <div className="mb-6 bg-black/20 p-3.5 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-white/40">Latest Score</span>
                            <strong className="text-sm text-white font-mono">
                              {submission.scoreTotal?.toFixed(1) ?? '0.0'} / {submission.maxScore?.toFixed(1) ?? '0.0'} ({scorePercent.toFixed(0)}%)
                            </strong>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${scorePercent >= 80 ? 'bg-success' : scorePercent >= 50 ? 'bg-warning' : 'bg-error'}`}
                              style={{ width: `${scorePercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5 mt-4 pt-4 border-t border-white/5" style={{ width: '100%' }}>
                      {!isCompleted ? (
                        <Link to={`/student/tests/${drill.id}/take`} style={{ width: '100%', display: 'block' }}>
                          <Button className="w-full justify-center">
                            {isInProgress ? 'Resume 📝' : 'Practice Now 🚀'}
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="flex-1 justify-center text-xs"
                            onClick={() => setSelectedReportSubmissionId(submission.id)}
                          >
                            Report 📊
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="flex-1 justify-center text-xs text-primary-soft border border-primary-500/20 hover:bg-primary-500/10 hover:border-primary-500/40"
                            onClick={() => handleReattempt(drill.id)}
                          >
                            Reattempt 🔄
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Recommended Practice Cards" subtitle="Focus on weak areas first" variant="glass">
          {weakestAttempts.length === 0 ? (
            <div className="empty-state">Complete at least one test to get practice recommendations.</div>
          ) : (
            <div className="premium-list">
              {weakestAttempts.map((attempt) => (
                <div key={attempt.testId} className="premium-item">
                  <div>
                    <strong>{attempt.title}</strong>
                    <div className="muted">
                      {attempt.subject} • Score {attempt.score.toFixed(1)}%
                    </div>
                  </div>
                  {attempt.submissionId ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setReportWizardMode('practice')
                        setSelectedReportSubmissionId(attempt.submissionId!)
                      }}
                    >
                      Review
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </>
    )
  }
  const renderTest = () => {
    const weeklyTests = activeTests.filter((t) => t.category === 'WEEKLY_TEST')
    const monthlyTests = activeTests.filter((t) => t.category === 'MONTHLY_TEST')
    const upcomingSchoolTests = upcomingTests.filter((t) => t.category === 'WEEKLY_TEST' || t.category === 'MONTHLY_TEST')
    const schoolResults = results.filter(r => r.test.category !== 'HOMEWORK' && r.test.category !== 'PRACTICE')

    const renderActiveLauncher = (testList: TestCard[], emptyMsg: string, icon: ReactElement) => {
      if (testList.length === 0) {
        return (
          <div className="empty-state-v2 compact" style={{ border: '1px dashed var(--border-strong)', borderRadius: '20px', padding: '32px 16px', background: 'var(--surface-soft)' }}>
            <div className="empty-icon" style={{ margin: '0 auto 12px', background: 'var(--color-primary-100)', color: 'var(--color-primary-600)', width: '50px', height: '50px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
              {icon}
            </div>
            <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>No Active Exams</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>{emptyMsg}</p>
          </div>
        )
      }

      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {testList.map((test) => {
            const subjectClass = `subject-${test.subject.toLowerCase()}`
            const hoursLeft = Math.max(1, Math.round((new Date(test.endTime).getTime() - Date.now()) / 3600000))
            const closesSoon = hoursLeft <= 24

            return (
              <div key={test.id} className="exam-launch-card">
                <div>
                  <div className="exam-launch-header">
                    <span className={`status-pill ${subjectClass}`} style={{ fontSize: '0.7rem' }}>
                      {test.subject}
                    </span>
                    {closesSoon ? (
                      <span className="status-pill status-closed" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⚠️ Closes in {hoursLeft}h
                      </span>
                    ) : (
                      <span className="status-pill status-active" style={{ fontSize: '0.7rem' }}>
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '8px 0 10px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    {test.title}
                  </h4>

                  <div className="exam-badge-row">
                    <span className="exam-meta-pill">
                      ⏱️ {test.durationMinutes} mins
                    </span>
                    <span className="exam-meta-pill">
                      📝 {test._count.questions} Qs
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-soft)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Link to={`/student/tests/${test.id}/take`}>
                    <Button size="sm" className="flex items-center gap-1">
                      Attempt Now 🚀
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <>
        {/* Consolidated Readiness Snapshot Cluster at top */}
        <Card title="Readiness Snapshot" subtitle="Key assessment vitals & streaks" variant="glass">
          <div className="stats-grid">
            <StatCard label="Ready Now" value={weeklyTests.length + monthlyTests.length} icon={<Clock3 size={18} />} tone="primary" />
            <StatCard label="Upcoming" value={upcomingSchoolTests.length} icon={<CalendarClock size={18} />} tone="warning" />
            <StatCard
              label="Avg. Performance"
              value={`${averageScore.toFixed(1)}%`}
              icon={<Sparkles size={18} />}
              tone="success"
            />
            <StatCard label="Streak Points" value={Math.max(1, completedTests.length)} icon={<Flame size={18} />} tone="danger" />
          </div>
        </Card>

        {/* Live assessment grids */}
        <div className="two-col">
          <Card title="Weekly Assessments" subtitle="Regular progress checks" variant="glass">
            {renderActiveLauncher(weeklyTests, "All weekly check-ins complete.", <CircleCheckBig size={20} />)}
          </Card>

          <Card title="Monthly Assessments" subtitle="Monthly milestone tests" variant="glass">
            {renderActiveLauncher(monthlyTests, "No active monthly milestone exams.", <Trophy size={20} />)}
          </Card>
        </div>

        {/* Upcoming tests stepper timeline and history */}
        <div className="two-col" style={{ alignItems: 'start' }}>
          <Card title="Upcoming Assessments" subtitle="Revise key topics ahead of schedule" variant="glass">
            {upcomingSchoolTests.length === 0 ? (
              <div className="empty-state">No upcoming assessments scheduled.</div>
            ) : (
              <div className="timeline-stepper">
                {upcomingSchoolTests.map((test) => {
                  const testDate = new Date(test.startTime)
                  const day = testDate.getDate()
                  const monthStr = testDate.toLocaleDateString([], { month: 'short' }).toUpperCase()
                  const subjectClass = `subject-${test.subject.toLowerCase()}`

                  return (
                    <div key={test.id} className="timeline-step">
                      <div className="timeline-node-card">
                        <div className="date-badge" style={{ flexShrink: 0 }}>
                          <span className="day">{day}</span>
                          <span className="month" style={{ fontSize: '0.65rem' }}>{monthStr}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span className={`status-pill ${subjectClass}`} style={{ fontSize: '0.65rem', padding: '2px 6px', marginBottom: '4px' }}>
                            {test.subject}
                          </span>
                          <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>
                            {test.title}
                          </strong>
                          <span className="muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            ⏰ {testDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {test.durationMinutes}m
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Test Records & Detailed Radial Report Card Grid */}
          <Card title="Test Records & Results" subtitle="Your past formal assessments" variant="glass">
            {schoolResults.length === 0 ? (
              <div className="empty-state">No completed test records found.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {schoolResults.map((row) => {
                  const scorePercent = getNormalizedPercent(row.scoreTotal, row.maxScore)
                  const toneClass = scorePercent >= 80 ? 'score-high' : scorePercent >= 50 ? 'score-mid' : 'score-low'
                  const subjectClass = `subject-${row.test.subject.toLowerCase()}`

                  return (
                    <div key={row.id} className="report-score-card">
                      <div style={{ flex: 1, paddingRight: '12px' }}>
                        <span className={`status-pill ${subjectClass}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          {row.test.subject}
                        </span>
                        <h5 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 4px', color: 'var(--text-main)' }}>
                          {row.test.title}
                        </h5>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                          Attempted: {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—'}
                        </p>
                        <div style={{ marginTop: '10px' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-1"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={() => {
                              setReportWizardMode('assessment')
                              setSelectedReportSubmissionId(row.id)
                            }}
                          >
                            Detailed Report <ChevronRight size={12} />
                          </Button>
                        </div>
                      </div>

                      {/* Dynamic Conic-gradient Radial Progress */}
                      <div 
                        className={`radial-progress ${toneClass}`} 
                        data-score={`${row.scoreTotal?.toFixed(0) ?? 0}/${row.maxScore?.toFixed(0) ?? 0}`}
                        style={{ '--percent': scorePercent } as React.CSSProperties}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </>
    )
  }

  const renderLeaderboard = () => (
    <>
      <div className="leaderboard-tabs-nav">
        <button
          className={`leaderboard-tab-btn ${leaderboardSubject === 'overall' ? 'active' : ''}`}
          onClick={() => setLeaderboardSubject('overall')}
        >
          🏆 Overall Ranks
        </button>
        <button
          className={`leaderboard-tab-btn ${leaderboardSubject === 'PHYSICS' ? 'active' : ''}`}
          onClick={() => setLeaderboardSubject('PHYSICS')}
        >
          ⚛️ Physics Board
        </button>
        <button
          className={`leaderboard-tab-btn ${leaderboardSubject === 'CHEMISTRY' ? 'active' : ''}`}
          onClick={() => setLeaderboardSubject('CHEMISTRY')}
        >
          🧪 Chemistry Board
        </button>
        <button
          className={`leaderboard-tab-btn ${leaderboardSubject === 'MATHEMATICS' ? 'active' : ''}`}
          onClick={() => setLeaderboardSubject('MATHEMATICS')}
        >
          🔢 Mathematics Board
        </button>
      </div>

      <div className="two-col" style={{ alignItems: 'start' }}>
        <Card 
          title={`${leaderboardSubject === 'overall' ? 'Overall' : leaderboardSubject.charAt(0) + leaderboardSubject.slice(1).toLowerCase()} Leaderboard`}
          subtitle="Top students ranked by earned experience points (XP)" 
          variant="gradient"
        >
          {gamifiedLeaderboard.length === 0 ? (
            <div className="empty-state">No rankings available yet. Start solving homework/drills to top the board!</div>
          ) : (
            <div className="gamified-leader-list">
              {gamifiedLeaderboard.map((entry) => {
                const isCurrentUser = entry.username === user?.username
                const rankClass = entry.rank === 1 ? 'leader-rank-1' : entry.rank === 2 ? 'leader-rank-2' : entry.rank === 3 ? 'leader-rank-3' : 'leader-rank-other'
                
                // Medal tier border glow
                const medalGlow = entry.topMedalTier === 'PLATINUM' ? '0 0 12px rgba(167,139,250,0.5)'
                  : entry.topMedalTier === 'GOLD' ? '0 0 10px rgba(251,191,36,0.4)'
                  : entry.topMedalTier === 'SILVER' ? '0 0 8px rgba(156,163,175,0.3)'
                  : 'none'

                return (
                  <div
                    key={entry.studentId}
                    className={`gamified-leader-row ${isCurrentUser ? 'highlighted' : ''}`}
                    style={medalGlow !== 'none' ? { boxShadow: medalGlow } : {}}
                  >
                    <div className={`leader-rank-box ${rankClass}`}>
                      {entry.rank === 1 ? '👑' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                    </div>
                    
                    <div className="leader-avatar-letter">
                      {entry.fullName.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="leader-info">
                      <span className="leader-name">
                        {entry.fullName} {isCurrentUser ? '(You)' : ''}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="leader-level">{entry.levelName ?? `LVL ${entry.level}`}</span>
                        {/* Flair badges */}
                        {entry.flair && entry.flair.slice(0, 3).map((badge) => (
                          <span
                            key={badge.id}
                            title={badge.label}
                            style={{
                              fontSize: '13px',
                              cursor: 'help',
                              padding: '1px 4px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              lineHeight: 1,
                            }}
                          >
                            {badge.icon}
                          </span>
                        ))}
                        {(entry.streakCount ?? 0) >= 5 && !entry.flair?.some(f => f.label.includes('streak') || f.label.includes('Maniac')) && (
                          <span title={`${entry.streakCount} day streak`} style={{ fontSize: '12px', opacity: 0.85 }}>🔥</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="leader-score-value">
                      <div>{entry.xp} <span className="leader-score-unit">XP</span></div>
                      {(entry.medalCount ?? 0) > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-soft)', marginTop: '2px' }}>
                          🏅 {entry.medalCount} medals
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Batch Power Comparison" subtitle="Comparing average batch mastery rates" variant="glass">
          <ComparisonBarChart
            data={batchLeaderboard.map((entry) => ({
              label: `${entry.name} (${entry.medium.slice(0, 3)})`,
              value: Number((entry.averageNormalizedScore * 100).toFixed(1)),
            }))}
            valueSuffix="%"
          />
        </Card>
      </div>
    </>
  )

  const renderPerformance = () => (
    <>
      <div className="two-col">
        <Card title="Performance Trend" subtitle="Your latest score movement" variant="glass">
          <TrendAreaChart data={scoreTrendData} valueSuffix="%" />
        </Card>
        <Card title="Summary Metrics" subtitle="Current performance snapshot" variant="glass">
          <div className="stats-grid">
            <StatCard label="Average Score" value={`${averageScore.toFixed(1)}%`} icon={<Sparkles size={18} />} />
            <StatCard label="Completed" value={results.length} icon={<CircleCheckBig size={18} />} tone="success" />
            <StatCard label="Class Rank" value={classRank ? `#${classRank}` : '-'} icon={<Trophy size={18} />} />
          </div>
        </Card>
      </div>

      <Card title="Submission History" subtitle="Open a submission for detailed question analysis" variant="glass">
        {results.length === 0 ? (
          <div className="empty-state">No submissions found yet.</div>
        ) : (
          <div className="premium-list">
            {results.map((row) => (
              <div key={row.id} className="premium-item">
                <div>
                  <strong>{row.test.title}</strong>
                  <div className="muted">
                    {row.test.subject} • {row.scoreTotal ?? 0}/{row.maxScore ?? 0} •{' '}
                    {row.submittedAt ? formatShortDate(row.submittedAt) : 'Not submitted'}
                  </div>
                </div>
                <Link to={`/student/performance/${row.id}`}>
                  <Button variant="secondary" size="sm">
                    View details
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )

  const [medalFilter, setMedalFilter] = useState<'all' | 'General' | 'Physics' | 'Chemistry' | 'Mathematics' | 'Special'>('all')

  const MEDALS_LIST = [
    // ── General Achievements ──
    { id: 'QUICK_LEARNER', title: 'First Step', desc: 'Completed your first assignment or drill!', points: 50, icon: 'first_step', category: 'General', rarity: 'common' },
    { id: 'DAILY_GOAL', title: 'Daily Double', desc: 'Homework + practice drill in a single day!', points: 100, icon: 'daily_goal', category: 'General', rarity: 'common' },
    { id: 'CONSISTENCY_BONUS', title: 'Consistent Scholar', desc: 'Maintained a 3-day streak!', points: 100, icon: 'consistent_scholar', category: 'General', rarity: 'common' },
    { id: 'STREAK_MILESTONE', title: 'Daily Champion', desc: 'Reached a 5-day homework streak!', points: 200, icon: 'daily_champion', category: 'General', rarity: 'uncommon' },
    { id: 'MANIAC', title: 'Maniac', desc: 'Absolutely relentless — 10-day homework streak!', points: 400, icon: 'maniac', category: 'General', rarity: 'rare' },
    { id: 'MARATHON_RUNNER', title: 'Marathon Runner', desc: 'Legendary 30-day homework streak!', points: 750, icon: 'marathon_runner', category: 'General', rarity: 'legendary' },
    { id: 'PERFECT_SCORE', title: 'Perfect Scholar', desc: 'Scored 100% accuracy on any assignment!', points: 150, icon: 'perfect_scholar', category: 'General', rarity: 'uncommon' },
    { id: 'PERFECTIONIST', title: 'Perfectionist', desc: '3 consecutive perfect scores. Exceptional!', points: 250, icon: 'perfectionist', category: 'General', rarity: 'rare' },
    { id: 'ACCURACY_CHAMPION', title: 'Accuracy Champion', desc: '5 consecutive perfect practice drills!', points: 300, icon: 'accuracy_champion', category: 'General', rarity: 'rare' },
    { id: 'FIRST_ATTEMPT_WIN', title: 'First Strike', desc: '90%+ on your very first formal test!', points: 200, icon: 'first_strike', category: 'General', rarity: 'rare' },
    { id: 'SPEED_DEMON', title: 'Speed Demon', desc: '80%+ score using <30% of allowed time!', points: 200, icon: 'speed_demon', category: 'General', rarity: 'rare' },
    { id: 'COMEBACK_KID', title: 'Comeback Kid', desc: 'Improved score by 30%+ on the same test!', points: 200, icon: 'comeback_kid', category: 'General', rarity: 'uncommon' },
    { id: 'EPIC_COMEBACK', title: 'Epic Comeback', desc: 'From below 40% to above 80% in same subject!', points: 350, icon: 'epic_comeback', category: 'General', rarity: 'epic' },
    { id: 'RESILIENT', title: 'Resilient', desc: 'Bounced back above 50% after a rough patch!', points: 150, icon: 'resilient', category: 'General', rarity: 'common' },
    { id: 'KNOWLEDGE_SEEKER', title: 'Knowledge Seeker', desc: 'Practice drills in all 3 subjects!', points: 250, icon: 'knowledge_seeker', category: 'General', rarity: 'uncommon' },
    { id: 'VERSATILITY_AWARD', title: 'Polymath', desc: 'Tests across multiple subjects!', points: 200, icon: 'polymath', category: 'General', rarity: 'uncommon' },
    { id: 'SUBJECT_MASTERY', title: 'Academic Titan', desc: 'Reached Level 5 overall!', points: 300, icon: 'academic_titan', category: 'General', rarity: 'rare' },
    { id: 'SUBJECT_DEVOTEE', title: 'Subject Devotee', desc: '20+ submissions in a single subject!', points: 300, icon: 'subject_devotee', category: 'General', rarity: 'rare' },
    { id: 'CENTURION', title: 'Century Club', desc: '100 total submissions completed!', points: 500, icon: 'centurion', category: 'General', rarity: 'epic' },
    { id: 'GRIND_MODE', title: 'Grind Mode', desc: '5 submissions in a single day!', points: 150, icon: 'grind_mode', category: 'General', rarity: 'uncommon' },
    { id: 'TRIPLE_CROWN', title: 'Triple Crown', desc: 'Gold medals in all 3 subjects!', points: 600, icon: 'triple_crown', category: 'General', rarity: 'legendary' },
    { id: 'NIGHT_OWL', title: 'Night Owl', desc: 'Submitted after 10 PM!', points: 75, icon: 'night_owl', category: 'General', rarity: 'common' },
    { id: 'EARLY_BIRD', title: 'Early Bird', desc: 'Submitted before 7 AM!', points: 75, icon: 'early_bird', category: 'General', rarity: 'common' },

    // ── Physics Medals ──
    { id: 'Newtonian Pioneer_BRONZE_PHYSICS', title: 'Newtonian Pioneer', desc: 'First Physics submission!', points: 50, icon: 'newtonian_pioneer', category: 'Physics', rarity: 'common' },
    { id: 'Force Field Master_BRONZE_PHYSICS', title: 'Force Field Master', desc: '5 Physics submissions!', points: 60, icon: 'force_field_master', category: 'Physics', rarity: 'common' },
    { id: 'Wave Rider_BRONZE_PHYSICS', title: 'Wave Rider', desc: '>70% on a Physics practice drill!', points: 55, icon: 'wave_rider', category: 'Physics', rarity: 'common' },
    { id: "Galileo's Observer_SILVER_PHYSICS", title: "Galileo's Observer", desc: '3 Physics practice drills!', points: 75, icon: 'galileos_observer', category: 'Physics', rarity: 'uncommon' },
    { id: 'Relativistic Scholar_SILVER_PHYSICS', title: 'Relativistic Scholar', desc: '10 Physics submissions!', points: 100, icon: 'relativistic_scholar', category: 'Physics', rarity: 'uncommon' },
    { id: 'Optics Ace_SILVER_PHYSICS', title: 'Optics Ace', desc: '5 Physics practice drills!', points: 90, icon: 'optics_ace', category: 'Physics', rarity: 'uncommon' },
    { id: 'Quantum Leap_GOLD_PHYSICS', title: 'Quantum Leap', desc: '100% on a Physics test!', points: 100, icon: 'quantum_leap', category: 'Physics', rarity: 'rare' },
    { id: 'Einsteinian Genius_GOLD_PHYSICS', title: 'Einsteinian Genius', desc: '85%+ on 3 consecutive Physics tests!', points: 150, icon: 'einsteinian_genius', category: 'Physics', rarity: 'rare' },
    { id: 'Particle Pioneer_GOLD_PHYSICS', title: 'Particle Pioneer', desc: '20 Physics submissions!', points: 150, icon: 'particle_pioneer', category: 'Physics', rarity: 'rare' },
    { id: 'Cosmic Explorer_PLATINUM_PHYSICS', title: 'Cosmic Explorer', desc: '≥90% on Weekly/Monthly Physics!', points: 200, icon: 'cosmic_explorer', category: 'Physics', rarity: 'epic' },
    { id: 'Singularity_PLATINUM_PHYSICS', title: 'Singularity', desc: '100% on a Physics Monthly test!', points: 300, icon: 'singularity', category: 'Physics', rarity: 'legendary' },
    { id: 'Nobel Contender_PLATINUM_PHYSICS', title: 'Nobel Contender', desc: '50 Physics submissions!', points: 400, icon: 'nobel_contender', category: 'Physics', rarity: 'legendary' },

    // ── Chemistry Medals ──
    { id: 'Molecular Apprentice_BRONZE_CHEMISTRY', title: 'Molecular Apprentice', desc: 'First Chemistry submission!', points: 50, icon: 'molecular_apprentice', category: 'Chemistry', rarity: 'common' },
    { id: 'Lab Initiate_BRONZE_CHEMISTRY', title: 'Lab Initiate', desc: '5 Chemistry submissions!', points: 60, icon: 'lab_initiate', category: 'Chemistry', rarity: 'common' },
    { id: 'Titration Expert_BRONZE_CHEMISTRY', title: 'Titration Expert', desc: '>70% on a Chemistry practice drill!', points: 55, icon: 'titration_expert', category: 'Chemistry', rarity: 'common' },
    { id: "Alchemist's Trial_SILVER_CHEMISTRY", title: "Alchemist's Trial", desc: '3 Chemistry practice drills!', points: 75, icon: 'alchemists_trial', category: 'Chemistry', rarity: 'uncommon' },
    { id: 'Reaction Specialist_SILVER_CHEMISTRY', title: 'Reaction Specialist', desc: '10 Chemistry submissions!', points: 100, icon: 'reaction_specialist', category: 'Chemistry', rarity: 'uncommon' },
    { id: 'Organic Voyager_SILVER_CHEMISTRY', title: 'Organic Voyager', desc: '5 Chemistry practice drills!', points: 90, icon: 'organic_voyager', category: 'Chemistry', rarity: 'uncommon' },
    { id: 'Covalent Bond_GOLD_CHEMISTRY', title: 'Covalent Bond', desc: '100% on a Chemistry test!', points: 100, icon: 'covalent_bond', category: 'Chemistry', rarity: 'rare' },
    { id: 'Periodic Master_GOLD_CHEMISTRY', title: 'Periodic Master', desc: '85%+ on 3 consecutive Chemistry tests!', points: 150, icon: 'periodic_master', category: 'Chemistry', rarity: 'rare' },
    { id: 'Electrode Pioneer_GOLD_CHEMISTRY', title: 'Electrode Pioneer', desc: '20 Chemistry submissions!', points: 150, icon: 'electrode_pioneer', category: 'Chemistry', rarity: 'rare' },
    { id: 'Noble Gas Status_PLATINUM_CHEMISTRY', title: 'Noble Gas Status', desc: '≥90% on Weekly/Monthly Chemistry!', points: 200, icon: 'noble_gas_status', category: 'Chemistry', rarity: 'epic' },
    { id: 'Catalyst Prime_PLATINUM_CHEMISTRY', title: 'Catalyst Prime', desc: '100% on a Chemistry Monthly test!', points: 300, icon: 'catalyst_prime', category: 'Chemistry', rarity: 'legendary' },
    { id: 'Curie Award_PLATINUM_CHEMISTRY', title: 'Curie Award', desc: '50 Chemistry submissions!', points: 400, icon: 'curie_award', category: 'Chemistry', rarity: 'legendary' },

    // ── Mathematics Medals ──
    { id: 'Arithmetic Ace_BRONZE_MATHEMATICS', title: 'Arithmetic Ace', desc: 'First Mathematics submission!', points: 50, icon: 'arithmetic_ace', category: 'Mathematics', rarity: 'common' },
    { id: 'Geometry Initiate_BRONZE_MATHEMATICS', title: 'Geometry Initiate', desc: '5 Mathematics submissions!', points: 60, icon: 'geometry_initiate', category: 'Mathematics', rarity: 'common' },
    { id: 'Number Theorist_BRONZE_MATHEMATICS', title: 'Number Theorist', desc: '>70% on a Mathematics practice drill!', points: 55, icon: 'number_theorist', category: 'Mathematics', rarity: 'common' },
    { id: "Euler's Disciple_SILVER_MATHEMATICS", title: "Euler's Disciple", desc: '3 Mathematics practice drills!', points: 75, icon: 'eulers_disciple', category: 'Mathematics', rarity: 'uncommon' },
    { id: 'Algebra Specialist_SILVER_MATHEMATICS', title: 'Algebra Specialist', desc: '10 Mathematics submissions!', points: 100, icon: 'algebra_specialist', category: 'Mathematics', rarity: 'uncommon' },
    { id: 'Trigonometry Ace_SILVER_MATHEMATICS', title: 'Trigonometry Ace', desc: '5 Mathematics practice drills!', points: 90, icon: 'trigonometry_ace', category: 'Mathematics', rarity: 'uncommon' },
    { id: 'Pythagorean Explorer_GOLD_MATHEMATICS', title: 'Pythagorean Explorer', desc: '100% on a Mathematics test!', points: 100, icon: 'pythagorean_explorer', category: 'Mathematics', rarity: 'rare' },
    { id: 'Calculus Commander_GOLD_MATHEMATICS', title: 'Calculus Commander', desc: '85%+ on 3 consecutive Math tests!', points: 150, icon: 'calculus_commander', category: 'Mathematics', rarity: 'rare' },
    { id: 'Infinite Series_GOLD_MATHEMATICS', title: 'Infinite Series', desc: '20 Mathematics submissions!', points: 150, icon: 'infinite_series', category: 'Mathematics', rarity: 'rare' },
    { id: 'Fields Medalist_PLATINUM_MATHEMATICS', title: 'Fields Medalist', desc: '≥90% on Weekly/Monthly Mathematics!', points: 200, icon: 'fields_medalist', category: 'Mathematics', rarity: 'epic' },
    { id: "Ramanujan's Heir_PLATINUM_MATHEMATICS", title: "Ramanujan's Heir", desc: '100% on a Mathematics Monthly test!', points: 300, icon: 'ramanujans_heir', category: 'Mathematics', rarity: 'legendary' },
    { id: 'Abel Prize_PLATINUM_MATHEMATICS', title: 'Abel Prize', desc: '50 Mathematics submissions!', points: 400, icon: 'abel_prize', category: 'Mathematics', rarity: 'legendary' },

    // ── Special Cross-Subject Medals ──
    { id: 'Triple Scholar_BRONZE_SPECIAL', title: 'Triple Scholar', desc: '1 submission in all 3 subjects!', points: 100, icon: 'triple_scholar', category: 'Special', rarity: 'uncommon' },
    { id: 'Multidisciplinary_SILVER_SPECIAL', title: 'Multidisciplinary', desc: '5 submissions in each subject!', points: 200, icon: 'multidisciplinary', category: 'Special', rarity: 'rare' },
    { id: 'Omniscient_GOLD_SPECIAL', title: 'Omniscient', desc: '10 submissions in each subject!', points: 300, icon: 'omniscient', category: 'Special', rarity: 'epic' },
    { id: 'Polymath Supreme_PLATINUM_SPECIAL', title: 'Polymath Supreme', desc: '100% in each of the 3 subjects!', points: 600, icon: 'polymath_supreme', category: 'Special', rarity: 'legendary' },
    { id: 'Grand Champion_PLATINUM_SPECIAL', title: 'Grand Champion', desc: 'All 3 gold medals + Triple Crown!', points: 800, icon: 'grand_champion', category: 'Special', rarity: 'legendary' },
  ]

  const renderProfile = () => {
    const totalXP = overview?.totalXP ?? 0
    const currentLevel = overview?.currentLevel ?? 1
    const xpInCurrentLevel = totalXP % 500
    const xpPercent = (xpInCurrentLevel / 500) * 100
    const streakCount = overview?.streakCount ?? 0

    const physicsXp = overview?.physicsXp ?? 0
    const physicsLevel = Math.floor(physicsXp / 500) + 1
    const physicsXpInLevel = physicsXp % 500
    const physicsXpPercent = (physicsXpInLevel / 500) * 100
    
    const chemistryXp = overview?.chemistryXp ?? 0
    const chemistryLevel = Math.floor(chemistryXp / 500) + 1
    const chemistryXpInLevel = chemistryXp % 500
    const chemistryXpPercent = (chemistryXpInLevel / 500) * 100
    
    const mathematicsXp = overview?.mathematicsXp ?? 0
    const mathLevel = Math.floor(mathematicsXp / 500) + 1
    const mathematicsXpInLevel = mathematicsXp % 500
    const mathXpPercent = (mathematicsXpInLevel / 500) * 100

    const totalMedals = MEDALS_LIST.length
    const unlockedMedals = MEDALS_LIST.filter(item =>
      item.category === 'General'
        ? overview?.achievements?.some(a => a.achievementType === item.id)
        : overview?.medals?.some(m => `${m.medalName}_${m.medalType}_${m.subject}` === item.id)
    ).length
    const medalCompletionPercent = Math.round((unlockedMedals / totalMedals) * 100)

    const filteredMedals = MEDALS_LIST.filter(item => medalFilter === 'all' || item.category === medalFilter)
    const pageSize = 10
    const totalPages = Math.max(1, Math.ceil(filteredMedals.length / pageSize))
    const safePageIndex = Math.min(medalsPageIndex, totalPages - 1)
    const paginatedMedals = filteredMedals.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize)

    return (
      <>
        <div className="gamified-profile-container">
          <div className="profile-hero-card">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-circle">
                {(user?.fullName || user?.username || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="profile-avatar-level">
                {currentLevel}
              </div>
            </div>

            <h3 className="profile-name">{user?.fullName || user?.username}</h3>
            <span className="profile-role-badge">STUDENT ACCOUNT</span>
            
            <div className="streak-badge justify-center py-2.5 mb-6 animate-pulse" style={{ width: '100%' }}>
              <Flame size={16} fill="currentColor" /> {streakCount} Day Homework Streak!
            </div>

            <div className="profile-xp-bar-container">
              <div className="xp-bar-label">
                <span>XP Level progress</span>
                <span>{xpInCurrentLevel} / 500 XP</span>
              </div>
              <div className="xp-bar-track">
                <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
              </div>
              <span className="xp-next-level">{500 - xpInCurrentLevel} XP left to Level {currentLevel + 1}</span>
            </div>
          </div>

          <div className="bento-mastery-grid">
            <div className="subject-mastery-card subject-physics">
              <div className="subject-mastery-header">
                <span className="subject-mastery-title">Physics Mastery</span>
                <div className="subject-mastery-icon-box">⚛️</div>
              </div>
              <div>
                <div className="subject-mastery-xp">{physicsXp} XP</div>
                <div className="subject-mastery-rank">Rank: LVL {physicsLevel}</div>
              </div>
              <div className="subject-mastery-progress-wrapper">
                <div className="subject-progress-label">
                  <span>Level progress</span>
                  <span>{physicsXpInLevel} / 500 XP</span>
                </div>
                <div className="subject-progress-track">
                  <div className="subject-progress-fill" style={{ width: `${physicsXpPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="subject-mastery-card subject-chemistry">
              <div className="subject-mastery-header">
                <span className="subject-mastery-title">Chemistry Mastery</span>
                <div className="subject-mastery-icon-box">🧪</div>
              </div>
              <div>
                <div className="subject-mastery-xp">{chemistryXp} XP</div>
                <div className="subject-mastery-rank">Rank: LVL {chemistryLevel}</div>
              </div>
              <div className="subject-mastery-progress-wrapper">
                <div className="subject-progress-label">
                  <span>Level progress</span>
                  <span>{chemistryXpInLevel} / 500 XP</span>
                </div>
                <div className="subject-progress-track">
                  <div className="subject-progress-fill" style={{ width: `${chemistryXpPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="subject-mastery-card subject-mathematics">
              <div className="subject-mastery-header">
                <span className="subject-mastery-title">Math Mastery</span>
                <div className="subject-mastery-icon-box">🔢</div>
              </div>
              <div>
                <div className="subject-mastery-xp">{mathematicsXp} XP</div>
                <div className="subject-mastery-rank">Rank: LVL {mathLevel}</div>
              </div>
              <div className="subject-mastery-progress-wrapper">
                <div className="subject-progress-label">
                  <span>Level progress</span>
                  <span>{mathematicsXpInLevel} / 500 XP</span>
                </div>
                <div className="subject-progress-track">
                  <div className="subject-progress-fill" style={{ width: `${mathXpPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card 
          title="🎓 Student Medal Case & Achievements" 
          subtitle="Your earned badges — filter by category" 
          variant="gradient"
          actions={
            <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="bg-white/5 border border-white/10 p-0.5 rounded-lg text-xs" style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px', borderRadius: '8px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMedalsViewMode('wizard'); }}
                  className="px-2.5 py-1 rounded-md font-bold transition-all duration-200"
                  style={{
                    background: medalsViewMode === 'wizard' ? 'var(--color-primary-500)' : 'transparent',
                    color: medalsViewMode === 'wizard' ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px'
                  }}
                >
                  Wizard 🧙‍♂️
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMedalsViewMode('scroll'); }}
                  className="px-2.5 py-1 rounded-md font-bold transition-all duration-200"
                  style={{
                    background: medalsViewMode === 'scroll' ? 'var(--color-primary-500)' : 'transparent',
                    color: medalsViewMode === 'scroll' ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px'
                  }}
                >
                  Scroller 📜
                </button>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setMedalsExpanded(!medalsExpanded); }}
                className="px-2.5 py-1 rounded-lg font-bold transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: '11px',
                  padding: '5px 10px',
                  borderRadius: '8px'
                }}
              >
                {medalsExpanded ? 'Collapse 🔼' : 'Expand 🔽'}
              </button>
            </div>
          }
        >
          {/* Medal Case Completion Stats */}
          <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
            <div className="flex justify-between items-center mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="text-xs font-bold text-white/60 tracking-wider uppercase" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>Medal Case Completion</span>
              <span className="text-xs font-mono font-bold text-yellow-400" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>{unlockedMedals} / {totalMedals} Earned ({medalCompletionPercent}%)</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full" 
                style={{ 
                  width: `${medalCompletionPercent}%`, 
                  height: '100%',
                  background: 'linear-gradient(90deg, #fbbf24, #f97316)',
                  borderRadius: '9999px',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} 
              />
            </div>
          </div>

          {/* Category filter tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {(['all', 'General', 'Physics', 'Chemistry', 'Mathematics', 'Special'] as const).map((cat) => {
              const catUnlocked = cat === 'all'
                ? unlockedMedals
                : MEDALS_LIST.filter(item => item.category === cat).filter(item =>
                    item.category === 'General'
                      ? overview?.achievements?.some(a => a.achievementType === item.id)
                      : overview?.medals?.some(m => `${m.medalName}_${m.medalType}_${m.subject}` === item.id)
                  ).length
              const catTotal = cat === 'all' ? totalMedals : MEDALS_LIST.filter(i => i.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setMedalFilter(cat)
                    setMedalsPageIndex(0)
                  }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: medalFilter === cat ? '1.5px solid var(--color-primary-500)' : '1px solid rgba(255,255,255,0.12)',
                    background: medalFilter === cat ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                    color: medalFilter === cat ? 'var(--color-primary-400)' : 'var(--text-soft)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {cat === 'all' ? 'All' : cat} <span style={{ opacity: 0.7 }}>({catUnlocked}/{catTotal})</span>
                </button>
              )
            })}
          </div>

          {/* Collapsible Wrapper wrapper */}
          <div className={`medal-case-collapse-wrapper ${medalsExpanded ? 'expanded' : 'collapsed'}`}>
            {medalsViewMode === 'scroll' ? (
              <div className="medal-case-scroll-container custom-scrollbar">
                <div className="medal-case-grid">
                  {filteredMedals.map((item) => {
                    const isUnlocked = item.category === 'General'
                      ? overview?.achievements?.some(a => a.achievementType === item.id)
                      : overview?.medals?.some(m => `${m.medalName}_${m.medalType}_${m.subject}` === item.id)

                    const subjectClass = item.category === 'Physics' ? 'subject-physics'
                      : item.category === 'Chemistry' ? 'subject-chemistry'
                      : item.category === 'Mathematics' ? 'subject-mathematics'
                      : item.category === 'Special' ? 'subject-special'
                      : ''

                    const rarityGlow = item.rarity === 'legendary' ? '0 0 14px rgba(251,191,36,0.5)'
                      : item.rarity === 'epic' ? '0 0 10px rgba(167,139,250,0.5)'
                      : 'none'

                    return (
                      <div 
                        key={item.id} 
                        className={`medal-slot ${isUnlocked ? 'unlocked' : 'locked'} ${subjectClass}`}
                        style={isUnlocked && rarityGlow !== 'none' ? { boxShadow: rarityGlow } : {}}
                        onClick={() => {
                          if (isUnlocked) {
                            setActiveCelebration({
                              type: 'MEDAL',
                              title: item.title,
                              subtitle: `${item.category} ${item.rarity === 'legendary' ? '✨ Legendary' : item.rarity === 'epic' ? '⚡ Epic' : item.rarity === 'rare' ? '💎 Rare' : ''}`,
                              description: item.desc,
                              points: item.points,
                              iconName: item.icon
                            })
                          }
                        }}
                      >
                        <div className="medal-icon-wrapper">
                          {renderBadgeIcon(item.icon, 36)}
                        </div>
                        <div className="medal-slot-title">{item.title}</div>
                        <div className="medal-slot-points">+{item.points} XP</div>
                        {item.rarity === 'legendary' && isUnlocked && (
                          <div style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>✨ Legendary</div>
                        )}
                        {item.rarity === 'epic' && isUnlocked && (
                          <div style={{ fontSize: '9px', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>⚡ Epic</div>
                        )}

                        <div className="medal-tooltip">
                          <h5>{item.title}</h5>
                          <p>{item.desc}</p>
                          <div className={`medal-tooltip-status ${isUnlocked ? 'unlocked' : 'locked'}`}>
                            {isUnlocked ? '🔓 UNLOCKED' : '🔒 LOCKED'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="medal-wizard-container">
                <div className="medal-case-grid">
                  {paginatedMedals.map((item) => {
                    const isUnlocked = item.category === 'General'
                      ? overview?.achievements?.some(a => a.achievementType === item.id)
                      : overview?.medals?.some(m => `${m.medalName}_${m.medalType}_${m.subject}` === item.id)

                    const subjectClass = item.category === 'Physics' ? 'subject-physics'
                      : item.category === 'Chemistry' ? 'subject-chemistry'
                      : item.category === 'Mathematics' ? 'subject-mathematics'
                      : item.category === 'Special' ? 'subject-special'
                      : ''

                    const rarityGlow = item.rarity === 'legendary' ? '0 0 14px rgba(251,191,36,0.5)'
                      : item.rarity === 'epic' ? '0 0 10px rgba(167,139,250,0.5)'
                      : 'none'

                    return (
                      <div 
                        key={item.id} 
                        className={`medal-slot ${isUnlocked ? 'unlocked' : 'locked'} ${subjectClass}`}
                        style={isUnlocked && rarityGlow !== 'none' ? { boxShadow: rarityGlow } : {}}
                        onClick={() => {
                          if (isUnlocked) {
                            setActiveCelebration({
                              type: 'MEDAL',
                              title: item.title,
                              subtitle: `${item.category} ${item.rarity === 'legendary' ? '✨ Legendary' : item.rarity === 'epic' ? '⚡ Epic' : item.rarity === 'rare' ? '💎 Rare' : ''}`,
                              description: item.desc,
                              points: item.points,
                              iconName: item.icon
                            })
                          }
                        }}
                      >
                        <div className="medal-icon-wrapper">
                          {renderBadgeIcon(item.icon, 36)}
                        </div>
                        <div className="medal-slot-title">{item.title}</div>
                        <div className="medal-slot-points">+{item.points} XP</div>
                        {item.rarity === 'legendary' && isUnlocked && (
                          <div style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>✨ Legendary</div>
                        )}
                        {item.rarity === 'epic' && isUnlocked && (
                          <div style={{ fontSize: '9px', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>⚡ Epic</div>
                        )}

                        <div className="medal-tooltip">
                          <h5>{item.title}</h5>
                          <p>{item.desc}</p>
                          <div className={`medal-tooltip-status ${isUnlocked ? 'unlocked' : 'locked'}`}>
                            {isUnlocked ? '🔓 UNLOCKED' : '🔒 LOCKED'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Wizard Pagination Controls */}
                {totalPages > 1 && (
                  <div className="wizard-pagination">
                    <button
                      className="wizard-nav-btn"
                      disabled={safePageIndex === 0}
                      onClick={(e) => { e.stopPropagation(); setMedalsPageIndex(prev => Math.max(0, prev - 1)); }}
                      style={{ border: '1px solid var(--border-strong)', cursor: safePageIndex === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      ◀
                    </button>
                    
                    <div className="wizard-dots" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          className={`wizard-dot ${safePageIndex === idx ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setMedalsPageIndex(idx); }}
                          style={{ border: 'none', cursor: 'pointer', padding: 0 }}
                          title={`Page ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      className="wizard-nav-btn"
                      disabled={safePageIndex === totalPages - 1}
                      onClick={(e) => { e.stopPropagation(); setMedalsPageIndex(prev => Math.min(totalPages - 1, prev + 1)); }}
                      style={{ border: '1px solid var(--border-strong)', cursor: safePageIndex === totalPages - 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="two-col mt-6">
          <Card title="Quick Actions" subtitle="Security and reference links" variant="glass">
            <div className="inline-actions">
              <Link to="/change-password">
                <Button variant="secondary">Change Password</Button>
              </Link>
              <Link to="/reward-explanation">
                <Button variant="secondary">Rewards Guide</Button>
              </Link>
              <Link to="/student/performance">
                <Button>Open Performance</Button>
              </Link>
            </div>
          </Card>

          <Card title="Learning Summary Details" subtitle="Enrolled batches and classroom context" variant="glass">
            <ul className="plain-list">
              <li><strong>Email:</strong> {user?.email ?? 'Not provided'}</li>
              <li><strong>Student ID:</strong> {user?.shortId || user?.username || 'N/A'}</li>
              <li><strong>Class Level:</strong> {user?.classLevel ? `Class ${user.classLevel}` : 'N/A'}</li>
              <li>
                <strong>Assigned Batches:</strong>
                {user?.batchLinks && user.batchLinks.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                    {user.batchLinks.map((link, idx) => (
                      <li key={idx} style={{ padding: '2px 0' }}>
                        {link.batch.name}
                      </li>
                    ))}
                  </ul>
                ) : ' No batches assigned'}
              </li>
            </ul>
          </Card>
        </div>
      </>
    )
  }

  const contentBySection: Record<DashboardSection, ReactElement> = {
    homework: renderHomework(),
    practice: renderPractice(),
    test: renderTest(),
    leaderboard: renderLeaderboard(),
    performance: renderPerformance(),
    profile: renderProfile(),
    'question-bank': <div className="empty-state">Access Denied</div>,
  }

  return (
    <DashboardLayout title={`Student ${sectionTitle[section]}`} navigation={navigation}>
      <div className="section-stack">
        {error ? <p className="error-text">{error}</p> : null}

        <Card title={sectionTitle[section]} subtitle={sectionSubtitle[section]} variant="gradient">
          <div className="inline-actions">
            <span className="status-pill status-upcoming">XP: {overview?.totalXP ?? 0}</span>
            <span className="status-pill status-completed">Level: {overview?.currentLevel ?? 1}</span>
            <span className="status-pill status-draft">Streak: {overview?.streakCount ?? 0} Days</span>
          </div>
        </Card>

        {contentBySection[section]}
      </div>

      <AnimatePresence>
        {selectedReportSubmissionId && (
          <TestReviewWizard
            submissionId={selectedReportSubmissionId}
            mode={reportWizardMode}
            onClose={() => setSelectedReportSubmissionId(null)}
            token={token}
            onReattempt={(testId) => {
              setSelectedReportSubmissionId(null)
              void handleReattempt(testId)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCelebration && (
          <GamificationCelebration
            type={activeCelebration.type}
            title={activeCelebration.title}
            subtitle={activeCelebration.subtitle}
            description={activeCelebration.description}
            points={activeCelebration.points}
            iconName={activeCelebration.iconName}
            onClose={() => setActiveCelebration(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}

interface ResultDetail {
  id: string
  testId: string
  studentId: string
  scoreTotal: number | null
  maxScore: number | null
  submittedAt: string | null
  aiAnalysisSummary: string | null
  test: {
    id: string
    title: string
    subject: string
    category: string
    questions: Array<{
      id: string
      text: string
      explanation: string | null
      options: Array<{
        id: string
        text: string
        isCorrect: boolean
      }>
    }>
  }
  answers: Array<{
    id: string
    questionId: string
    selectedOptionId: string | null
    isCorrect: boolean
    marksObtained: number
    question: {
      id: string
      text: string
      explanation: string | null
      options: Array<{
        id: string
        text: string
        isCorrect: boolean
      }>
    }
    selectedOption: {
      id: string
      text: string
      isCorrect: boolean
    } | null
  }>
}

interface TestReviewWizardProps {
  submissionId: string
  mode: 'practice' | 'homework' | 'assessment'
  onClose: () => void
  token: string | null
  onReattempt: (testId: string) => void
}

const TestReviewWizard = ({ submissionId, mode, onClose, token, onReattempt }: TestReviewWizardProps) => {
  const [detail, setDetail] = useState<ResultDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)

  useEffect(() => {
    const fetchResultDetail = async () => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<ResultDetail>(`/student/results/${submissionId}`, {
          token,
        })
        if (response) {
          setDetail(response)
        } else {
          setError('Failed to load assessment report details.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching report')
      } finally {
        setLoading(false)
      }
    }
    void fetchResultDetail()
  }, [submissionId, token])

  const modeLabel = mode === 'homework' ? 'Homework' : mode === 'assessment' ? 'Assessment' : 'Drill'

  if (loading) {
    return (
      <div className="report-modal-overlay">
        <div className="report-modal-box justify-center items-center py-12" style={{ maxWidth: '480px' }}>
          <Loader2 className="animate-spin text-primary-500 mb-4" size={40} />
          <p className="muted font-bold">Analyzing {modeLabel} Performance...</p>
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="report-modal-overlay">
        <div className="report-modal-box justify-center items-center p-8 text-center" style={{ maxWidth: '480px' }}>
          <XCircle className="text-danger mb-4" size={48} />
          <h3 className="mb-2 text-white">Oops! Something went wrong</h3>
          <p className="muted mb-6">{error || 'Unable to retrieve your report.'}</p>
          <Button onClick={onClose}>Close Report</Button>
        </div>
      </div>
    )
  }

  const subjectLower = detail.test.subject.toLowerCase()
  let themeStyles = {
    bg: 'from-indigo-600/20 to-purple-600/20 border-purple-500/30',
    pill: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    accent: 'var(--color-accent-600)',
    bar: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
    glow: 'rgba(139, 92, 246, 0.25)',
  }

  if (subjectLower.includes('math')) {
    themeStyles = {
      bg: 'from-blue-600/20 to-indigo-600/20 border-blue-500/30',
      pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      accent: 'var(--color-primary-500)',
      bar: 'linear-gradient(90deg, #3b82f6, #2563eb)',
      glow: 'rgba(59, 130, 246, 0.25)',
    }
  } else if (subjectLower.includes('chem')) {
    themeStyles = {
      bg: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/30',
      pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      accent: '#10b981',
      bar: 'linear-gradient(90deg, #10b981, #059669)',
      glow: 'rgba(16, 185, 129, 0.25)',
    }
  } else if (subjectLower.includes('phys')) {
    themeStyles = {
      bg: 'from-amber-600/20 to-orange-600/20 border-amber-500/30',
      pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      accent: '#f59e0b',
      bar: 'linear-gradient(90deg, #f59e0b, #d97706)',
      glow: 'rgba(245, 158, 11, 0.25)',
    }
  } else if (subjectLower.includes('biol')) {
    themeStyles = {
      bg: 'from-rose-600/20 to-pink-600/20 border-rose-500/30',
      pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      accent: '#f43f5e',
      bar: 'linear-gradient(90deg, #f43f5e, #e11d48)',
      glow: 'rgba(244, 63, 94, 0.25)',
    }
  }

  // Answer stats breakdown
  const totalQuestions = detail.answers.length
  const correctCount = detail.answers.filter((a) => a.isCorrect).length
  const skippedCount = detail.answers.filter((a) => a.selectedOptionId === null).length
  const incorrectCount = totalQuestions - correctCount - skippedCount
  const accuracyPercent = detail.maxScore && detail.scoreTotal !== null
    ? (detail.scoreTotal / detail.maxScore) * 100
    : 0

  const activeAnswer = detail.answers[activeQuestionIdx]
  const activeQuestion = activeAnswer?.question

  return (
    <div className="report-modal-overlay">
      <div
        className="report-modal-box"
        style={{
          '--subject-grad-bar': themeStyles.bar,
          '--subject-color-accent': themeStyles.accent,
          '--subject-glow': themeStyles.glow,
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className="report-modal-header">
          <div className="report-modal-header-info">
            <h3>{detail.test.title}</h3>
            <div className="report-modal-header-meta">
              <span className={`badge ${themeStyles.pill} border`}>{detail.test.subject}</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: mode === 'homework' ? 'rgba(59,130,246,0.1)' : mode === 'assessment' ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.1)',
                  color: mode === 'homework' ? '#3b82f6' : mode === 'assessment' ? '#f59e0b' : '#8b5cf6',
                  border: mode === 'homework' ? '1px solid rgba(59,130,246,0.2)' : mode === 'assessment' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(139,92,246,0.2)',
                }}
              >
                {mode === 'homework' ? '📚 Homework' : mode === 'assessment' ? '🏆 Assessment' : '🎯 Practice Drill'}
              </span>
              <span className="text-xs text-white/40">
                Completed on {detail.submittedAt ? formatShortDate(detail.submittedAt) : 'N/A'}
              </span>
            </div>
          </div>
          <button className="report-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="report-modal-body custom-scrollbar">
          {/* Quick Vitals Dashboard */}
          <div className="report-stats-card">
            <div className="report-stat-item">
              <span className="report-stat-label">Accuracy</span>
              <span
                className="report-stat-value font-mono"
                style={{ color: accuracyPercent >= 80 ? '#10b981' : accuracyPercent >= 50 ? '#f59e0b' : '#ef4444' }}
              >
                {accuracyPercent.toFixed(0)}%
              </span>
            </div>
            <div className="report-stat-item">
              <span className="report-stat-label">Correct</span>
              <span className="report-stat-value text-success font-mono">{correctCount}</span>
            </div>
            <div className="report-stat-item">
              <span className="report-stat-label">Incorrect</span>
              <span className="report-stat-value text-danger font-mono">{incorrectCount}</span>
            </div>
            <div className="report-stat-item">
              <span className="report-stat-label">Skipped</span>
              <span className="report-stat-value muted font-mono">{skippedCount}</span>
            </div>
          </div>

          {/* AI Mentorship Banner */}
          {detail.aiAnalysisSummary && (
            <div className="report-ai-banner">
              <div className="report-ai-icon-box">
                <Sparkles size={20} />
              </div>
              <div className="report-ai-content">
                <h4>AI Mentorship Insight</h4>
                <p className="report-ai-summary">"{detail.aiAnalysisSummary}"</p>
              </div>
            </div>
          )}

          {/* Interactive Questions Stepper Grid */}
          <div className="report-stepper-grid">
            {/* Stepper Index column */}
            <div className="report-question-list">
              <h4>Questions</h4>
              <div className="report-question-tabs">
                {detail.answers.map((ans, idx) => {
                  let statusClass = 'skipped'
                  if (ans.selectedOptionId !== null) {
                    statusClass = ans.isCorrect ? 'correct' : 'incorrect'
                  }
                  const isActive = activeQuestionIdx === idx
                  return (
                    <button
                      key={ans.id}
                      className={`report-q-tab ${statusClass} ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveQuestionIdx(idx)}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Active Question Inspector */}
            {activeQuestion && activeAnswer && (
              <div className="report-question-inspector">
                <div className="report-inspector-header">
                  <span>Question {activeQuestionIdx + 1} of {totalQuestions}</span>
                  <span
                    className="font-mono px-2 py-0.5 rounded-md text-[11px] font-bold"
                    style={{
                      background: activeAnswer.selectedOptionId === null
                        ? 'rgba(255, 255, 255, 0.05)'
                        : activeAnswer.isCorrect
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                      color: activeAnswer.selectedOptionId === null
                        ? 'var(--text-soft)'
                        : activeAnswer.isCorrect
                        ? '#10b981'
                        : '#ef4444',
                      border: activeAnswer.selectedOptionId === null
                        ? '1px solid var(--border-soft)'
                        : activeAnswer.isCorrect
                        ? '1px solid rgba(16, 185, 129, 0.2)'
                        : '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    {activeAnswer.selectedOptionId === null
                      ? 'SKIPPED'
                      : activeAnswer.isCorrect
                      ? `CORRECT (+${activeAnswer.marksObtained} Marks)`
                      : 'INCORRECT (0 Marks)'}
                  </span>
                </div>

                <p className="report-question-text">{activeQuestion.text}</p>

                <div className="report-options-list">
                  {activeQuestion.options.map((opt, oIdx) => {
                    const optionLetter = String.fromCharCode(65 + oIdx)
                    const isCorrect = opt.isCorrect
                    const isSelected = activeAnswer.selectedOptionId === opt.id

                    let optionClass = ''
                    if (isSelected) {
                      optionClass = isCorrect ? 'chosen-correct' : 'chosen-incorrect'
                    } else if (isCorrect) {
                      optionClass = 'correct-unselected'
                    }

                    return (
                      <div key={opt.id} className={`report-option-card ${optionClass}`}>
                        <span className="report-option-letter">{optionLetter}</span>
                        <span className="flex-1">{opt.text}</span>
                        {isSelected && isCorrect && (
                          <CheckCircle2 className="text-success ml-auto flex-shrink-0" size={18} />
                        )}
                        {isSelected && !isCorrect && (
                          <XCircle className="text-danger ml-auto flex-shrink-0" size={18} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {activeQuestion.explanation && (
                  <div className="report-explanation-box">
                    <div className="report-explanation-title">
                      <Sparkles size={13} />
                      Concept Explanation
                    </div>
                    <p className="report-explanation-text">{activeQuestion.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="report-modal-footer">
          {mode === 'practice' ? (
            <Button
              variant="secondary"
              size="sm"
              className="!text-purple-400 !border-purple-500/20 hover:!bg-purple-500/10 hover:!border-purple-500/40"
              onClick={() => onReattempt(detail.test.id)}
            >
              Reattempt Drill 🔄
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close {mode === 'homework' ? 'Homework' : 'Assessment'} Report
            </Button>
          )}

          <div className="report-nav-btns">
            <Button
              variant="secondary"
              size="sm"
              disabled={activeQuestionIdx === 0}
              onClick={() => setActiveQuestionIdx((prev) => prev - 1)}
            >
              <ChevronLeft size={16} className="mr-1" /> Previous
            </Button>
            {activeQuestionIdx < totalQuestions - 1 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveQuestionIdx((prev) => prev + 1)}
              >
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close Report
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
