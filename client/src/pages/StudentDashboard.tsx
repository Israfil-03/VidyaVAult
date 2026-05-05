import { CalendarClock, LayoutDashboard, Medal, NotebookTabs, Trophy, ClipboardList, Zap, ArrowRight, Star } from 'lucide-react'
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
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
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
  }, [token])

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

        <motion.section variants={itemVariants} className="hero-welcome">
          <div className="hero-content">
            <h2>Welcome back, {user?.username}! 👋</h2>
            <p>You have {activeTests.length} active tests waiting for you. Ready to sharpen your skills today?</p>
            <div className="inline-actions" style={{ marginTop: '20px' }}>
              <Button onClick={() => document.getElementById('active-tests')?.scrollIntoView({ behavior: 'smooth' })}>
                View Active Tests <ArrowRight size={16} />
              </Button>
            </div>
          </div>
          <div className="hero-stats hide-mobile" style={{ position: 'absolute', right: '40px', bottom: '40px', display: 'flex', gap: '20px' }}>
             <div className="glass" style={{ padding: '12px 20px', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800 }}>{overview?.completed ?? 0}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>Completed</span>
             </div>
             <div className="glass" style={{ padding: '12px 20px', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800 }}>{classLeaderboard.find(e => e.username === user?.username)?.rank ?? '-'}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>Your Rank</span>
             </div>
          </div>
        </motion.section>

        <div className="stats-grid">
          <motion.div variants={itemVariants}>
            <StatCard label="Active Tests" value={overview?.active ?? 0} trend="Available now" icon={<NotebookTabs size={20} />} tone="primary" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Upcoming Tests" value={overview?.upcoming ?? 0} trend="Scheduled ahead" icon={<CalendarClock size={20} />} tone="warning" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Performance" value={`${completedTrendData[completedTrendData.length - 1]?.value ?? 0}%`} trend="Latest score" icon={<Star size={20} />} tone="success" />
          </motion.div>
        </div>

        <div className="bento-grid" style={{ marginTop: '24px' }}>
          <motion.div variants={itemVariants} className="bento-item-large" id="active-tests">
            <Card title="Active Tests" subtitle="Tests available for you to take right now" variant="glass" tilt>
              {activeTests.length === 0 ? (
                <div className="empty-state">No active tests right now. Great job staying up to date!</div>
              ) : (
                <div className="premium-list">
                  {activeTests.map((test) => (
                    <div key={test.id} className="premium-item">
                      <div>
                        <strong style={{ fontSize: '1.1rem' }}>{test.title}</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <Zap size={14} style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--color-warning-500)' }} />
                          {test.subject} • {test._count.questions} Questions • {test.durationMinutes} mins
                        </div>
                      </div>
                      <Link to={`/student/tests/${test.id}/take`}>
                        <Button variant="primary" size="sm">Start Now</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card title="Performance Trend" subtitle="Recent score history" variant="glass">
              <TrendAreaChart data={completedTrendData} valueSuffix="%" />
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
             <Card title="Batch Competition" subtitle="Top performing batches" variant="glass">
                <ComparisonBarChart data={batchComparisonData} valueSuffix="%" />
             </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card title="Upcoming Tests" subtitle="Prepare for what's next" variant="glass">
              {upcomingTests.length === 0 ? (
                <div className="empty-state">No upcoming tests scheduled.</div>
              ) : (
                <ul className="plain-list">
                  {upcomingTests.map((test) => (
                    <li key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><strong>{test.title}</strong></span>
                      <span className="badge badge-silver">{new Date(test.startTime).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="bento-item-large">
            <Card title="Competitive Edge" subtitle="Class Rankings & Batch Leaders" variant="glass">
               <div className="two-col">
                  <div>
                    <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={18} color="#fbbf24" /> Class Leaderboard</h4>
                    <ul className="plain-list">
                      {classLeaderboard.slice(0, 5).map((entry, idx) => (
                        <li key={entry.rank} className="premium-item" style={{ padding: '8px 12px' }}>
                           <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className={`badge ${idx === 0 ? 'badge-gold' : idx === 1 ? 'badge-silver' : idx === 2 ? 'badge-bronze' : ''}`} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{entry.rank}</span>
                              {entry.username}
                           </span>
                           <span style={{ fontWeight: 700 }}>{(entry.normalizedScore * 100).toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Medal size={18} color="#3b82f6" /> Batch Competition</h4>
                    <ul className="plain-list">
                      {batchLeaderboard.slice(0, 5).map((entry, idx) => (
                        <li key={entry.rank} className="premium-item" style={{ padding: '8px 12px' }}>
                           <span>{entry.name} <small className="muted">({entry.medium})</small></span>
                           <span style={{ fontWeight: 700 }}>{(entry.averageNormalizedScore * 100).toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
               </div>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} style={{ marginTop: '24px' }}>
          <Card title="Achievement Guide" variant="glass">
            <div className="inline-actions" style={{ alignItems: 'center' }}>
              <Trophy size={24} style={{ color: 'var(--color-warning-500)' }} />
              <div style={{ marginLeft: '12px' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Climb the rankings!</p>
                <p className="muted" style={{ margin: 0 }}>Focus on consistency: attempt active tests on time and review explanations to boost your score.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
