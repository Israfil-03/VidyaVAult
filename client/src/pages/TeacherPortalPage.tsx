import {
  Gauge,
  Layers2,
  Sparkles,
  Users,
  HelpCircle,
  FileText,
  Plus,
  BookOpen,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Award,
  TrendingUp,
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
import { NewPracticeDrillCard } from './NewPracticeDrillCard'

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
  createdAt: string
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

interface AssessmentAnalytics {
  totalSubmissions: number
  averageScore: number
  topPerformers: Array<{ studentId: string; username: string; scoreTotal: number | null; maxScore: number | null }>
  bottomPerformers: Array<{ studentId: string; username: string; scoreTotal: number | null; maxScore: number | null }>
}

interface DetailedStudentSubmission {
  studentId: string
  username: string
  email: string | null
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'NOT_STARTED'
  submittedAt: string | null
  score: number
  maxScore: number
  answers: Array<{ questionText: string; selectedOption: string | null | undefined; isCorrect: boolean; marks: number }>
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
  homework: 'Plan, publish, and track assigned homework.',
  practice: 'Track and analyze student performance in practice drills.',
  test: 'Create and monitor Weekly and Monthly assessments.',
  leaderboard: 'Review class and batch ranking insights.',
  performance: 'Inspect submission trends and learner outcomes.',
  profile: 'Profile, security, and account-level actions.',
  'question-bank': 'Manage and organize assessment questions.',
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

  // Assessment Review Wizard state
  const [selectedReviewTest, setSelectedReviewTest] = useState<TestRow | null>(null)
  const [reviewAnalytics, setReviewAnalytics] = useState<AssessmentAnalytics | null>(null)
  const [reviewSubmissions, setReviewSubmissions] = useState<DetailedStudentSubmission[]>([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)

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
          createdAt: new Date().toISOString(),
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

  const openAssessmentReview = async (test: TestRow) => {
    if (!token) return
    setSelectedReviewTest(test)
    setReviewLoading(true)
    setReviewError(null)
    setReviewAnalytics(null)
    setReviewSubmissions([])
    setExpandedStudentId(null)
    try {
      const [analyticsData, submissionsData] = await Promise.all([
        apiRequest<AssessmentAnalytics>(`/tests/${test.id}/analytics`, { method: 'GET', token }),
        apiRequest<DetailedStudentSubmission[]>(`/tests/${test.id}/submissions`, { method: 'GET', token }),
      ])
      setReviewAnalytics(analyticsData)
      setReviewSubmissions(submissionsData)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to load assessment review')
    } finally {
      setReviewLoading(false)
    }
  }

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

  const renderPractice = () => {
    const practiceDrills = tests.filter(t => t.category === 'PRACTICE')
    return (
      <div className="fade-in-up flex flex-col gap-8">
        <div className="two-col" style={{ alignItems: 'start' }}>
          <Card 
            title="Active Practice Drills" 
            subtitle="Manage untimed, stress-free learning cards for students"
            variant="gradient"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-white/70">
                Total Drills: {practiceDrills.length}
              </span>
            </div>
            {practiceDrills.length === 0 ? (
              <div className="empty-state py-12">
                <div className="flex flex-col items-center gap-4">
                  <Sparkles className="text-primary/40" size={48} />
                  <p className="muted">No practice drills created yet. Use the card on the right to set one up!</p>
                </div>
              </div>
            ) : (
              <div className="premium-list">
                {practiceDrills.map((drill, idx) => (
                  <div key={drill.id} className={`premium-item fade-in-up stagger-${(idx % 4) + 1}`}>
                    <div>
                      <div className="flex items-center gap-3">
                        <strong className="text-white text-base">{drill.title}</strong>
                        <span className="subject-pill text-[10px]">
                          {drill.subject}
                        </span>
                      </div>
                      <div className="muted mt-1 text-sm">
                        Class {drill.classLevel} • {drill._count.questions} Questions • Created {new Date(drill.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="border border-error/20 text-error hover:bg-error/10 hover:border-error/40"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete "${drill.title}"? This will also delete all student practice attempts for it.`)) {
                            try {
                              await apiRequest(`/tests/${drill.id}`, { method: 'DELETE', token })
                              await loadPortalData()
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Failed to delete drill')
                            }
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <NewPracticeDrillCard batches={batches} onCreated={loadPortalData} />
        </div>

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
  }

  const renderTest = () => {
    const weeklyTests = tests.filter((t) => t.category === 'WEEKLY_TEST')
    const monthlyTests = tests.filter((t) => t.category === 'MONTHLY_TEST')
    
    const renderGrid = (testList: TestRow[], emptyMsg: string, emptyIcon: ReactElement) => (
      testList.length === 0 ? (
        <div className="empty-state-v2 compact" style={{ border: '1px dashed var(--border-strong)', borderRadius: '20px', padding: '32px 16px', background: 'var(--surface-soft)' }}>
          <div className="empty-icon" style={{ margin: '0 auto 12px', background: 'var(--color-primary-100)', color: 'var(--color-primary-600)', width: '60px', height: '60px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            {emptyIcon}
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>No Tests Configured</h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-soft)' }}>{emptyMsg}</p>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', 
            gap: '16px',
            marginTop: '8px'
          }}
        >
          {testList.map((test) => {
            const subjectClass = `subject-${test.subject.toLowerCase()}`
            const submissionsCount = test._count.submissions

            return (
              <div 
                key={test.id} 
                className="exam-launch-card"
              >
                <div className="exam-launch-header">
                  <span className={`status-pill ${subjectClass}`} style={{ fontSize: '0.7rem' }}>
                    {test.subject}
                  </span>
                  <span className={`status-pill status-${test.status.toLowerCase()}`}>
                    {test.status}
                  </span>
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '8px 0 6px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    {test.title}
                  </h4>
                  <div className="exam-badge-row" style={{ marginTop: '8px', marginBottom: '14px' }}>
                    <span className="exam-meta-pill">
                      <HelpCircle size={12} style={{ color: 'var(--color-primary-500)' }} /> {test._count.questions} Qs
                    </span>
                    <span className="exam-meta-pill">
                      <Users size={12} style={{ color: 'var(--color-primary-500)' }} /> Class {test.classLevel}
                    </span>
                  </div>
                </div>

                {/* Submissions footer */}
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-soft)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>
                    {submissionsCount} submitted
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex items-center gap-1"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => void openAssessmentReview(test)}
                  >
                    <BarChart3 size={13} /> View Results
                  </Button>
                </div>
              </div>
            )
          })}
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
                <Button size="sm" className="flex items-center gap-1"><Plus size={14} /> New Weekly Test</Button>
              </Link>
            }
          >
            {renderGrid(weeklyTests, "Deploy short-form weekly check-ins.", <BookOpen size={24} />)}
          </Card>

          <Card
            title="Monthly Test Inventory"
            subtitle="Monthly milestone assessments"
            variant="glass"
            actions={
              <Link to="/teacher/test/new">
                <Button size="sm" className="flex items-center gap-1"><Plus size={14} /> New Monthly Test</Button>
              </Link>
            }
          >
            {renderGrid(monthlyTests, "Evaluate long-form chapter milestones.", <FileText size={24} />)}
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
    'question-bank': <div className="empty-state">Redirecting to Question Bank...</div>,
  }

  return (
    <DashboardLayout title={`Teacher ${sectionTitle[section]}`} navigation={navigation}>
      <div className="section-stack">
        {error ? <p className="error-text">{error}</p> : null}

        <Card title={sectionTitle[section]} subtitle={sectionSubtitle[section]} variant="gradient">
          <div className="inline-actions">
            <span className="status-pill status-upcoming">Students: {overview?.studentCount ?? 0}</span>
            <span className="status-pill status-completed">
              {section === 'homework'
                ? `Homework: ${tests.filter(t => t.category === 'HOMEWORK').length}`
                : section === 'practice'
                  ? `Drills: ${tests.filter(t => t.category === 'PRACTICE').length}`
                  : `Assessments: ${tests.filter(t => t.category === 'WEEKLY_TEST' || t.category === 'MONTHLY_TEST').length}`
              }
            </span>
            <span className="status-pill status-draft">Batches: {batches.length}</span>
          </div>
        </Card>

        {contentBySection[section]}
      </div>

      {/* Assessment Review Modal */}
      {selectedReviewTest && (
        <div className="report-modal-overlay" onClick={() => setSelectedReviewTest(null)}>
          <div
            className="report-modal-box"
            style={{ maxWidth: '860px', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="report-modal-header">
              <div className="report-modal-header-info">
                <h3>{selectedReviewTest.title}</h3>
                <div className="report-modal-header-meta">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                    {selectedReviewTest.category === 'WEEKLY_TEST' ? '📅 Weekly Test' : '📆 Monthly Test'}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                    {selectedReviewTest.subject}
                  </span>
                  <span className="text-xs text-white/40">Class {selectedReviewTest.classLevel}</span>
                </div>
              </div>
              <button className="report-modal-close-btn" onClick={() => setSelectedReviewTest(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="report-modal-body custom-scrollbar">
              {reviewLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '16px' }}>
                  <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-primary-500)' }} />
                  <p className="muted font-bold">Loading assessment results...</p>
                </div>
              )}

              {reviewError && (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <XCircle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
                  <p style={{ color: '#ef4444' }}>{reviewError}</p>
                </div>
              )}

              {!reviewLoading && !reviewError && reviewAnalytics && (
                <>
                  {/* Analytics Overview */}
                  <div className="report-stats-card" style={{ marginBottom: '20px' }}>
                    <div className="report-stat-item">
                      <span className="report-stat-label">Total Submissions</span>
                      <span className="report-stat-value font-mono" style={{ color: 'var(--color-primary-400)' }}>
                        {reviewAnalytics.totalSubmissions}
                      </span>
                    </div>
                    <div className="report-stat-item">
                      <span className="report-stat-label">Avg Score</span>
                      <span className="report-stat-value font-mono"
                        style={{ color: reviewAnalytics.averageScore >= 80 ? '#10b981' : reviewAnalytics.averageScore >= 50 ? '#f59e0b' : '#ef4444' }}
                      >
                        {reviewAnalytics.averageScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="report-stat-item">
                      <span className="report-stat-label">Not Started</span>
                      <span className="report-stat-value font-mono" style={{ color: 'var(--text-soft)' }}>
                        {reviewSubmissions.filter(s => s.status === 'NOT_STARTED').length}
                      </span>
                    </div>
                    <div className="report-stat-item">
                      <span className="report-stat-label">In Progress</span>
                      <span className="report-stat-value font-mono" style={{ color: '#f59e0b' }}>
                        {reviewSubmissions.filter(s => s.status === 'IN_PROGRESS').length}
                      </span>
                    </div>
                  </div>

                  {/* Top & Bottom Performers */}
                  {(reviewAnalytics.topPerformers.length > 0 || reviewAnalytics.bottomPerformers.length > 0) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '14px', padding: '16px' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={14} /> Top Performers
                        </h4>
                        {reviewAnalytics.topPerformers.map((p, i) => (
                          <div key={p.studentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < reviewAnalytics.topPerformers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>#{i + 1} {p.username}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                              {p.scoreTotal?.toFixed(1) ?? '0'}/{p.maxScore?.toFixed(1) ?? '0'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', padding: '16px' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <TrendingUp size={14} /> Needs Improvement
                        </h4>
                        {reviewAnalytics.bottomPerformers.map((p, i) => (
                          <div key={p.studentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < reviewAnalytics.bottomPerformers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>{p.username}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>
                              {p.scoreTotal?.toFixed(1) ?? '0'}/{p.maxScore?.toFixed(1) ?? '0'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-Student Submission List */}
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={15} style={{ color: 'var(--color-primary-400)' }} /> All Student Results
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {reviewSubmissions.length === 0 ? (
                      <div className="empty-state">No students assigned to this test yet.</div>
                    ) : reviewSubmissions.map((student) => {
                      const pct = student.maxScore > 0 ? (student.score / student.maxScore) * 100 : 0
                      const isExpanded = expandedStudentId === student.studentId
                      const statusColor = student.status === 'SUBMITTED' ? '#10b981' : student.status === 'IN_PROGRESS' ? '#f59e0b' : 'var(--text-soft)'

                      return (
                        <div key={student.studentId} style={{ background: 'var(--surface-soft)', border: '1px solid var(--border-soft)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                          {/* Row header */}
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: student.status === 'SUBMITTED' ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (student.status === 'SUBMITTED') {
                                setExpandedStudentId(isExpanded ? null : student.studentId)
                              }
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{student.username}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: '2px 6px', borderRadius: '6px', border: `1px solid ${statusColor}30` }}>
                                  {student.status}
                                </span>
                              </div>
                              {student.email && <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>{student.email}</span>}
                            </div>

                            {student.status === 'SUBMITTED' && (
                              <>
                                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                                    {student.score.toFixed(1)}/{student.maxScore.toFixed(1)}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)' }}>{pct.toFixed(0)}%</div>
                                </div>
                                <div style={{ width: '60px', height: '6px', background: 'var(--border-soft)', borderRadius: '99px', overflow: 'hidden', flexShrink: 0 }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '99px', transition: 'width 0.5s ease-out' }} />
                                </div>
                                {isExpanded
                                  ? <ChevronUp size={16} style={{ color: 'var(--text-soft)', flexShrink: 0 }} />
                                  : <ChevronDown size={16} style={{ color: 'var(--text-soft)', flexShrink: 0 }} />}
                              </>
                            )}

                            {student.status !== 'SUBMITTED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>—</span>
                            )}
                          </div>

                          {/* Expanded answer breakdown */}
                          {isExpanded && student.answers.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--border-soft)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)' }}>
                              {student.answers.map((ans, aidx) => (
                                <div key={aidx} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '10px', alignItems: 'start', padding: '8px 10px', borderRadius: '8px', background: ans.isCorrect ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${ans.isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
                                  {ans.isCorrect
                                    ? <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                                    : <XCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />}
                                  <div>
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.4 }}>Q{aidx + 1}: {ans.questionText}</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-soft)' }}>Selected: {ans.selectedOption ?? <em>Not answered</em>}</p>
                                  </div>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: ans.isCorrect ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>+{ans.marks} mk</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="report-modal-footer">
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                {selectedReviewTest._count.submissions} submitted • {selectedReviewTest._count.questions} questions
              </span>
              <Button variant="secondary" size="sm" onClick={() => setSelectedReviewTest(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
