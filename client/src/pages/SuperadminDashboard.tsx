import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'

interface TeacherRow {
  id: string
  subject: string
  user: {
    id: string
    email: string | null
    username: string
    role: string
  }
  counts: {
    teacherStudents: number
    tests: number
    batches: number
  }
}

interface Stats {
  teacherCount: number
  studentCount: number
  testCount: number
  submissionCount: number
  rewardCycleCount: number
}

interface RewardCycleRow {
  id: string
  subject: string
  status: string
  periodStart: string
  periodEnd: string
  teacher: {
    user: {
      username: string
    }
  }
  results: Array<{
    id: string
    isWinner: boolean
    isMostImproved: boolean
    batch: {
      name: string
      medium: string
    }
  }>
}

const navigation = [
  { label: 'Dashboard', to: '/superadmin' },
]

export const SuperadminDashboard = () => {
  const { token } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [rewardCycles, setRewardCycles] = useState<RewardCycleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    username: '',
    password: '',
    subject: 'CHEMISTRY',
  })
  const [passwordReset, setPasswordReset] = useState({
    teacherId: '',
    newPassword: '',
  })

  const loadData = async () => {
    if (!token) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [statsData, teacherData, cycleData] = await Promise.all([
        apiRequest<Stats>('/admin/stats', { method: 'GET', token }),
        apiRequest<TeacherRow[]>('/admin/teachers', { method: 'GET', token }),
        apiRequest<RewardCycleRow[]>('/rewards/cycles', { method: 'GET', token }),
      ])
      setStats(statsData)
      setTeachers(teacherData)
      setRewardCycles(cycleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load superadmin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleTeacherCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      return
    }
    setError(null)
    try {
      await apiRequest('/auth/register-teacher', {
        method: 'POST',
        token,
        body: JSON.stringify(teacherForm),
      })
      setTeacherForm({ email: '', username: '', password: '', subject: 'CHEMISTRY' })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create teacher')
    }
  }

  const handleResetTeacherPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      return
    }
    try {
      await apiRequest('/admin/reset-teacher-password', {
        method: 'POST',
        token,
        body: JSON.stringify(passwordReset),
      })
      setPasswordReset({ teacherId: '', newPassword: '' })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset teacher password')
    }
  }

  const handlePromoteDemote = async (userId: string, role: 'TEACHER_ADMIN' | 'STUDENT') => {
    if (!token) {
      return
    }
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ role }),
      })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  return (
    <DashboardLayout title="Superadmin Dashboard" navigation={navigation}>
      {loading && <p>Loading dashboard...</p>}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="stats-grid">
        <Card title="Teachers">{stats?.teacherCount ?? 0}</Card>
        <Card title="Students">{stats?.studentCount ?? 0}</Card>
        <Card title="Tests">{stats?.testCount ?? 0}</Card>
        <Card title="Submissions">{stats?.submissionCount ?? 0}</Card>
        <Card title="Reward Cycles">{stats?.rewardCycleCount ?? 0}</Card>
      </div>

      <div className="two-col">
        <Card title="Add Teacher Admin">
          <form className="form-grid" onSubmit={handleTeacherCreate}>
            <label>
              Email
              <input
                value={teacherForm.email}
                onChange={(event) =>
                  setTeacherForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Username
              <input
                value={teacherForm.username}
                onChange={(event) =>
                  setTeacherForm((prev) => ({ ...prev, username: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={teacherForm.password}
                onChange={(event) =>
                  setTeacherForm((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Subject
              <select
                value={teacherForm.subject}
                onChange={(event) =>
                  setTeacherForm((prev) => ({ ...prev, subject: event.target.value }))
                }
              >
                <option value="CHEMISTRY">Chemistry</option>
                <option value="BIOLOGY">Biology</option>
                <option value="MATHEMATICS">Mathematics</option>
              </select>
            </label>
            <Button type="submit">Create Teacher</Button>
          </form>
        </Card>

        <Card title="Reset Teacher Password">
          <form className="form-grid" onSubmit={handleResetTeacherPassword}>
            <label>
              Teacher
              <select
                value={passwordReset.teacherId}
                onChange={(event) =>
                  setPasswordReset((prev) => ({ ...prev, teacherId: event.target.value }))
                }
                required
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user.username} ({teacher.subject})
                  </option>
                ))}
              </select>
            </label>
            <label>
              New password
              <input
                type="password"
                value={passwordReset.newPassword}
                onChange={(event) =>
                  setPasswordReset((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                required
              />
            </label>
            <Button type="submit">Reset Password</Button>
          </form>
        </Card>
      </div>

      <Card title="Teacher Accounts">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Students</th>
                <th>Batches</th>
                <th>Tests</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{teacher.user.username}</td>
                  <td>{teacher.subject}</td>
                  <td>{teacher.counts.teacherStudents}</td>
                  <td>{teacher.counts.batches}</td>
                  <td>{teacher.counts.tests}</td>
                  <td>
                    {teacher.user.role}
                    <div className="inline-actions">
                      <Button
                        variant="secondary"
                        onClick={() => handlePromoteDemote(teacher.user.id, 'STUDENT')}
                      >
                        Demote to Student
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handlePromoteDemote(teacher.user.id, 'TEACHER_ADMIN')}
                      >
                        Keep Teacher
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Reward Cycles Overview">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Period</th>
                <th>Status</th>
                <th>Outcomes</th>
              </tr>
            </thead>
            <tbody>
              {rewardCycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td>{cycle.teacher.user.username}</td>
                  <td>{cycle.subject}</td>
                  <td>
                    {new Date(cycle.periodStart).toLocaleDateString()} -{' '}
                    {new Date(cycle.periodEnd).toLocaleDateString()}
                  </td>
                  <td>{cycle.status}</td>
                  <td>
                    {cycle.results
                      .filter((result) => result.isWinner || result.isMostImproved)
                      .map((result) => `${result.batch.name} (${result.batch.medium})`)
                      .join(', ') || 'Pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  )
}
