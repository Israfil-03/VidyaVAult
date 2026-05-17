import {
  CalendarClock,
  CircleCheckBig,
  Clock3,
  Flame,
  ListChecks,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'

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

interface StudentOverview {
  active: number
  upcoming: number
  completed: number
  activeHomework: number
  streakCount: number
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
  }, [token, user?.username])

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

  const subjectPracticeData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of completedTests) {
      counts.set(row.subject, (counts.get(row.subject) ?? 0) + 1)
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value }))
  }, [completedTests])

  const weakestAttempts = useMemo(
    () =>
      completedTests
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
    [completedTests],
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
                <Link to={`/student/performance/${row.id}`}>
                  <Button variant="secondary" size="sm">Review</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )

  const renderPractice = () => (
    <>
      <div className="two-col">
        <Card title="Practice Coverage by Subject" subtitle="Completed attempts per subject" variant="glass">
          <ComparisonBarChart data={subjectPracticeData} />
        </Card>
        <Card title="Accuracy Trend" subtitle="Recent practice quality" variant="glass">
          <TrendAreaChart data={scoreTrendData} valueSuffix="%" />
        </Card>
      </div>

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
                  <Link to={`/student/performance/${attempt.submissionId}`}>
                    <Button variant="secondary" size="sm">
                      Review
                    </Button>
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
  const renderTest = () => {
    const weeklyTests = activeTests.filter((t) => t.category === 'WEEKLY_TEST')
    const monthlyTests = activeTests.filter((t) => t.category === 'MONTHLY_TEST')
    const upcomingSchoolTests = upcomingTests.filter((t) => t.category === 'WEEKLY_TEST' || t.category === 'MONTHLY_TEST')
    return (
      <>
        <div className="two-col">
          <Card title="Weekly Assessments" subtitle="Regular progress checks" variant="glass">
            {weeklyTests.length === 0 ? (
              <div className="empty-state">No active weekly tests.</div>
            ) : (
              <div className="premium-list">
                {weeklyTests.map((test, idx) => (
                  <div key={test.id} className={`premium-item fade-in-up stagger-${(idx % 4) + 1}`}>
                    <div>
                      <strong>{test.title}</strong>
                      <div className="muted">
                        {test.subject} • {test._count.questions} Qs • ends {formatShortDate(test.endTime)}
                      </div>
                    </div>
                    <Link to={`/student/tests/${test.id}/take`}>
                      <Button size="sm">Attempt</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Monthly Assessments" subtitle="Monthly milestone tests" variant="glass">
            {monthlyTests.length === 0 ? (
              <div className="empty-state">No active monthly tests.</div>
            ) : (
              <div className="premium-list">
                {monthlyTests.map((test) => (
                  <div key={test.id} className="premium-item">
                    <div>
                      <strong>{test.title}</strong>
                      <div className="muted">
                        {test.subject} • {test._count.questions} Qs • ends {formatShortDate(test.endTime)}
                      </div>
                    </div>
                    <Link to={`/student/tests/${test.id}/take`}>
                      <Button size="sm">Attempt</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="two-col">
          <Card title="Upcoming Assessments" subtitle="Plan your revision" variant="glass">
            {upcomingSchoolTests.length === 0 ? (
              <div className="empty-state">No upcoming assessments.</div>
            ) : (
              <ul className="plain-list">
                {upcomingSchoolTests.map((test) => (
                  <li key={test.id}>
                    <strong>{test.title}</strong>
                    <div className="muted">
                      {test.subject} • {test.category.replace('_', ' ')} • {formatShortDate(test.startTime)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Readiness Snapshot" subtitle="Quick indicators before you start" variant="glass">
            <div className="stats-grid">
              <StatCard label="Ready Now" value={weeklyTests.length + monthlyTests.length} icon={<Clock3 size={18} />} />
              <StatCard label="Upcoming" value={upcomingSchoolTests.length} icon={<CalendarClock size={18} />} tone="warning" />
              <StatCard
                label="Avg. Performance"
                value={`${averageScore.toFixed(1)}%`}
                icon={<Sparkles size={18} />}
                tone="success"
              />
              <StatCard label="Streak Points" value={Math.max(1, completedTests.length)} icon={<Flame size={18} />} />
            </div>
          </Card>
        </div>

        <Card title="Test Records & Results" subtitle="Your past formal assessments" variant="glass">
          {results.filter(r => r.test.category !== 'HOMEWORK').length === 0 ? (
            <div className="empty-state">No test records yet.</div>
          ) : (
            <div className="premium-list">
              {results.filter(r => r.test.category !== 'HOMEWORK').map((row) => (
                <div key={row.id} className="premium-item">
                  <div>
                    <strong>{row.test.title}</strong>
                    <div className="muted">
                      {row.test.subject} • {row.test.category.replace('_', ' ')} • {row.scoreTotal ?? 0}/{row.maxScore ?? 0}
                    </div>
                  </div>
                  <Link to={`/student/performance/${row.id}`}>
                    <Button variant="secondary" size="sm">View Detailed Report</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Readiness Snapshot" subtitle="Quick indicators before you start" variant="glass">
          <div className="stats-grid">
            <StatCard label="Ready Now" value={activeTests.filter(t => t.category !== 'HOMEWORK').length} icon={<Clock3 size={18} />} />
            <StatCard label="Upcoming" value={upcomingTests.filter(t => t.category !== 'HOMEWORK').length} icon={<CalendarClock size={18} />} tone="warning" />
            <StatCard
              label="Avg. Performance"
              value={`${averageScore.toFixed(1)}%`}
              icon={<Sparkles size={18} />}
              tone="success"
            />
            <StatCard label="Streak Points" value={Math.max(1, completedTests.length)} icon={<Flame size={18} />} />
          </div>
        </Card>
      </>
    )
  }

  const renderLeaderboard = () => (
    <>
      <div className="two-col">
        <Card title="Class Leaderboard" subtitle="Top students in your class" variant="glass">
          {classLeaderboard.length === 0 ? (
            <div className="empty-state">Leaderboard data not available yet.</div>
          ) : (
            <div className="premium-list">
              {classLeaderboard.slice(0, 8).map((entry) => (
                <div key={`${entry.rank}-${entry.username}`} className="premium-item">
                  <div>
                    <strong>
                      #{entry.rank} {entry.username} {entry.username === user?.username ? '(You)' : ''}
                    </strong>
                    <div className="muted">Score {(entry.normalizedScore * 100).toFixed(1)}%</div>
                  </div>
                  <span className="status-pill status-upcoming">Rank {entry.rank}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Batch Leaderboard" subtitle="Batch level performance comparison" variant="glass">
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

  const renderProfile = () => (
    <>
      <div className="two-col">
        <Card title="Student Profile" subtitle="Account and classroom identity" variant="glass">
          <ul className="plain-list">
            <li>
              <strong>Name:</strong> {(user?.fullName || user?.username) ?? '—'}
            </li>
            <li>
              <strong>Email:</strong> {user?.email ?? 'Not provided'}
            </li>
            <li>
              <strong>Role:</strong> Student
            </li>
            <li>
              <strong>Student ID (Short ID):</strong> {user?.shortId || user?.username || 'N/A'}
            </li>
            <li>
              <strong>Institute ID (Long ID):</strong> {user?.longId || 'N/A'}
            </li>
            <li>
              <strong>Phone Number:</strong> {user?.phone || 'N/A'}
            </li>
            <li>
              <strong>Class Level:</strong> {user?.classLevel ? `Class ${user.classLevel}` : 'N/A'}
            </li>
            <li>
              <strong>Enrolled Batches:</strong>
              {user?.batchLinks && user.batchLinks.length > 0 ? (
                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                  {user.batchLinks.map((link, idx) => (
                    <li key={idx} style={{ padding: '2px 0' }}>
                      {link.batch.name} <span className="muted" style={{ fontSize: '0.85em' }}>(by {link.batch.teacher.user.fullName || 'Teacher'})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                ' No batches assigned'
              )}
            </li>
          </ul>
        </Card>

        <Card title="Quick Actions" subtitle="Security and policy references" variant="glass">
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
      </div>

      <Card title="Learning Summary Card" subtitle="Your current academic heartbeat" variant="glass">
        <div className="stats-grid">
          <StatCard label="Active Homework" value={overview?.active ?? 0} icon={<ListChecks size={18} />} />
          <StatCard label="Completed Tests" value={results.length} icon={<CircleCheckBig size={18} />} tone="success" />
          <StatCard label="Average Score" value={`${averageScore.toFixed(1)}%`} icon={<Sparkles size={18} />} />
          <StatCard label="Class Position" value={classRank ? `#${classRank}` : '-'} icon={<UserRound size={18} />} />
        </div>
      </Card>
    </>
  )

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
            <span className="status-pill status-upcoming">Active: {overview?.active ?? 0}</span>
            <span className="status-pill status-completed">Completed: {overview?.completed ?? 0}</span>
            <span className="status-pill status-draft">Rank: {classRank ? `#${classRank}` : '-'}</span>
          </div>
        </Card>

        {contentBySection[section]}
      </div>
    </DashboardLayout>
  )
}
