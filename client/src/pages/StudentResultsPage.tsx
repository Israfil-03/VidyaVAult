import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { TrendAreaChart } from '../components/charts/TrendAreaChart'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'

interface ResultListItem {
  id: string
  test: {
    title: string
  }
  scoreTotal: number | null
  maxScore: number | null
  submittedAt: string | null
  aiAnalysisSummary?: string | null
}

interface ResultDetail extends ResultListItem {
  answers: Array<{
    question: {
      id: string
      text: string
      explanation?: string | null
      options: Array<{ id: string; text: string; isCorrect: boolean }>
    }
    selectedOption?: { id: string; text: string } | null
    isCorrect: boolean
    marksObtained: number
  }>
}

const navigation = [
  { label: 'Dashboard', to: '/student' },
  { label: 'Results', to: '/student/results' },
]

export const StudentResultsPage = () => {
  const { token } = useAuth()
  const { submissionId } = useParams<{ submissionId?: string }>()
  const [results, setResults] = useState<ResultListItem[]>([])
  const [detail, setDetail] = useState<ResultDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!token) {
        return
      }
      try {
        setError(null)
        const listData = await apiRequest<ResultListItem[]>('/student/results', { method: 'GET', token })
        setResults(listData)
        if (submissionId) {
          const detailData = await apiRequest<ResultDetail>(`/student/results/${submissionId}`, {
            method: 'GET',
            token,
          })
          setDetail(detailData)
        } else {
          setDetail(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch results')
      }
    }
    void load()
  }, [submissionId, token])

  const scoreTrend = useMemo(
    () =>
      results
        .slice(0, 8)
        .reverse()
        .map((result, index) => ({
          label: `T${index + 1}`,
          value:
            result.maxScore && result.maxScore > 0
              ? Number((((result.scoreTotal ?? 0) / result.maxScore) * 100).toFixed(1))
              : 0,
        })),
    [results],
  )

  const detailPercent =
    detail?.maxScore && detail.maxScore > 0
      ? (((detail.scoreTotal ?? 0) / detail.maxScore) * 100).toFixed(1)
      : '0'

  return (
    <DashboardLayout title="Student Results" navigation={navigation}>
      <div>
        {error ? <p className="error-text">{error}</p> : null}

        <Card title="Performance Trend" subtitle="Normalized scores across recent completed tests">
          <TrendAreaChart data={scoreTrend} valueSuffix="%" />
        </Card>

        <div className="two-col">
          <Card title="Completed Tests">
            {results.length === 0 ? (
              <div className="empty-state">No submissions yet. Complete a test to see results here.</div>
            ) : (
              <ul className="plain-list">
                {results.map((item) => (
                  <li key={item.id}>
                    <strong>{item.test.title}</strong> - Score {item.scoreTotal ?? 0}/{item.maxScore ?? 0}
                    <span className="inline-actions">
                      <Link to={`/student/results/${item.id}`}>
                        <Button variant="secondary" size="sm">
                          Open
                        </Button>
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Detailed Result">
            {detail ? (
              <div className="stack-gap">
                <p>
                  <strong>{detail.test.title}</strong>
                </p>
                <p>
                  Score: {detail.scoreTotal ?? 0}/{detail.maxScore ?? 0} ({detailPercent}%)
                </p>
                <p className="muted">
                  Rank context is available from your dashboard class and batch leaderboard.
                </p>
                <Card title="AI Analysis Summary">
                  <p>{detail.aiAnalysisSummary ?? 'AI analysis unavailable for this attempt.'}</p>
                </Card>
                <div>
                  <h4>Question Review</h4>
                  {detail.answers.map((answer) => (
                    <div className="question-card" key={answer.question.id}>
                      <p>{answer.question.text}</p>
                      <p>
                        Your answer: {answer.selectedOption?.text ?? 'Not answered'} |{' '}
                        <span
                          className={`status-pill ${answer.isCorrect ? 'status-active' : 'status-closed'}`}
                        >
                          {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </p>
                      <p>
                        Correct answer:{' '}
                        {answer.question.options.find((option) => option.isCorrect)?.text ?? 'N/A'}
                      </p>
                      <p>Explanation: {answer.question.explanation ?? 'No explanation provided.'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">Select a result from the list to view details.</div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
