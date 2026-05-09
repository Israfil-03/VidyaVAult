import { Timer } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'
import { getDashboardNavigation } from './shared/dashboardNavigation'

interface TestDetail {
  id: string
  title: string
  durationMinutes: number
  category: string
  questions: Array<{
    id: string
    text: string
    options: Array<{
      id: string
      text: string
    }>
  }>
}

const navigation = getDashboardNavigation('student')

const formatTime = (seconds: number | null) => {
  if (seconds === null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const TakeTestPage = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { testId } = useParams<{ testId: string }>()
  const [test, setTest] = useState<TestDetail | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({})
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      if (!token || !testId) return
      try {
        setError(null)
        const submission = await apiRequest<{ id: string }>(`/student/tests/${testId}/start`, { method: 'POST', token })
        setSubmissionId(submission.id)
        const detail = await apiRequest<TestDetail>(`/student/tests/${testId}/detail`, { method: 'GET', token })
        setTest(detail)
        setTimeLeft(detail.durationMinutes * 60)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start test')
      }
    }
    void initialize()
  }, [token, testId])

  const saveAnswers = useCallback(async () => {
    if (!token || !submissionId) return
    await apiRequest(`/student/submissions/${submissionId}/answers`, {
      method: 'POST',
      token,
      body: JSON.stringify({
        answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId })),
      }),
    })
  }, [answers, submissionId, token])

  const handleSubmit = useCallback(async () => {
    if (!token || !submissionId) return
    setSubmitting(true)
    try {
      await saveAnswers()
      await apiRequest(`/student/submissions/${submissionId}/submit`, { method: 'POST', token })
      navigate(`/student/performance/${submissionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit test')
    } finally {
      setSubmitting(false)
    }
  }, [navigate, saveAnswers, submissionId, token])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || !submissionId) return
    const timer = setInterval(() => setTimeLeft((prev) => (prev !== null ? Math.max(prev - 1, 0) : null)), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, submissionId])

  useEffect(() => {
    if (!submissionId || timeLeft !== 0 || submitting) return
    void handleSubmit()
  }, [handleSubmit, timeLeft, submitting, submissionId])

  const activeQuestion = test?.questions[activeQuestionIndex]
  const isHomework = test?.category === 'HOMEWORK'

  if (!test) return <DashboardLayout title="Loading..." navigation={navigation}><p className="muted">Loading test...</p></DashboardLayout>

  return (
    <DashboardLayout title="Take Test" navigation={navigation}>
      <div className={`take-test-page ${isHomework ? 'homework-mode' : ''}`}>
        {error && <p className="error-text">{error}</p>}
        <header className="take-test-header">
          <div className="header-content">
            <div>
              <h2 className="fade-in-up">{test.title}</h2>
              <div className="muted">{isHomework ? 'Daily Homework Assignment' : test.category.replace('_', ' ')}</div>
            </div>
            <div className="timer-box">
              <Timer size={18} /> {formatTime(timeLeft)}
            </div>
          </div>
        </header>

        <main className="take-test-main">
          <div className="take-test-grid">
            <div className="question-panel">
              <Card variant="glass" className="focus-card">
                <div className="question-header">
                  <span className="question-number">Question {activeQuestionIndex + 1} of {test.questions.length}</span>
                </div>
                <div className="question-text">{activeQuestion?.text}</div>
                <div className="options-list">
                  {activeQuestion?.options.map((option) => (
                    <button
                      key={option.id}
                      className={`option-btn ${answers[activeQuestion.id] === option.id ? 'selected' : ''}`}
                      onClick={() => setAnswers((prev) => ({ ...prev, [activeQuestion.id]: option.id }))}
                    >
                      <div className="option-indicator" />
                      {option.text}
                    </button>
                  ))}
                </div>
              </Card>
              
              <div className="question-nav-actions">
                <Button 
                  variant="secondary" 
                  onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQuestionIndex === 0}
                >
                  Previous
                </Button>
                {activeQuestionIndex === test.questions.length - 1 ? (
                  <Button onClick={handleSubmit} isLoading={submitting}>
                    Finish & Submit
                  </Button>
                ) : (
                  <Button onClick={() => setActiveQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}>
                    Next Question
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  )
}
