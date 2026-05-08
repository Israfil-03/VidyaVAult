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
  classLevel: string
  startTime: string
  endTime: string
  _count: {
    questions: number
    assignments: number
    submissions: number
  }
}

const sectionTitle: Record<DashboardSection, string> = {
  homework: 'Homework Section',
  practice: 'Practice',
  test: 'Test',
  leaderboard: 'Leaderboard',
  performance: 'Student Performance',
  profile: 'Profile',
}

const sectionSubtitle: Record<DashboardSection, string> = {
  homework: 'Plan, publish, and track assigned homework.',
  practice: 'Manage student and batch setup for guided practice.',
  test: 'Create and monitor test lifecycle in one place.',
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
  const [error, setError] = useState<string | null>(null)

  const [studentForm, setStudentForm] = useState({
    email: '',
    username: '',
    password: '',
    board: 'WEST_BENGAL',
    medium: 'ENGLISH',
    classLevel: '10',
    rollNo: '',
  })
  const [batchForm, setBatchForm] = useState({
    name: '',
    medium: 'ENGLISH',
    classLevel: '10',
    boardTarget: 'WEST_BENGAL',
  })
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
      const [overviewData, studentData, batchData, testData, classData, batchDataLb] = await Promise.all([
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
      ])
      setOverview(overviewData)
      setStudents(studentData)
      setBatches(batchData)
      setTests(testData)
      setClassLeaderboard(classData)
      setBatchLeaderboard(batchDataLb)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher portal')
    }
  }, [token])

  useEffect(() => {
    void loadPortalData()
  }, [loadPortalData])

  const createStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      return
    }
    try {
      await apiRequest('/auth/register-student', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...studentForm,
          rollNo: studentForm.rollNo || undefined,
          email: studentForm.email || undefined,
        }),
      })
      setStudentForm({
        email: '',
        username: '',
        password: '',
        board: 'WEST_BENGAL',
        medium: 'ENGLISH',
        classLevel: '10',
        rollNo: '',
      })
      await loadPortalData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create student')
    }
  }

  const createBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      return
    }
    try {
      await apiRequest('/teacher/batches', {
        method: 'POST',
        token,
        body: JSON.stringify(batchForm),
      })
      setBatchForm({
        name: '',
        medium: 'ENGLISH',
        classLevel: '10',
        boardTarget: 'WEST_BENGAL',
      })
      await loadPortalData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch')
    }
  }

  const assignToBatch = async (batchId: string, studentId: string) => {
    if (!token) {
      return
    }
    try {
      await apiRequest(`/teacher/batches/${batchId}/students`, {
        method: 'POST',
        token,
        body: JSON.stringify({ studentId }),
      })
      await loadPortalData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign student to batch')
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
    for (const test of tests) {
      countByStatus.set(test.status, (countByStatus.get(test.status) ?? 0) + 1)
    }
    return [...countByStatus.entries()].map(([label, value]) => ({ label, value }))
  }, [tests])

  const submissionTrendData = useMemo(
    () =>
      tests.slice(0, 8).map((test, index) => ({
        label: `T${index + 1}`,
        value: test._count.submissions,
      })),
    [tests],
  )

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

  const renderHomework = () => (
    <>
      <div className="two-col">
        <HomeworkCard tests={tests} formatShortDate={formatShortDate} getTestWindowStatus={getTestWindowStatus} />
        <NewHomeworkCard batches={batches} onCreated={loadPortalData} />
      </div>
    </>
  )

  const renderPractice = () => (
    <>
      <div className="two-col">
        <Card title="Create Student Account" variant="glass">
          <form className="form-grid" onSubmit={createStudent}>
            <label>
              Username
              <input
                value={studentForm.username}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </label>
            <label>
              Email (optional)
              <input
                value={studentForm.email}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label>
              Temporary Password
              <input
                type="password"
                value={studentForm.password}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </label>
            <div className="inline-grid">
              <label>
                Board
                <select
                  value={studentForm.board}
                  onChange={(event) => setStudentForm((prev) => ({ ...prev, board: event.target.value }))}
                >
                  <option value="WEST_BENGAL">West Bengal</option>
                  <option value="ICSE">ICSE</option>
                  <option value="CBSE">CBSE</option>
                </select>
              </label>
              <label>
                Medium
                <select
                  value={studentForm.medium}
                  onChange={(event) => setStudentForm((prev) => ({ ...prev, medium: event.target.value }))}
                >
                  <option value="ENGLISH">English</option>
                  <option value="BENGALI">Bengali</option>
                </select>
              </label>
            </div>
            <div className="inline-grid">
              <label>
                Class
                <input
                  value={studentForm.classLevel}
                  onChange={(event) => setStudentForm((prev) => ({ ...prev, classLevel: event.target.value }))}
                  required
                />
              </label>
              <label>
                Roll No
                <input
                  value={studentForm.rollNo}
                  onChange={(event) => setStudentForm((prev) => ({ ...prev, rollNo: event.target.value }))}
                />
              </label>
            </div>
            <Button type="submit">Create Student</Button>
          </form>
        </Card>

        <Card title="Create Practice Batch" variant="glass">
          <form className="form-grid" onSubmit={createBatch}>
            <label>
              Batch Name
              <input
                value={batchForm.name}
                onChange={(event) => setBatchForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <div className="inline-grid">
              <label>
                Medium
                <select
                  value={batchForm.medium}
                  onChange={(event) => setBatchForm((prev) => ({ ...prev, medium: event.target.value }))}
                >
                  <option value="ENGLISH">English</option>
                  <option value="BENGALI">Bengali</option>
                </select>
              </label>
              <label>
                Board
                <select
                  value={batchForm.boardTarget}
                  onChange={(event) => setBatchForm((prev) => ({ ...prev, boardTarget: event.target.value }))}
                >
                  <option value="WEST_BENGAL">West Bengal</option>
                  <option value="ICSE">ICSE</option>
                  <option value="CBSE">CBSE</option>
                </select>
              </label>
            </div>
            <label>
              Class
              <input
                value={batchForm.classLevel}
                onChange={(event) => setBatchForm((prev) => ({ ...prev, classLevel: event.target.value }))}
              />
            </label>
            <Button type="submit">Create Batch</Button>
          </form>
        </Card>
      </div>

      <Card title="Assign Students to Batches" subtitle="Connect learners to practice cohorts" variant="glass">
        {students.length === 0 ? (
          <div className="empty-state">Create students to begin assignments.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Board</th>
                  <th>Medium</th>
                  <th>Class</th>
                  <th>Assign Batch</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.username}</td>
                    <td>{student.board}</td>
                    <td>{student.medium}</td>
                    <td>{student.classLevel}</td>
                    <td>
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          if (event.target.value) {
                            void assignToBatch(event.target.value, student.id)
                          }
                        }}
                      >
                        <option value="">Assign...</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )

  const renderTest = () => (
    <>
      <Card
        title="Test Inventory"
        subtitle="Published and draft tests in your teaching scope"
        variant="glass"
        actions={
          <Link to="/teacher/test/new">
            <Button>Create New Test</Button>
          </Link>
        }
      >
        {tests.length === 0 ? (
          <div className="empty-state">No tests yet. Create your first test from the wizard.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Assignments</th>
                  <th>Submissions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.id}>
                    <td>{test.title}</td>
                    <td>{test.subject}</td>
                    <td>
                      <span className={`status-pill status-${test.status.toLowerCase()}`}>{test.status}</span>
                    </td>
                    <td>{test._count.questions}</td>
                    <td>{test._count.assignments}</td>
                    <td>{test._count.submissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
            <span className="status-pill status-completed">Tests: {tests.length}</span>
            <span className="status-pill status-draft">Batches: {batches.length}</span>
          </div>
        </Card>

        {contentBySection[section]}
      </div>
    </DashboardLayout>
  )
}
