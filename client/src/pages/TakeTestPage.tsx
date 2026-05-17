import { Timer } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'

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
    imageUrl?: string
    options: Array<{
      id: string
      text: string
      imageUrl?: string
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
        setTimeLeft(detail.category === 'PRACTICE' ? null : detail.durationMinutes * 60)
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
            {test.category === 'PRACTICE' ? (
              <div className="timer-box" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                Untimed Practice 🎯
              </div>
            ) : (
              <div className="timer-box">
                <Timer size={18} /> {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </header>

        <main className="take-test-main container mx-auto px-4 py-8">
          <div className="bento-grid">
            <div className="bento-item-lg-9">
              <Card variant="glass" className="overflow-hidden border-none shadow-xl">
                <div className="h-1 bg-border-soft w-full">
                  {test.category === 'PRACTICE' ? (
                    <motion.div 
                      className="h-full bg-success-500"
                      initial={{ width: '0%' }}
                      animate={{ width: `${(Object.keys(answers).filter(qId => answers[qId] !== undefined).length / test.questions.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                      style={{ backgroundColor: '#10b981' }}
                    />
                  ) : (
                    <motion.div 
                      className="h-full bg-primary-500"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft ?? 0) / (test.durationMinutes * 60) * 100}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  )}
                </div>
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-bold text-primary-500 tracking-wider uppercase">Question {activeQuestionIndex + 1} of {test.questions.length}</span>
                    <div className="flex gap-2">
                       {/* Mark for review placeholder */}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 mb-8">
                    <h3 className="text-xl font-semibold leading-relaxed">{activeQuestion?.text}</h3>
                    {activeQuestion?.imageUrl && (
                      <div className="rounded-2xl overflow-hidden bg-black/5 border border-border-soft">
                        <img 
                          src={activeQuestion.imageUrl} 
                          alt="Question" 
                          className="max-w-full h-auto max-h-[400px] mx-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4">
                    {activeQuestion?.options.map((option, idx) => (
                      <motion.button
                        key={option.id}
                        whileHover={{ scale: 1.01, x: 5 }}
                        whileTap={{ scale: 0.99 }}
                        className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all ${
                          answers[activeQuestion.id] === option.id 
                            ? 'border-primary-500 bg-primary-50/50 shadow-inner' 
                            : 'border-transparent bg-surface-soft hover:bg-white hover:border-primary-200'
                        }`}
                        onClick={() => setAnswers((prev) => ({ ...prev, [activeQuestion.id]: option.id }))}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          answers[activeQuestion.id] === option.id 
                            ? 'bg-primary-500 text-white' 
                            : 'bg-white text-text-muted border border-border-strong'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium block">{option.text}</span>
                          {option.imageUrl && (
                            <div className="mt-3 rounded-lg overflow-hidden border border-border-soft bg-white/50 p-1">
                              <img src={option.imageUrl} alt={`Option ${idx + 1}`} className="max-w-full h-32 object-contain" />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </Card>
              
              <div className="flex justify-between items-center mt-8">
                <Button 
                  variant="secondary" 
                  onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQuestionIndex === 0}
                >
                  Previous
                </Button>
                
                <div className="flex gap-4">
                  {activeQuestionIndex === test.questions.length - 1 ? (
                    <Button onClick={handleSubmit} isLoading={submitting}>
                      Finish Assessment
                    </Button>
                  ) : (
                    <Button onClick={() => setActiveQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}>
                      Next Question
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="bento-item-lg-3">
              <Card title="Navigator" subtitle="Jump to any question" variant="glass">
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {test.questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={`h-10 rounded-lg font-bold transition-all ${
                        activeQuestionIndex === idx
                          ? 'bg-primary-500 text-white shadow-lg'
                          : answers[q.id]
                            ? 'bg-success-500/10 text-success-500 border border-success-500/20'
                            : 'bg-surface-soft text-text-muted hover:bg-white border border-border-soft'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex flex-col gap-3">
                   <div className="flex items-center gap-2 text-xs font-bold text-text-soft">
                      <div className="w-3 h-3 rounded bg-success-500"></div>
                      <span>ANSWERED</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold text-text-soft">
                      <div className="w-3 h-3 rounded bg-primary-500"></div>
                      <span>CURRENT</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold text-text-soft">
                      <div className="w-3 h-3 rounded bg-surface-soft border border-border-soft"></div>
                      <span>NOT VISITED</span>
                   </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  )
}
