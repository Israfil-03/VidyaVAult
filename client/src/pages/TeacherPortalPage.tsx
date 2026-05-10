import {
  Gauge,
  Layers2,
  Sparkles,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react'
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
import { HomeworkCard } from './HomeworkCard'
import { NewHomeworkCard } from './NewHomeworkCard'

interface TeacherOverview {
  studentCount: number
  upcomingTests: number
  activeTests: number
  recentSubmissions: number
}

interface StudentRow {
  id: string
  username: string
  email: string | null
  board: string
  medium: string
  classLevel: string
  rollNo?: string | null
  batchIds: string[]
}

interface BatchRow {
  id: string
  name: string
  medium: string
  classLevel: string
  boardTarget?: string | null
  _count?: {
    batchStudents: number
  }
}

interface TestRow {
  id: string
  title: string
  subject: string
  status: string
  category: string
  classLevel: string
  startTime: string
  endTime: string
  _count: {
    questions: number
    assignments: number
    submissions: number
  }
}

interface PracticeAttempt {
  id: string
  studentId: string
  studentName: string
  studentEmail: string | null
  batchName: string
  testTitle: string
  subject: string
  score: number | null
  maxScore: number | null
  submittedAt: string
}

const sectionTitle: Record<DashboardSection, string> = {
  homework: 'Homework Section',
  practice: 'Practice',
  test: 'Assessments',
  leaderboard: 'Leaderboard',
  performance: 'Student Performance',
  profile: 'Profile',
}

const sectionSubtitle: Record<DashboardSection, string> = {
  homework: 'Plan, publish, and track assigned homework.',
  practice: 'Track and analyze student performance in practice drills.',
  test: 'Create and monitor Weekly and Monthly assessments.',
  leaderboard: 'Review class and batch ranking insights.',
  performance: 'Inspect submission trends and learner outcomes.',
  profile: 'Profile, security, and account-level actions.',
}

const formatShortDate = (dateLike: string): string =>
  new Date(dateLike).toLocaleDateString([], { month: 'short', day: 'numeric' })

const getTestWindowStatus = (test: Pick<TestRow, 'startTime' | 'endTime'>): 'active' | 'upcoming' | 'closed' => {
  const now = Date.now()
  const start = new Date(test.startTime).getTime()
  const end = new Date(test.endTime).getTime()
  if (now < start) return 'upcoming'
  if (now > end) return 'closed'
  return 'active'
}

interface TeacherPortalPageProps {
  section: DashboardSection
}

export const TeacherPortalPage = ({ section }: TeacherPortalPageProps) => {
  const { token, user } = useAuth()
  const [overview, setOverview] = useState<TeacherOverview | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [tests, setTests] = useState<TestRow[]>([])
  const [classLeaderboard, setClassLeaderboard] = useState<
    Array<{ rank: number; username: string; normalizedScore: number }>
  >([])
  const [batchLeaderboard, setBatchLeaderboard] = useState<
    Array<{ rank: number; name: string; averageNormalizedScore: number; medium: string }>
  >([])
  const [practiceAttempts, setPracticeAttempts] = useState<PracticeAttempt[]>([])
  const [error, setError] = useState<string | null>(null)

  const [resetStudent, setResetStudent] = useState({
    studentId: '',
    newPassword: '',
  })

  const loadPortalData = useCallback(async () => {
    if (import.meta.env.VITE_UI_ONLY === 'true') {
      setOverview({
        studentCount: 48,
        activeTests: 3,
        upcomingTests: 5,
        recentSubmissions: 122,
      })
      setStudents([
        {
          id: 'ui-student-1',
          username: 'Aarav',
          email: 'aarav@example.com',
          board: 'WEST_BENGAL',
          medium: 'ENGLISH',
          classLevel: '10',
          batchIds: ['ui-batch-1'],
        },
      ])
      setBatches([
        {
          id: 'ui-batch-1',
          name: 'Alpha Batch',
          medium: 'ENGLISH',
          classLevel: '10',
          boardTarget: 'WEST_BENGAL',
          _count: { batchStudents: 24 },
        },
      ])
      setTests([
        {
          id: 'ui-test-1',
          title: 'Weekly Chemistry Homework',
          subject: 'CHEMISTRY',
          status: 'PUBLISHED',
          category: 'HOMEWORK',
          classLevel: '10',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 7200000).toISOString(),
          _count: { questions: 20, assignments: 2, submissions: 12 },
        },
      ])
      setClassLeaderboard([
        { rank: 1, username: 'Aarav', normalizedScore: 0.93 },
        { rank: 2, username: 'Riya', normalizedScore: 0.91 },
      ])
      setBatchLeaderboard([
        { rank: 1, name: 'Alpha Batch', medium: 'ENGLISH', averageNormalizedScore: 0.9 },
        { rank: 2, name: 'Beta Batch', medium: 'BENGALI', averageNormalizedScore: 0.84 },
      ])
      return
    }

    if (!token) {
      return
    }

    try {
      setError(null)
      const [overviewData, studentData, batchData, testData, classData, batchDataLb, practiceData] = await Promise.all([
        apiRequest<TeacherOverview>('/teacher/overview', { method: 'GET', token }),
        apiRequest<StudentRow[]>('/teacher/students', { method: 'GET', token }),
        apiRequest<BatchRow[]>('/teacher/batches', { method: 'GET', token }),
        apiRequest<TestRow[]>('/tests', { method: 'GET', token }),
        apiRequest<Array<{ rank: number; username: string; normalizedScore: number }>>('/leaderboards/class', {
          method: 'GET',
          token,
        }),
        apiRequest<Array<{ rank: number; name: string; averageNormalizedScore: number; medium: string }>>(
          '/leaderboards/batch',
          {
            method: 'GET',
            token,
          },
        ),
        apiRequest<PracticeAttempt[]>('/teacher/practice-attempts', { method: 'GET', token }),
      ])
      setOverview(overviewData)
      setStudents(studentData)
      setBatches(batchData)
      setTests(testData)
      setClassLeaderboard(classData)
      setBatchLeaderboard(batchDataLb)
      setPracticeAttempts(practiceData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher portal')
    }
  }, [token])

  useEffect(() => {
    void loadPortalData()
  }, [loadPortalData])

  const resetStudentPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      return
    }
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        token,
        body: JSON.stringify(resetStudent),
      })
      setResetStudent({ studentId: '', newPassword: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset student password')
    }
  }

  const navigation = getDashboardNavigation('teacher')

  const testStatusCounts = useMemo(() => {
    const countByStatus = new Map<string, number>()
    const relevantTests = section === 'homework' 
      ? tests.filter(t => t.category === 'HOMEWORK')
      : tests.filter(t => t.category !== 'HOMEWORK')

    for (const test of relevantTests) {
      countByStatus.set(test.status, (countByStatus.get(test.status) ?? 0) + 1)
    }
    return [...countByStatus.entries()].map(([label, value]) => ({ label, value }))
  }, [tests, section])

  const submissionTrendData = useMemo(() => {
    const relevantTests = section === 'homework' 
      ? tests.filter(t => t.category === 'HOMEWORK')
      : tests.filter(t => t.category !== 'HOMEWORK')

    return relevantTests.slice(0, 8).map((test, index) => ({
      label: `T${index + 1}`,
      value: test._count.submissions,
    }))
  }, [tests, section])

  const classLeaderboardChartData = useMemo(
    () =>
      classLeaderboard.slice(0, 8).map((entry) => ({
        label: entry.username,
        value: Number((entry.normalizedScore * 100).toFixed(1)),
      })),
    [classLeaderboard],
  )

  const batchLeaderboardChartData = useMemo(
    () =>
      batchLeaderboard.slice(0, 8).map((entry) => ({
        label: `${entry.name} (${entry.medium.slice(0, 3)})`,
        value: Number((entry.averageNormalizedScore * 100).toFixed(1)),
      })),
    [batchLeaderboard],
  )

  const studentMediumData = useMemo(() => {
    const mediumCounts = new Map<string, number>()
    for (const student of students) {
      mediumCounts.set(student.medium, (mediumCounts.get(student.medium) ?? 0) + 1)
    }
    return [...mediumCounts.entries()].map(([label, value]) => ({ label, value }))
  }, [students])

  const studentBoardData = useMemo(() => {
    const boardCounts = new Map<string, number>()
    for (const student of students) {
      boardCounts.set(student.board, (boardCounts.get(student.board) ?? 0) + 1)
    }
    return [...boardCounts.entries()].map(([label, value]) => ({ label, value }))
  }, [students])

  const renderHomework = () => {
    const homeworkTests = tests.filter(t => t.category === 'HOMEWORK')
    return (
      <div className="fade-in-up">
        <div className="two-col" style={{ alignItems: 'start' }}>
          <HomeworkCard tests={homeworkTests} formatShortDate={formatShortDate} getTestWindowStatus={getTestWindowStatus} />
          <NewHomeworkCard batches={batches} onCreated={loadPortalData} />
        </div>
      </div>
    )
  }

  const renderPractice = () => (
    <div className="fade-in-up">
      <Card 
        title="Student Practice Attempts" 
        subtitle="Monitor real-time progress of students in practice drills"
        variant="glass"
      >
        {practiceAttempts.length === 0 ? (
          <div className="empty-state py-12">
            <div className="flex flex-col items-center gap-4">
              <Sparkles className="text-primary/40" size={48} />
              <p className="muted">No practice attempts recorded yet.</p>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Test Title</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Date</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {practiceAttempts.map((attempt) => {
                  const percentage = attempt.score !== null && attempt.maxScore ? (attempt.score / attempt.maxScore) * 100 : 0
                  return (
                    <tr key={attempt.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{attempt.studentName}</span>
                          <span className="text-xs muted">{attempt.studentEmail || 'No email'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="bg-white/5 px-2 py-1 rounded border border-white/10 text-xs text-primary-soft">
                          {attempt.batchName}
                        </span>
                      </td>
                      <td>{attempt.testTitle}</td>
                      <td>
                         <span className="subject-pill text-[10px]">
                           {attempt.subject}
                         </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm">
                            {attempt.score?.toFixed(1) || '0.0'} / {attempt.maxScore?.toFixed(1) || '0.0'}
                          </span>
                          <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${percentage >= 80 ? 'bg-success' : percentage >= 50 ? 'bg-warning' : 'bg-error'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs muted">
                          {new Date(attempt.submittedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="text-right">
                         <span className="status-pill status-published text-[10px]">
                           SUBMITTED
                         </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )

  const renderTest = () => {
    const weeklyTests = tests.filter((t) => t.category === 'WEEKLY_TEST')
    const monthlyTests = tests.filter((t) => t.category === 'MONTHLY_TEST')
    
    const renderTable = (testList: TestRow[], emptyMsg: string) => (
      testList.length === 0 ? (
        <div className="empty-state">{emptyMsg}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Submissions</th>
              </tr>
            </thead>
            <tbody>
              {testList.map((test) => (
                <tr key={test.id}>
                  <td>{test.title}</td>
                  <td>{test.subject}</td>
                  <td>
                    <span className={`status-pill status-${test.status.toLowerCase()}`}>{test.status}</span>
                  </td>
                  <td>{test._count.submissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    )

    return (
      <>
        <div className="stack-gap">
          <Card
            title="Weekly Test Inventory"
            subtitle="Regular progress checks"
            variant="glass"
            actions={
              <Link to="/teacher/test/new">
                <Button size="sm">New Weekly Test</Button>
              </Link>
            }
          >
            {renderTable(weeklyTests, "No weekly tests created yet.")}
          </Card>

          <Card
            title="Monthly Test Inventory"
            subtitle="Monthly milestone assessments"
            variant="glass"
            actions={
              <Link to="/teacher/test/new">
                <Button size="sm">New Monthly Test</Button>
              </Link>
            }
          >
            {renderTable(monthlyTests, "No monthly tests created yet.")}
          </Card>
        </div>

        <div className="two-col">
          <Card title="Test Activity Trend" subtitle="Submission movement across recent tests" variant="glass">
            <TrendAreaChart data={submissionTrendData} />
          </Card>
          <Card title="Pipeline Status Cards" subtitle="Total tests by state" variant="glass">
            <ComparisonBarChart data={testStatusCounts} />
          </Card>
        </div>
      </>
    )
  }

  const renderLeaderboard = () => (
    <>
      <div className="two-col">
        <Card title="Class Leaderboard Trend" subtitle="Top class scores" variant="glass">
          <TrendAreaChart data={classLeaderboardChartData} valueSuffix="%" />
        </Card>
        <Card title="Batch Comparison" subtitle="Cross-batch normalized scores" variant="glass">
          <ComparisonBarChart data={batchLeaderboardChartData} valueSuffix="%" />
        </Card>
      </div>

      <div className="two-col">
        <Card title="Top Class Performers" variant="glass">
          {classLeaderboard.length === 0 ? (
            <div className="empty-state">No leaderboard records yet.</div>
          ) : (
            <ul className="plain-list">
              {classLeaderboard.slice(0, 8).map((entry) => (
                <li key={`${entry.rank}-${entry.username}`}>
                  <strong>
                    #{entry.rank} {entry.username}
                  </strong>
                  <div className="muted">Score {(entry.normalizedScore * 100).toFixed(1)}%</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Top Batch Performers" variant="glass">
          {batchLeaderboard.length === 0 ? (
            <div className="empty-state">No batch performance records yet.</div>
          ) : (
            <ul className="plain-list">
              {batchLeaderboard.slice(0, 8).map((entry) => (
                <li key={`${entry.rank}-${entry.name}`}>
                  <strong>
                    #{entry.rank} {entry.name}
                  </strong>
                  <div className="muted">
                    {entry.medium} • {(entry.averageNormalizedScore * 100).toFixed(1)}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )

  const renderPerformance = () => (
    <>
      <div className="two-col">
        <Card title="Submission Trend" subtitle="Submission count trend by recent tests" variant="glass">
          <TrendAreaChart data={submissionTrendData} />
        </Card>
        <Card title="Student Medium Distribution" subtitle="Current learner medium split" variant="glass">
          <ComparisonBarChart data={studentMediumData} />
        </Card>
      </div>

      <div className="two-col">
        <Card title="Student Board Distribution" subtitle="Board split for teaching scope" variant="glass">
          <ComparisonBarChart data={studentBoardData} />
        </Card>
        <Card title="Performance Quick Stats" variant="glass">
          <div className="stats-grid">
            <StatCard label="Students" value={students.length} icon={<Users size={18} />} />
            <StatCard label="Batches" value={batches.length} icon={<Layers2 size={18} />} />
            <StatCard
              label="Avg Submissions/Test"
              value={tests.length ? (tests.reduce((sum, test) => sum + test._count.submissions, 0) / tests.length).toFixed(1) : '0.0'}
              icon={<Gauge size={18} />}
              tone="warning"
            />
            <StatCard label="Recent Submissions" value={overview?.recentSubmissions ?? 0} icon={<Sparkles size={18} />} />
          </div>
        </Card>
      </div>

      <Card title="Class Performance Ranking" subtitle="Top students by normalized score" variant="glass">
        {classLeaderboard.length === 0 ? (
          <div className="empty-state">No class leaderboard data available.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Normalized Score</th>
                </tr>
              </thead>
              <tbody>
                {classLeaderboard.map((entry) => (
                  <tr key={`${entry.rank}-${entry.username}`}>
                    <td>#{entry.rank}</td>
                    <td>{entry.username}</td>
                    <td>{(entry.normalizedScore * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )

  const renderProfile = () => (
    <>
      <div className="two-col">
        <Card title="Teacher Profile" subtitle="Identity and account scope" variant="glass">
          <ul className="plain-list">
            <li>
              <strong>Name:</strong> {user?.username ?? '—'}
            </li>
            <li>
              <strong>Email:</strong> {user?.email ?? 'Not provided'}
            </li>
            <li>
              <strong>Role:</strong> Teacher Admin
            </li>
            <li>
              <strong>Teacher ID:</strong> {user?.teacherId ?? 'N/A'}
            </li>
          </ul>
          <div className="inline-actions">
            <Link to="/change-password">
              <Button variant="secondary">Change Password</Button>
            </Link>
            <Link to="/reward-explanation">
              <Button variant="secondary">Rewards Guide</Button>
            </Link>
          </div>
        </Card>

        <Card title="Reset Student Password" subtitle="Issue temporary access credentials" variant="glass">
          <form className="form-grid" onSubmit={resetStudentPassword}>
            <label>
              Student
              <select
                value={resetStudent.studentId}
                onChange={(event) => setResetStudent((prev) => ({ ...prev, studentId: event.target.value }))}
                required
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.username}
                  </option>
                ))}
              </select>
            </label>
            <label>
              New Password
              <input
                type="password"
                value={resetStudent.newPassword}
                onChange={(event) => setResetStudent((prev) => ({ ...prev, newPassword: event.target.value }))}
                required
              />
            </label>
            <Button type="submit">Reset Password</Button>
          </form>
        </Card>
      </div>

      <Card title="Managed Batches" subtitle="Your active teaching groups" variant="glass">
        {batches.length === 0 ? (
          <div className="empty-state">No batches configured yet.</div>
        ) : (
          <ul className="plain-list">
            {batches.map((batch) => (
              <li key={batch.id}>
                <strong>{batch.name}</strong>
                <div className="muted">
                  {batch.medium} • Class {batch.classLevel} • Students {batch._count?.batchStudents ?? 0}
                </div>
              </li>
            ))}
          </ul>
        )}
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
  }

  return (
    <DashboardLayout title={`Teacher ${sectionTitle[section]}`} navigation={navigation}>
      <div className="section-stack">
        {error ? <p className="error-text">{error}</p> : null}

        <Card title={sectionTitle[section]} subtitle={sectionSubtitle[section]} variant="gradient">
          <div className="inline-actions">
            <span className="status-pill status-upcoming">Students: {overview?.studentCount ?? 0}</span>
            <span className="status-pill status-completed">
              {section === 'homework' ? 'Homework' : 'School Tests'}: {
                section === 'homework' 
                  ? tests.filter(t => t.category === 'HOMEWORK').length 
                  : tests.filter(t => t.category !== 'HOMEWORK').length
              }
            </span>
            <span className="status-pill status-draft">Batches: {batches.length}</span>
          </div>
        </Card>

        {contentBySection[section]}
      </div>
    </DashboardLayout>
  )
}
