import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ChartPlaceholder } from '../components/ChartPlaceholder'
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
  { label: 'Dashboard', to: '/teacher' },
  { label: 'Create Test Wizard', to: '/teacher/tests/new' },
]

export const TeacherDashboard = () => {
  const { token } = useAuth()
  const [overview, setOverview] = useState<TeacherOverview | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [tests, setTests] = useState<TestRow[]>([])
  const [classLeaderboard, setClassLeaderboard] = useState<Array<{ rank: number; username: string; normalizedScore: number }>>([])
  const [batchLeaderboard, setBatchLeaderboard] = useState<Array<{ rank: number; name: string; averageNormalizedScore: number; medium: string }>>([])
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

  const loadDashboard = async () => {
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
    <DashboardLayout title="Teacher Dashboard" navigation={navigation}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="stats-grid">
        <Card title="Students">{overview?.studentCount ?? 0}</Card>
        <Card title="Upcoming Tests">{overview?.upcomingTests ?? 0}</Card>
        <Card title="Active Tests">{overview?.activeTests ?? 0}</Card>
        <Card title="Recent Submissions">{overview?.recentSubmissions ?? 0}</Card>
      </div>

      <div className="two-col">
        <Card title="Create Student Account">
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

      <Card title="Reset Student Password">
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
        </Card>

        <Card title="Batches">
          <ul className="plain-list">
            {batches.map((batch) => (
              <li key={batch.id}>
                <strong>{batch.name}</strong> ({batch.medium}) - Class {batch.classLevel}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title="Tests"
        actions={
          <Link to="/teacher/tests/new">
            <Button>Create New Test</Button>
          </Link>
        }
      >
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
                  <td>{test.status}</td>
                  <td>{test._count.questions}</td>
                  <td>{test._count.assignments}</td>
                  <td>{test._count.submissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="two-col">
        <Card title="Class Leaderboard">
          <ChartPlaceholder label="Score Distribution / Trend" />
          <ul className="plain-list">
            {classLeaderboard.slice(0, 5).map((entry) => (
              <li key={entry.rank}>
                #{entry.rank} {entry.username} - {(entry.normalizedScore * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Batch Leaderboard (English vs Bengali)">
          <ChartPlaceholder label="Batch Comparison" />
          <ul className="plain-list">
            {batchLeaderboard.slice(0, 5).map((entry) => (
              <li key={entry.rank}>
                #{entry.rank} {entry.name} ({entry.medium}) - {(entry.averageNormalizedScore * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  )
}
