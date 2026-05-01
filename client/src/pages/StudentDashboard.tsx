import { CalendarClock, LayoutDashboard, Medal, NotebookTabs, Trophy, ClipboardList } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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

export const StudentDashboard = () => {
  const { token } = useAuth()
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
      if (!token) {
        return
      }
      try {
        setError(null)
        const [overviewData, active, upcoming, completed, classLb, batchLb] = await Promise.all([
          apiRequest<StudentOverview>('/student/overview', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=active', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=upcoming', { method: 'GET', token }),
          apiRequest<TestCard[]>('/student/tests?status=completed', { method: 'GET', token }),
          apiRequest<Array<{ rank: number; username: string; normalizedScore: number }>>(
            '/leaderboards/class',
            { method: 'GET', token },
          ),
          apiRequest<Array<{ rank: number; name: string; medium: string; averageNormalizedScore: number }>>(
            '/leaderboards/batch',
            { method: 'GET', token },
          ),
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

  const completedTrendData = useMemo(
    () =>
      completedTests.slice(0, 8).map((test, index) => {
        const submission = test.submissions[0]
        const normalized =
          submission?.maxScore && submission.maxScore > 0
            ? Number((((submission.scoreTotal ?? 0) / submission.maxScore) * 100).toFixed(1))
            : 0
        return {
          label: `Test ${index + 1}`,
          value: normalized,
        }
      }),
    [completedTests],
  )

  const batchComparisonData = useMemo(
    () =>
      batchLeaderboard.slice(0, 8).map((entry) => ({
        label: `${entry.name} (${entry.medium.slice(0, 3)})`,
        value: Number((entry.averageNormalizedScore * 100).toFixed(1)),
      })),
    [batchLeaderboard],
  )

  return (
    <DashboardLayout title="Student Learning Dashboard" navigation={navigation}>
      <div>
        {error ? <p className="error-text">{error}</p> : null}

        <div className="stats-grid">
          <StatCard
            label="Active Tests"
            value={overview?.active ?? 0}
            trend="Available now"
            icon={<NotebookTabs size={18} />}
          />
          <StatCard
            label="Upcoming Tests"
            value={overview?.upcoming ?? 0}
            trend="Scheduled ahead"
            tone="warning"
            icon={<CalendarClock size={18} />}
          />
          <StatCard
            label="Completed Tests"
            value={overview?.completed ?? 0}
            trend="Submission history"
            tone="success"
            icon={<Medal size={18} />}
          />
        </div>

        <div className="two-col">
          <Card title="Recent Performance Trend" subtitle="Score movement from recent completed tests">
            <TrendAreaChart data={completedTrendData} valueSuffix="%" />
          </Card>
          <Card title="Batch Competition" subtitle="Top medium-wise batch performance">
            <ComparisonBarChart data={batchComparisonData} valueSuffix="%" />
          </Card>
        </div>

        <div className="two-col">
          <Card title="Active Tests">
            {activeTests.length === 0 ? (
              <div className="empty-state">No active tests right now.</div>
            ) : (
              <ul className="plain-list">
                {activeTests.map((test) => (
                  <li key={test.id}>
                    <strong>{test.title}</strong> ({test.subject}) - {test._count.questions} questions
                    <div className="inline-actions">
                      <Link to={`/student/tests/${test.id}/take`}>
                        <Button>Start Test</Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Upcoming Tests">
            {upcomingTests.length === 0 ? (
              <div className="empty-state">No upcoming tests scheduled.</div>
            ) : (
              <ul className="plain-list">
                {upcomingTests.map((test) => (
                  <li key={test.id}>
                    <strong>{test.title}</strong> starts {new Date(test.startTime).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Completed Tests">
          {completedTests.length === 0 ? (
            <div className="empty-state">Submit a test to unlock detailed performance insights.</div>
          ) : (
            <ul className="plain-list">
              {completedTests.map((test) => {
                const submission = test.submissions[0]
                return (
                  <li key={test.id}>
                    <strong>{test.title}</strong> - Score: {submission?.scoreTotal ?? 0}/
                    {submission?.maxScore ?? 0}
                    {submission?.id ? (
                      <span className="inline-actions">
                        <Link to={`/student/results/${submission.id}`}>
                          <Button variant="secondary" size="sm">
                            View Result
                          </Button>
                        </Link>
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <div className="two-col">
          <Card title="Class Leaderboard">
            {classLeaderboard.length === 0 ? (
              <div className="empty-state">Leaderboard updates after eligible submissions.</div>
            ) : (
              <ul className="plain-list">
                {classLeaderboard.slice(0, 10).map((entry) => (
                  <li key={entry.rank}>
                    #{entry.rank} {entry.username} - {(entry.normalizedScore * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Batch Competition (English vs Bengali)">
            {batchLeaderboard.length === 0 ? (
              <div className="empty-state">No batch competition data yet.</div>
            ) : (
              <ul className="plain-list">
                {batchLeaderboard.slice(0, 10).map((entry) => (
                  <li key={entry.rank}>
                    #{entry.rank} {entry.name} ({entry.medium}) -{' '}
                    {(entry.averageNormalizedScore * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Achievement Focus" subtitle="How to climb rankings faster">
          <div className="inline-actions">
            <Trophy size={16} />
            <span className="muted">
              Focus on consistency: attempt active tests on time and review explanation notes after each
              result.
            </span>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
