import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
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
  { label: 'Dashboard', to: '/student' },
  { label: 'Results', to: '/student/results' },
]

export const StudentDashboard = () => {
  const { token } = useAuth()
  const [overview, setOverview] = useState<StudentOverview | null>(null)
  const [activeTests, setActiveTests] = useState<TestCard[]>([])
  const [upcomingTests, setUpcomingTests] = useState<TestCard[]>([])
  const [completedTests, setCompletedTests] = useState<TestCard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [classLeaderboard, setClassLeaderboard] = useState<Array<{ rank: number; username: string; normalizedScore: number }>>([])
  const [batchLeaderboard, setBatchLeaderboard] = useState<Array<{ rank: number; name: string; medium: string; averageNormalizedScore: number }>>([])

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

  return (
    <DashboardLayout title="Student Dashboard" navigation={navigation}>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="stats-grid">
        <Card title="Tests to Attempt">{overview?.active ?? 0}</Card>
        <Card title="Upcoming Tests">{overview?.upcoming ?? 0}</Card>
        <Card title="Completed Tests">{overview?.completed ?? 0}</Card>
      </div>

      <div className="two-col">
        <Card title="Active Tests">
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
        </Card>
        <Card title="Upcoming Tests">
          <ul className="plain-list">
            {upcomingTests.map((test) => (
              <li key={test.id}>
                <strong>{test.title}</strong> starts {new Date(test.startTime).toLocaleString()}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Completed Tests">
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
                      <Button variant="secondary">View Result</Button>
                    </Link>
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="two-col">
        <Card title="Class Leaderboard">
          <ul className="plain-list">
            {classLeaderboard.slice(0, 10).map((entry) => (
              <li key={entry.rank}>
                #{entry.rank} {entry.username} - {(entry.normalizedScore * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Batch Competition (English vs Bengali)">
          <ul className="plain-list">
            {batchLeaderboard.slice(0, 10).map((entry) => (
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
