import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'

interface TestDetail {
  id: string
  title: string
  durationMinutes: number
  questions: Array<{
    id: string
    text: string
    explanation?: string | null
    options: Array<{
      id: string
      text: string
    }>
  }>
}

const navigation = [
  { label: 'Dashboard', to: '/student' },
  { label: 'Results', to: '/student/results' },
]

export const TakeTestPage = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { testId } = useParams<{ testId: string }>()
  const [test, setTest] = useState<TestDetail | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      if (!token || !testId) {
        return
      }
      try {
        setError(null)
        const submission = await apiRequest<{ id: string }>(`/student/tests/${testId}/start`, {
          method: 'POST',
          token,
        })
        setSubmissionId(submission.id)
        const detail = await apiRequest<TestDetail>(`/student/tests/${testId}/detail`, {
          method: 'GET',
          token,
        })
        setTest(detail)
        setRemainingSeconds(detail.durationMinutes * 60)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start test')
      }
    }
    void initialize()
  }, [token, testId])

  const saveCurrentAnswers = useCallback(async () => {
    if (!token || !submissionId) {
      return
    }
    await apiRequest(`/student/submissions/${submissionId}/answers`, {
      method: 'POST',
      token,
      body: JSON.stringify({
        answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      }),
    })
  }, [answers, submissionId, token])

  const finalizeSubmission = useCallback(async () => {
    if (!token || !submissionId) {
      return
    }
    setSaving(true)
    try {
      await saveCurrentAnswers()
      await apiRequest(`/student/submissions/${submissionId}/submit`, {
        method: 'POST',
        token,
      })
      navigate(`/student/results/${submissionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit test')
    } finally {
      setSaving(false)
    }
  }, [navigate, saveCurrentAnswers, submissionId, token])

  useEffect(() => {
    if (remainingSeconds <= 0 || !submissionId) {
      return
    }
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [remainingSeconds, submissionId])

  useEffect(() => {
    if (!submissionId || remainingSeconds !== 0 || saving) {
      return
    }
    void finalizeSubmission()
  }, [finalizeSubmission, remainingSeconds, saving, submissionId])

  const currentQuestion = test?.questions[currentIndex]
  const progress = useMemo(() => {
    if (!test || test.questions.length === 0) {
      return 0
    }
    const answered = Object.values(answers).filter(Boolean).length
    return Math.round((answered / test.questions.length) * 100)
  }, [answers, test])

  return (
    <DashboardLayout title="Take Test" navigation={navigation}>
      <div>
        {error ? <p className="error-text">{error}</p> : null}
        {test ? (
          <Card title={test.title} subtitle="Answer each question and submit before timer reaches zero">
            <div className="test-header">
              <p>
                Time left: {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, '0')}
              </p>
              <p>Progress: {progress}%</p>
            </div>
            <div className="test-progress">
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="question-jump-grid">
              {test.questions.map((question, index) => (
                <button
                  key={question.id}
                  type="button"
                  className={`jump-chip ${index === currentIndex ? 'active' : ''} ${
                    answers[question.id] ? 'answered' : ''
                  }`}
                  onClick={() => setCurrentIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestion ? (
              <div className="question-card">
                <h4>
                  Question {currentIndex + 1} of {test.questions.length}
                </h4>
                <p>{currentQuestion.text}</p>
                <div className="options-grid">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      className={`option-btn ${answers[currentQuestion.id] === option.id ? 'selected' : ''}`}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: option.id,
                        }))
                      }
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="inline-actions">
              <Button
                variant="secondary"
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, (test.questions.length || 1) - 1))}
                disabled={currentIndex >= test.questions.length - 1}
              >
                Next
              </Button>
              <Button onClick={finalizeSubmission} isLoading={saving}>
                {saving ? 'Submitting...' : 'Submit Test'}
              </Button>
            </div>
          </Card>
        ) : (
          <p className="muted">Loading test...</p>
        )}
      </div>
    </DashboardLayout>
  )
}
