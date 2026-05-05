import { BarChart3, GraduationCap, ScrollText, Trophy, UserCog } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { StatCard } from '../components/StatCard'
import { ComparisonBarChart } from '../components/charts/ComparisonBarChart'
import { TrendAreaChart } from '../components/charts/TrendAreaChart'
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

const navigation = [{ label: 'Dashboard', to: '/superadmin', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> }]

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

  // Teacher Creation Feedback
  const [teacherCreating, setTeacherCreating] = useState(false)
  const [teacherError, setTeacherError] = useState<string | null>(null)
  const [teacherSuccess, setTeacherSuccess] = useState<string | null>(null)

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

  const teacherChartData = useMemo(
    () =>
      teachers.slice(0, 8).map((teacher) => ({
        label: teacher.user.username,
        value: teacher.counts.tests,
      })),
    [teachers],
  )

  const rewardTrendData = useMemo(
    () =>
      rewardCycles
        .slice(0, 8)
        .reverse()
        .map((cycle, index) => ({
          label: `Cycle ${index + 1}`,
          value: cycle.results.length,
        })),
    [rewardCycles],
  )

  const handleTeacherCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      return
    }
    setTeacherError(null)
    setTeacherSuccess(null)
    setTeacherCreating(true)
    try {
      await apiRequest('/auth/register-teacher', {
        method: 'POST',
        token,
        body: JSON.stringify(teacherForm),
      })
      setTeacherForm({ email: '', username: '', password: '', subject: 'CHEMISTRY' })
      setTeacherSuccess(`Teacher ${teacherForm.username} created successfully!`)
      await loadData()
      // Clear success message after 5 seconds
      setTimeout(() => setTeacherSuccess(null), 5000)
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : 'Failed to create teacher')
    } finally {
      setTeacherCreating(false)
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
    <DashboardLayout title="Superadmin Command Center" navigation={navigation}>
      <div>
        {loading ? <p className="muted">Loading dashboard...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="stats-grid">
          <StatCard label="Teacher Admins" value={stats?.teacherCount ?? 0} icon={<UserCog size={18} />} />
          <StatCard label="Students" value={stats?.studentCount ?? 0} icon={<GraduationCap size={18} />} />
          <StatCard label="Tests" value={stats?.testCount ?? 0} icon={<ScrollText size={18} />} />
          <StatCard
            label="Submissions"
            value={stats?.submissionCount ?? 0}
            icon={<BarChart3 size={18} />}
            tone="success"
          />
          <StatCard
            label="Reward Cycles"
            value={stats?.rewardCycleCount ?? 0}
            icon={<Trophy size={18} />}
            tone="warning"
          />
        </div>

        <div className="two-col">
          <Card title="Teacher Test Activity" subtitle="Top teachers by published test volume">
            <ComparisonBarChart data={teacherChartData} />
          </Card>
          <Card title="Reward Outcomes Trend" subtitle="Winning result volume over recent cycles">
            <TrendAreaChart data={rewardTrendData} />
          </Card>
        </div>

        <div className="two-col">
          <Card title="Add Teacher Admin">
            <form className="form-grid" onSubmit={handleTeacherCreate}>
              {teacherError && <p className="error-text" style={{ fontSize: '0.85rem' }}>{teacherError}</p>}
              {teacherSuccess && <p className="success-text" style={{ fontSize: '0.85rem' }}>{teacherSuccess}</p>}
              
              <label>
                Email
                <input
                  value={teacherForm.email}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  disabled={teacherCreating}
                />
              </label>
              <label>
                Username
                <input
                  value={teacherForm.username}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, username: event.target.value }))}
                  required
                  disabled={teacherCreating}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={teacherForm.password}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  disabled={teacherCreating}
                  minLength={8}
                />
              </label>
              <label>
                Subject
                <select
                  value={teacherForm.subject}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, subject: event.target.value }))}
                  disabled={teacherCreating}
                >
                  <option value="CHEMISTRY">Chemistry</option>
                  <option value="BIOLOGY">Biology</option>
                  <option value="MATHEMATICS">Mathematics</option>
                </select>
              </label>
              <Button type="submit" disabled={teacherCreating}>
                {teacherCreating ? 'Creating...' : 'Create Teacher'}
              </Button>
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

        <Card title="Teacher Accounts" subtitle="Manage role state, workload, and student scopes">
          {teachers.length === 0 ? (
            <div className="empty-state">No teacher accounts yet.</div>
          ) : (
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
                        <span className="status-pill status-active">{teacher.user.role}</span>
                        <div className="inline-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePromoteDemote(teacher.user.id, 'STUDENT')}
                          >
                            Demote
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
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
          )}
        </Card>

        <Card title="Reward Cycles Overview" subtitle="Cycle status and winning batch outcomes">
          {rewardCycles.length === 0 ? (
            <div className="empty-state">No reward cycles created yet.</div>
          ) : (
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
                      <td>
                        <span className={`status-pill status-${cycle.status.toLowerCase()}`}>
                          {cycle.status}
                        </span>
                      </td>
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
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
