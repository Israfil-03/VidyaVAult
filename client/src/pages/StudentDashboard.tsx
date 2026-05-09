import { CalendarClock, LayoutDashboard, Medal, NotebookTabs, Trophy, ClipboardList, ArrowRight, Star, CircleCheckBig, BarChart3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { StatCard } from '../components/StatCard'
import { ComparisonBarChart } from '../components/charts/ComparisonBarChart'
import { TrendAreaChart } from '../components/charts/TrendAreaChart'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'

interface StudentOverview {
  active: number
  upcoming: number
  completed: number
}

interface TestCard {
  id: string
  title: string
  subject: string
  classLevel: string
  startTime: string
  endTime: string
  durationMinutes: number
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

const navigation = [
  { label: 'Dashboard', to: '/student', icon: <LayoutDashboard size={18} /> },
  { label: 'Results', to: '/student/results', icon: <ClipboardList size={18} /> },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
  }
}

export const StudentDashboard = () => {
  const { user, token } = useAuth()
  const [overview, setOverview] = useState<StudentOverview | null>(null)
  const [activeTests, setActiveTests] = useState<TestCard[]>([])
  const [upcomingTests, setUpcomingTests] = useState<TestCard[]>([])
  const [completedTests, setCompletedTests] = useState<TestCard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [classLeaderboard, setClassLeaderboard] = useState<
    Array<{ rank: number; username: string; normalizedScore: number }>
  >([])
  const [batchLeaderboard, setBatchLeaderboard] = useState<
    Array<{ rank: number; name: string; medium: string; averageNormalizedScore: number }>
  >([])

  useEffect(() => {
    const loadData = async () => {
      // Preview Mode: Use mock data if VITE_UI_ONLY is enabled
      if (import.meta.env.VITE_UI_ONLY === 'true') {
        setOverview({ active: 3, upcoming: 2, completed: 12 })
        setActiveTests([
          {
            id: 'mock-1',
            title: 'Advanced Mathematics Quiz',
            subject: 'Mathematics',
            _count: { questions: 15 },
            durationMinutes: 45,
            submissions: [],
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            classLevel: '10'
          },
          {
            id: 'mock-2',
            title: 'Physics Concept Test',
            subject: 'Physics',
            _count: { questions: 10 },
            durationMinutes: 20,
            submissions: [],
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            classLevel: '10'
          }
        ])
        setUpcomingTests([
          {
            id: 'mock-3',
            title: 'History Finals Preparation',
            startTime: new Date(Date.now() + 86400000).toISOString(),
            subject: 'History',
            _count: { questions: 25 },
            durationMinutes: 90,
            submissions: [],
            endTime: new Date().toISOString(),
            classLevel: '10'
          }
        ])
        setClassLeaderboard([
          { rank: 1, username: 'Alex Rivers', normalizedScore: 0.98 },
          { rank: 2, username: 'Jordan Smith', normalizedScore: 0.94 },
          { rank: 3, username: 'Casey Lee', normalizedScore: 0.91 },
          { rank: 4, username: user?.username ?? 'You', normalizedScore: 0.88 },
          { rank: 5, username: 'Sam Taylor', normalizedScore: 0.85 },
        ])
        setBatchLeaderboard([
          { rank: 1, name: 'Alpha Batch', medium: 'English', averageNormalizedScore: 0.92 },
          { rank: 2, name: 'Beta Batch', medium: 'Bengali', averageNormalizedScore: 0.85 },
        ])
        setCompletedTests([
           { id: 'c1', title: 'Test 1', submissions: [{ id: 's1', maxScore: 100, scoreTotal: 85, submittedAt: '' }], subject: '', _count: { questions: 0 }, durationMinutes: 0, startTime: '', endTime: '', classLevel: '' },
           { id: 'c2', title: 'Test 2', submissions: [{ id: 's2', maxScore: 100, scoreTotal: 92, submittedAt: '' }], subject: '', _count: { questions: 0 }, durationMinutes: 0, startTime: '', endTime: '', classLevel: '' },
        ])
        return
      }

      if (!token) return
      try {
        setError(null)
        const [overviewData, active, upcoming, completed, classLb, batchLb] = await Promise.all([
          apiRequest<StudentOverview>('/student/overview', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=active', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=upcoming', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=completed', { method: 'GET', token }),
          apiRequest<Array<{ rank: number; username: string; normalizedScore: number }>>('/leaderboards/class', { method: 'GET', token }),
          apiRequest<Array<{ rank: number; name: string; medium: string; averageNormalizedScore: number }>>('/leaderboards/batch', { method: 'GET', token }),
        ])
        setOverview(overviewData)
        setActiveTests(active)
        setUpcomingTests(upcoming)
        setCompletedTests(completed)
        setClassLeaderboard(classLb)
        setBatchLeaderboard(batchLb)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      }
    }
    void loadData()
  }, [token, user?.username])

  const completedTrendData = useMemo(() =>
    completedTests.slice(0, 8).map((test, index) => {
      const submission = test.submissions[0]
      const normalized = submission?.maxScore && submission.maxScore > 0
        ? Number((((submission.scoreTotal ?? 0) / submission.maxScore) * 100).toFixed(1))
        : 0
      return { label: `T${index + 1}`, value: normalized }
    }), [completedTests])

  const batchComparisonData = useMemo(() =>
    batchLeaderboard.slice(0, 8).map((entry) => ({
      label: `${entry.name} (${entry.medium.slice(0, 3)})`,
      value: Number((entry.averageNormalizedScore * 100).toFixed(1)),
    })), [batchLeaderboard])

  return (
    <DashboardLayout title="Student Learning Dashboard" navigation={navigation}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {error ? <p className="error-text">{error}</p> : null}

        <motion.section variants={itemVariants} className="hero-welcome-v2">
          <div className="hero-grid">
            <div className="hero-main-content">
              <span className="hero-badge">Student Portal</span>
              <h2>Welcome back, <span className="highlight">{user?.username}</span>! 👋</h2>
              <p>You have <strong>{activeTests.length}</strong> active tests waiting for your attention. Ready to excel today?</p>
              <div className="hero-actions">
                <Button onClick={() => document.getElementById('active-tests')?.scrollIntoView({ behavior: 'smooth' })} className="pulse-btn">
                  Launch Active Tests <ArrowRight size={18} />
                </Button>
              </div>
            </div>
            <div className="hero-visual hide-mobile">
               <div className="hero-stat-blob">
                  <div className="blob-item">
                    <span className="blob-label">Tests Completed</span>
                    <span className="blob-value">{overview?.completed ?? 0}</span>
                  </div>
                  <div className="v-line"></div>
                  <div className="blob-item">
                    <span className="blob-label">Current Rank</span>
                    <span className="blob-value">#{classLeaderboard.find(e => e.username === user?.username)?.rank ?? '-'}</span>
                  </div>
               </div>
            </div>
          </div>
        </motion.section>

        <div className="stats-row">
          <motion.div variants={itemVariants}>
            <StatCard label="Active" value={overview?.active ?? 0} trend="Live tests" icon={<NotebookTabs size={24} />} tone="primary" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Upcoming" value={overview?.upcoming ?? 0} trend="Scheduled" icon={<CalendarClock size={24} />} tone="warning" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Accuracy" value={`${completedTrendData[completedTrendData.length - 1]?.value ?? 0}%`} trend="Latest score" icon={<Star size={24} />} tone="success" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Total Awards" value={overview?.completed ? Math.floor(overview.completed / 3) : 0} trend="Achievements" icon={<Trophy size={24} />} tone="danger" />
          </motion.div>
        </div>

        <div className="dashboard-bento" style={{ marginTop: '32px' }}>
          <motion.div variants={itemVariants} className="bento-large" id="active-tests">
            <Card title="Active Assessments" subtitle="Tests available for you to take right now" variant="glass" tilt>
              {activeTests.length === 0 ? (
                <div className="empty-state-v2">
                  <div className="empty-icon"><CircleCheckBig size={48} /></div>
                  <h4>All Caught Up!</h4>
                  <p>There are no active tests at the moment. Keep an eye on your schedule.</p>
                  <Button variant="secondary" size="sm">View Schedule</Button>
                </div>
              ) : (
                <div className="assessment-list">
                  {activeTests.map((test) => (
                    <div key={test.id} className="assessment-item">
                      <div className="item-info">
                        <div className="item-subject">{test.subject}</div>
                        <strong className="item-title">{test.title}</strong>
                        <div className="item-meta">
                          <span><ClipboardList size={14} /> {test._count.questions} Qs</span>
                          <span><CalendarClock size={14} /> {test.durationMinutes}m</span>
                        </div>
                      </div>
                      <Link to={`/student/tests/${test.id}/take`}>
                        <Button variant="primary" size="sm">Start Attempt</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="bento-medium">
            <Card title="Performance Evolution" subtitle="Accuracy trend across recent attempts" variant="glass">
              {completedTrendData.length > 0 ? (
                <TrendAreaChart data={completedTrendData} valueSuffix="%" />
              ) : (
                <div className="chart-empty">
                  <BarChart3 size={40} />
                  <p>Take your first test to see analytics</p>
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="bento-medium">
             <Card title="Upcoming Schedule" subtitle="Your next academic milestones" variant="glass">
              {upcomingTests.length === 0 ? (
                <div className="empty-state-v2 compact">
                  <p>No tests scheduled for this week.</p>
                </div>
              ) : (
                <div className="upcoming-list">
                  {upcomingTests.map((test) => (
                    <div key={test.id} className="upcoming-row">
                      <div className="date-badge">
                        <span className="month">{new Date(test.startTime).toLocaleString('default', { month: 'short' })}</span>
                        <span className="day">{new Date(test.startTime).getDate()}</span>
                      </div>
                      <div className="upcoming-info">
                        <strong>{test.title}</strong>
                        <p>{test.subject} · {new Date(test.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="bento-full">
            <Card title="Competitive Intelligence" subtitle="How you compare with your peers" variant="glass">
               <div className="intelligence-grid">
                  <div className="intelligence-section">
                    <h4 className="section-title"><Trophy size={18} /> Class Standings</h4>
                    <div className="leaderboard-mini">
                      {classLeaderboard.slice(0, 5).map((entry, idx) => (
                        <div key={entry.rank} className={`leaderboard-row ${entry.username === user?.username ? 'highlight' : ''}`}>
                           <div className="rank-indicator">
                              <span className={`rank-badge ${idx < 3 ? `top-${idx + 1}` : ''}`}>{entry.rank}</span>
                              <span className="username">{entry.username} {entry.username === user?.username && '(You)'}</span>
                           </div>
                           <span className="score">{(entry.normalizedScore * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="intelligence-section">
                    <h4 className="section-title"><Medal size={18} /> Batch Rivalry</h4>
                    <div className="comparison-viz">
                      {batchLeaderboard.length > 0 ? (
                         <ComparisonBarChart data={batchComparisonData} valueSuffix="%" />
                      ) : (
                        <div className="empty-state-v2 compact">
                          <p>Waiting for more data...</p>
                        </div>
                      )}
                    </div>
                  </div>
               </div>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} style={{ marginTop: '24px' }}>
          <div className="two-col">
            <Card title="My Registration Profile" variant="glass">
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="muted">Short ID (Username)</span>
                  <span className="font-mono text-primary font-bold">{(user as any)?.shortId || user?.username}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="muted">Permanent Long ID</span>
                  <span className="font-mono text-xs">{(user as any)?.longId || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <span className="muted text-xs uppercase tracking-wider font-bold">Enrolled Subjects</span>
                  <div className="flex flex-wrap gap-2">
                    {(user as any)?.subjects?.map((s: string) => (
                      <span key={s} className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-bold">
                        {s}
                      </span>
                    )) || <span className="muted text-xs">General enrollment</span>}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Achievement Guide" variant="glass">
              <div className="inline-actions" style={{ alignItems: 'center' }}>
                <Trophy size={24} style={{ color: 'var(--color-warning-500)' }} />
                <div style={{ marginLeft: '12px' }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>Climb the rankings!</p>
                  <p className="muted" style={{ margin: 0 }}>Focus on consistency: attempt active tests on time and review explanations to boost your score.</p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
