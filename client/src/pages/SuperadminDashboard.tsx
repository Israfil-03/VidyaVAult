import { BarChart3, GraduationCap, Plus, Search, ScrollText, Trash2, Trophy, UserCog, Users } from 'lucide-react'
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

interface StudentRow {
  id: string
  board: string
  medium: string
  classLevel: string
  rollNo: string | null
  user: {
    id: string
    email: string | null
    username: string
    role: string
  }
  counts: {
    submissions: number
    batchLinks: number
    teacherLinks: number
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

interface AdminRow {
  id: string
  email: string | null
  username: string
  role: string
  createdAt: string
}

const navigation = [{ label: 'Dashboard', to: '/superadmin', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> }]

export const SuperadminDashboard = () => {
  const { token } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
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

  // Feedback & State
  const [teacherCreating, setTeacherCreating] = useState(false)
  const [teacherError, setTeacherError] = useState<string | null>(null)
  const [teacherSuccess, setTeacherSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'admins'>('overview')
  const [userSearch, setUserSearch] = useState('')
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [adminForm, setAdminForm] = useState({
    email: '',
    username: '',
    password: '',
  })
  const [adminCreating, setAdminCreating] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

  const loadData = async () => {
    if (!token) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [statsData, teacherData, studentData, cycleData, adminData] = await Promise.all([
        apiRequest<Stats>('/admin/stats', { method: 'GET', token }),
        apiRequest<TeacherRow[]>('/admin/teachers', { method: 'GET', token }),
        apiRequest<StudentRow[]>('/admin/students', { method: 'GET', token }),
        apiRequest<RewardCycleRow[]>('/rewards/cycles', { method: 'GET', token }),
        apiRequest<AdminRow[]>('/admin/admins', { method: 'GET', token }),
      ])
      setStats(statsData)
      setTeachers(teacherData)
      setStudents(studentData)
      setRewardCycles(cycleData)
      setAdmins(adminData)
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

  const filteredTeachers = useMemo(
    () =>
      teachers.filter(
        (t) =>
          t.user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
          t.subject.toLowerCase().includes(userSearch.toLowerCase()),
      ),
    [teachers, userSearch],
  )

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
          s.rollNo?.toLowerCase().includes(userSearch.toLowerCase()) ||
          s.classLevel.includes(userSearch),
      ),
    [students, userSearch],
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

  const handleAdminCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setAdminError(null)
    setAdminSuccess(null)
    setAdminCreating(true)
    try {
      await apiRequest('/admin/admins', {
        method: 'POST',
        token,
        body: JSON.stringify(adminForm),
      })
      setAdminForm({ email: '', username: '', password: '' })
      setAdminSuccess(`Admin ${adminForm.username} created successfully!`)
      await loadData()
      setTimeout(() => setAdminSuccess(null), 5000)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setAdminCreating(false)
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

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!token || !window.confirm(`Are you sure you want to permanently delete user "${username}"? This will remove all their associated data.`)) {
      return
    }
    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: 'DELETE',
        token,
      })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  return (
    <DashboardLayout title="Superadmin Control Center" navigation={navigation}>
      <div className="space-y-6">
        <header className="flex justify-between items-center mb-6">
          <div className="tab-switcher flex gap-4 border-b border-white/10 pb-2">
            <button 
              className={`tab-btn pb-2 px-4 transition-colors ${activeTab === 'overview' ? 'active border-b-2 border-primary' : 'text-muted hover:text-white'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn pb-2 px-4 transition-colors ${activeTab === 'teachers' ? 'active border-b-2 border-primary' : 'text-muted hover:text-white'}`}
              onClick={() => setActiveTab('teachers')}
            >
              Teachers
            </button>
            <button 
              className={`tab-btn pb-2 px-4 transition-colors ${activeTab === 'students' ? 'active border-b-2 border-primary' : 'text-muted hover:text-white'}`}
              onClick={() => setActiveTab('students')}
            >
              Students
            </button>
            <button 
              className={`tab-btn pb-2 px-4 transition-colors ${activeTab === 'admins' ? 'active border-b-2 border-primary' : 'text-muted hover:text-white'}`}
              onClick={() => setActiveTab('admins')}
            >
              Admins
            </button>
          </div>
          
          <div className="search-wrap relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search accounts..." 
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary transition-all w-64"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="muted">Synchronizing learning data...</p>
          </div>
        ) : (
          <>
            {error && (
              <Card className="border-error/30 bg-error/5 mb-6">
                <div className="flex items-center gap-3 text-error">
                  <div className="bg-error/20 p-2 rounded-full">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold">System Sync Alert</h3>
                    <p className="text-sm opacity-90">{error}</p>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="stats-grid">
                  <StatCard label="Total Teachers" value={stats?.teacherCount ?? 0} icon={<UserCog size={18} />} />
                  <StatCard label="Enrolled Students" value={stats?.studentCount ?? 0} icon={<GraduationCap size={18} />} />
                  <StatCard label="Live Tests" value={stats?.testCount ?? 0} icon={<ScrollText size={18} />} />
                  <StatCard
                    label="Submissions"
                    value={stats?.submissionCount ?? 0}
                    icon={<BarChart3 size={18} />}
                    tone="success"
                  />
                  <StatCard
                    label="Active Rewards"
                    value={stats?.rewardCycleCount ?? 0}
                    icon={<Trophy size={18} />}
                    tone="warning"
                  />
                </div>

                <div className="two-col">
                  <Card title="Teacher Engagement" subtitle="Content distribution by teacher">
                    <ComparisonBarChart data={teacherChartData} />
                  </Card>
                  <Card title="Institutional Velocity" subtitle="Rewards and growth trends">
                    <TrendAreaChart data={rewardTrendData} />
                  </Card>
                </div>

                <div className="two-col">
                  <Card title="Quick Register: Teacher">
                    <form className="form-grid" onSubmit={handleTeacherCreate}>
                      {teacherError && <p className="error-text text-xs">{teacherError}</p>}
                      {teacherSuccess && <p className="success-text text-xs">{teacherSuccess}</p>}
                      
                      <div className="form-row flex gap-4">
                        <label className="flex-1">
                          Email
                          <input
                            value={teacherForm.email}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                            required
                            disabled={teacherCreating}
                            className="w-full"
                          />
                        </label>
                        <label className="flex-1">
                          Username
                          <input
                            value={teacherForm.username}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, username: e.target.value }))}
                            required
                            disabled={teacherCreating}
                            className="w-full"
                          />
                        </label>
                      </div>
                      <div className="form-row flex gap-4 mt-2">
                        <label className="flex-1">
                          Password
                          <input
                            type="password"
                            value={teacherForm.password}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, password: e.target.value }))}
                            required
                            disabled={teacherCreating}
                            minLength={8}
                            className="w-full"
                          />
                        </label>
                        <label className="flex-1">
                          Subject
                          <select
                            value={teacherForm.subject}
                            onChange={(e) => setTeacherForm(prev => ({ ...prev, subject: e.target.value }))}
                            disabled={teacherCreating}
                            className="w-full"
                          >
                            <option value="CHEMISTRY">Chemistry</option>
                            <option value="PHYSICS">Physics</option>
                            <option value="MATHEMATICS">Mathematics</option>
                          </select>
                        </label>
                      </div>
                      <Button type="submit" disabled={teacherCreating} className="mt-4 w-full">
                        {teacherCreating ? 'Provisioning...' : 'Provision Teacher Account'}
                      </Button>
                    </form>
                  </Card>

                  <Card title="Security: Password Override">
                    <form className="form-grid" onSubmit={handleResetTeacherPassword}>
                      <label>
                        Target Account
                        <select
                          value={passwordReset.teacherId}
                          onChange={(e) => setPasswordReset(prev => ({ ...prev, teacherId: e.target.value }))}
                          required
                          className="w-full"
                        >
                          <option value="">Select teacher account</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.user.username} ({t.subject})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mt-2">
                        New Security Credential
                        <input
                          type="password"
                          value={passwordReset.newPassword}
                          onChange={(e) => setPasswordReset(prev => ({ ...prev, newPassword: e.target.value }))}
                          required
                          className="w-full"
                        />
                      </label>
                      <Button type="submit" variant="secondary" className="mt-4 w-full">Force Reset Credentials</Button>
                    </form>
                  </Card>
                </div>

                <div className="two-col">
                   <Card title="Quick Register: Institute Admin">
                    <form className="form-grid" onSubmit={handleAdminCreate}>
                      {adminError && <p className="error-text text-xs">{adminError}</p>}
                      {adminSuccess && <p className="success-text text-xs">{adminSuccess}</p>}
                      
                      <div className="form-row flex gap-4">
                        <label className="flex-1">
                          Email (Optional)
                          <input
                            value={adminForm.email}
                            onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                            disabled={adminCreating}
                            className="w-full"
                          />
                        </label>
                        <label className="flex-1">
                          Username
                          <input
                            value={adminForm.username}
                            onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value }))}
                            required
                            disabled={adminCreating}
                            className="w-full"
                          />
                        </label>
                      </div>
                      <div className="form-row mt-2">
                        <label className="w-full">
                          Password
                          <input
                            type="password"
                            value={adminForm.password}
                            onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                            required
                            disabled={adminCreating}
                            minLength={8}
                            className="w-full"
                          />
                        </label>
                      </div>
                      <Button type="submit" disabled={adminCreating} className="mt-4 w-full">
                        {adminCreating ? 'Provisioning...' : 'Provision Admin Account'}
                      </Button>
                    </form>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'teachers' && (
              <Card title="Teacher Management" icon={<UserCog size={18} />}>
                <div className="table-wrap">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Expertise</th>
                        <th className="hide-mobile">Metrics</th>
                        <th>Role State</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.map((teacher) => (
                        <tr key={teacher.id}>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-bold">{teacher.user.username}</span>
                              <span className="text-xs muted">{teacher.user.email}</span>
                            </div>
                          </td>
                          <td>
                            <span className="subject-pill">{teacher.subject}</span>
                          </td>
                          <td className="hide-mobile">
                            <div className="flex gap-4 text-xs">
                              <span title="Students"><Users size={12} className="inline mr-1" /> {teacher.counts.teacherStudents}</span>
                              <span title="Tests"><ScrollText size={12} className="inline mr-1" /> {teacher.counts.tests}</span>
                            </div>
                          </td>
                          <td>
                            <span className="status-pill status-active uppercase text-[10px]">{teacher.user.role}</span>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePromoteDemote(teacher.user.id, 'STUDENT')}
                                title="Demote to Student"
                              >
                                Demote
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDeleteUser(teacher.user.id, teacher.user.username)}
                                className="btn-error-ghost"
                                title="Delete Account"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTeachers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 muted">No matching teacher accounts found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'students' && (
              <Card title="Student Enrollment" icon={<GraduationCap size={18} />}>
                <div className="table-wrap">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Educational Context</th>
                        <th className="hide-mobile">Engagement</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-bold">{student.user.username}</span>
                              <span className="text-xs muted">{student.rollNo || 'UNASSIGNED ROLL'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col text-xs">
                              <span>{student.board} · {student.medium}</span>
                              <span className="muted font-bold">GRADE {student.classLevel}</span>
                            </div>
                          </td>
                          <td className="hide-mobile">
                            <div className="flex gap-4 text-xs">
                              <span title="Submissions"><BarChart3 size={12} className="inline mr-1" /> {student.counts.submissions}</span>
                              <span title="Teachers"><Plus size={12} className="inline mr-1" /> {student.counts.teacherLinks}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePromoteDemote(student.user.id, 'TEACHER_ADMIN')}
                                title="Promote to Teacher"
                              >
                                Promote
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDeleteUser(student.user.id, student.user.username)}
                                className="btn-error-ghost"
                                title="Delete Account"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 muted">No matching student accounts found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'admins' && (
              <Card title="Institute Admin Management" icon={<UserCog size={18} />}>
                <div className="table-wrap">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Created At</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin.id}>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-bold">{admin.username}</span>
                              <span className="text-xs muted">{admin.email || 'No email provided'}</span>
                            </div>
                          </td>
                          <td>
                            <span className="text-xs muted">{new Date(admin.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDeleteUser(admin.id, admin.username)}
                                className="btn-error-ghost"
                                title="Delete Account"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {admins.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-8 muted">No institute admin accounts found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
