import { BookCopy, CalendarClock, CircleCheckBig, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { StatCard } from '../components/StatCard'
import { ComparisonBarChart } from '../components/charts/ComparisonBarChart'
import { TrendAreaChart } from '../components/charts/TrendAreaChart'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'

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

const navigation = [
  { label: 'Dashboard', to: '/teacher', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> },
  { label: 'Create Test Wizard', to: '/teacher/tests/new', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg> },
]

export const TeacherDashboard = () => {
  const { token } = useAuth()
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

  const firstClassLevel = useMemo(() => students[0]?.classLevel ?? '10', [students])

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

  const loadDashboard = async () => {
    if (!token) {
      return
    }

    try {
      setError(null)
      const [overviewData, studentData, batchData, testData, classData, batchDataLb] =
        await Promise.all([
          apiRequest<TeacherOverview>('/teacher/overview', { method: 'GET', token }),
          apiRequest<StudentRow[]>('/teacher/students', { method: 'GET', token }),
          apiRequest<BatchRow[]>('/teacher/batches', { method: 'GET', token }),
          apiRequest<TestRow[]>('/tests', { method: 'GET', token }),
          apiRequest<Array<{ rank: number; username: string; normalizedScore: number }>>(
            `/leaderboards/class?classLevel=${encodeURIComponent(firstClassLevel)}`,
            { method: 'GET', token },
          ),
          apiRequest<Array<{ rank: number; name: string; averageNormalizedScore: number; medium: string }>>(
            '/leaderboards/batch',
            { method: 'GET', token },
          ),
        ])
      setOverview(overviewData)
      setStudents(studentData)
      setBatches(batchData)
      setTests(testData)
      setClassLeaderboard(classData)
      setBatchLeaderboard(batchDataLb)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher dashboard')
    }
  }

  useEffect(() => {
    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
      await loadDashboard()
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
      await loadDashboard()
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
      await loadDashboard()
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

  return (
    <DashboardLayout title="Teacher Operations Dashboard" navigation={navigation}>
      <div>
        {error ? <p className="error-text">{error}</p> : null}

        <div className="stats-grid">
          <StatCard
            label="Students"
            value={overview?.studentCount ?? 0}
            trend="Managed learner accounts"
            icon={<Users size={18} />}
          />
          <StatCard
            label="Upcoming Tests"
            value={overview?.upcomingTests ?? 0}
            trend="Scheduled in future windows"
            icon={<CalendarClock size={18} />}
          />
          <StatCard
            label="Active Tests"
            value={overview?.activeTests ?? 0}
            tone="warning"
            trend="Live right now"
            icon={<BookCopy size={18} />}
          />
          <StatCard
            label="Recent Submissions"
            value={overview?.recentSubmissions ?? 0}
            tone="success"
            trend="Last 7 days"
            icon={<CircleCheckBig size={18} />}
          />
        </div>

        <div className="two-col">
          <Card title="Class Leaderboard Trend" subtitle="Top class scores">
            <TrendAreaChart data={classLeaderboardChartData} valueSuffix="%" />
          </Card>
          <Card title="Batch Comparison" subtitle="English vs Bengali performance">
            <ComparisonBarChart data={batchLeaderboardChartData} valueSuffix="%" />
          </Card>
        </div>

        <div className="two-col">
          <Card title="Create Batch">
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
                    onChange={(event) =>
                      setBatchForm((prev) => ({ ...prev, boardTarget: event.target.value }))
                    }
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

          <Card title="Batch Overview" subtitle="Quick stats on your teaching groups">
             <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                   <span className="muted">Total Batches</span>
                   <span className="font-bold">{batches.length}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="muted">Students in Batches</span>
                   <span className="font-bold">{batches.reduce((acc, b) => acc + (b._count?.batchStudents || 0), 0)}</span>
                </div>
             </div>
          </Card>
        </div>

        <Card title="Reset Student Password" subtitle="Issue a temporary password for selected student">
          <form className="inline-grid" onSubmit={resetStudentPassword}>
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

        <div className="two-col">
          <Card title="Students">
            {students.length === 0 ? (
              <div className="empty-state">No students yet. Create your first student account.</div>
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

          <Card title="Batches">
            {batches.length === 0 ? (
              <div className="empty-state">No batches yet. Create one to organize student assignments.</div>
            ) : (
              <ul className="plain-list">
                {batches.map((batch) => (
                  <li key={batch.id}>
                    <strong>{batch.name}</strong> ({batch.medium}) - Class {batch.classLevel}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card
          title="Tests"
          subtitle="Published and draft tests in your teaching scope"
          actions={
            <Link to="/teacher/tests/new">
              <Button>Create New Test</Button>
            </Link>
          }
        >
          {tests.length === 0 ? (
            <div className="empty-state">No tests yet. Use the wizard to publish your first test.</div>
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
                        <span className={`status-pill status-${test.status.toLowerCase()}`}>
                          {test.status}
                        </span>
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
      </div>
    </DashboardLayout>
  )
}
