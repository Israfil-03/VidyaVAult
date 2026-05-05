import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Trophy, ListChecks } from 'lucide-react'

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export const StudentResultsPage = () => {
  const { token } = useAuth()
  const { submissionId } = useParams<{ submissionId?: string }>()
  const [results, setResults] = useState<ResultListItem[]>([])
  const [detail, setDetail] = useState<ResultDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!token) return
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

  const scoreTrend = useMemo(() =>
    results
      .slice(0, 8)
      .reverse()
      .map((result, index) => ({
        label: `T${index + 1}`,
        value: result.maxScore && result.maxScore > 0
          ? Number((((result.scoreTotal ?? 0) / result.maxScore) * 100).toFixed(1))
          : 0,
      })), [results])

  const detailPercent = detail?.maxScore && detail.maxScore > 0
    ? (((detail.scoreTotal ?? 0) / detail.maxScore) * 100).toFixed(1)
    : '0'

  return (
    <DashboardLayout title="Performance Insights" navigation={navigation}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {error ? <p className="error-text">{error}</p> : null}

        <div className="bento-grid">
          <motion.div variants={itemVariants} className={submissionId ? '' : 'bento-item-large'}>
            <Card title="Performance Trend" subtitle="Progress across recent tests" variant="glass" tilt>
               <TrendAreaChart data={scoreTrend} valueSuffix="%" />
            </Card>
          </motion.div>

          {submissionId && (
            <motion.div variants={itemVariants}>
              <Card title="Quick Stats" variant="glass" tilt>
                 <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-primary-600)' }}>{detailPercent}%</div>
                    <p className="muted">Overall Accuracy</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                       <div className="glass" style={{ padding: '10px 15px', borderRadius: '12px' }}>
                          <span style={{ display: 'block', fontWeight: 700, color: 'var(--color-success-500)' }}>{detail?.scoreTotal}</span>
                          <span style={{ fontSize: '0.7rem' }}>Correct</span>
                       </div>
                       <div className="glass" style={{ padding: '10px 15px', borderRadius: '12px' }}>
                          <span style={{ display: 'block', fontWeight: 700, color: 'var(--color-danger-500)' }}>{(detail?.maxScore ?? 0) - (detail?.scoreTotal ?? 0)}</span>
                          <span style={{ fontSize: '0.7rem' }}>Incorrect</span>
                       </div>
                    </div>
                 </div>
              </Card>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className={submissionId ? 'bento-item-large' : ''}>
            <Card title="Submission History" subtitle="Your completed tests" variant="glass">
              {results.length === 0 ? (
                <div className="empty-state">No submissions yet. Complete a test to see results here.</div>
              ) : (
                <div className="premium-list">
                  {results.map((item) => (
                    <div key={item.id} className={`premium-item ${submissionId === item.id ? 'active' : ''}`} style={{ borderColor: submissionId === item.id ? 'var(--color-primary-500)' : '' }}>
                      <div>
                        <strong>{item.test.title}</strong>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>Score: {item.scoreTotal ?? 0}/{item.maxScore ?? 0} • {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <Link to={`/student/results/${item.id}`}>
                        <Button variant={submissionId === item.id ? 'primary' : 'secondary'} size="sm">
                          {submissionId === item.id ? 'Viewing' : 'Open'}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {detail && (
            <motion.div variants={itemVariants} className="bento-item-large">
              <Card title="Detailed Analysis" subtitle="Question-by-question review" variant="glass">
                <div className="stack-gap">
                  <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--color-primary-100)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={18} color="var(--color-warning-500)" /> AI Insights</h4>
                    <p style={{ marginTop: '10px', fontSize: '0.95rem', lineHeight: '1.6' }}>{detail.aiAnalysisSummary ?? 'AI analysis is processing your attempt. Check back soon for personalized feedback!'}</p>
                  </div>
                  
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><ListChecks size={18} /> Review Questions</h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {detail.answers.map((answer, idx) => (
                        <div key={answer.question.id} className="premium-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', borderLeft: `4px solid ${answer.isCorrect ? 'var(--color-success-500)' : 'var(--color-danger-500)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 700 }}>QUESTION {idx + 1}</span>
                            {answer.isCorrect ? <CheckCircle2 size={18} color="var(--color-success-500)" /> : <XCircle size={18} color="var(--color-danger-500)" />}
                          </div>
                          <p style={{ fontWeight: 600, fontSize: '1rem' }}>{answer.question.text}</p>
                          <div style={{ width: '100%', display: 'grid', gap: '8px' }}>
                             <div className="glass" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                                <strong>Your Answer:</strong> <span style={{ color: answer.isCorrect ? 'var(--color-success-500)' : 'var(--color-danger-500)' }}>{answer.selectedOption?.text ?? 'Not answered'}</span>
                             </div>
                             {!answer.isCorrect && (
                               <div className="glass" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', background: 'rgba(34, 197, 94, 0.05)' }}>
                                 <strong>Correct Answer:</strong> <span style={{ color: 'var(--color-success-500)' }}>{answer.question.options.find(o => o.isCorrect)?.text}</span>
                               </div>
                             )}
                          </div>
                          {answer.question.explanation && (
                            <div style={{ fontSize: '0.85rem', background: 'var(--surface-soft)', padding: '12px', borderRadius: '10px', border: '1px dashed var(--border-strong)', width: '100%' }}>
                               <strong>Explanation:</strong> {answer.question.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  )
}
