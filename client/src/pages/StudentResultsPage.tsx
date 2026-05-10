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
import { getDashboardNavigation } from './shared/dashboardNavigation'

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

const navigation = getDashboardNavigation('student')

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
    <DashboardLayout title="Student Performance Details" navigation={navigation}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {error ? <p className="error-text">{error}</p> : null}

        <div className="bento-grid">
          <motion.div variants={itemVariants} className={submissionId ? 'bento-item-lg-8' : 'bento-item'}>
            <Card title="Performance Trend" subtitle="Progress across recent tests" variant="glass" tilt>
               <TrendAreaChart data={scoreTrend} valueSuffix="%" />
            </Card>
          </motion.div>

          {submissionId && (
            <motion.div variants={itemVariants} className="bento-item-lg-4">
              <Card title="Quick Stats" variant="glass" tilt>
                 <div className="flex flex-col items-center justify-center py-6">
                    <div className="text-6xl font-black text-primary-500 tracking-tighter">{detailPercent}%</div>
                    <p className="text-text-soft font-bold uppercase tracking-widest text-xs mt-2">Overall Accuracy</p>
                    <div className="flex justify-center gap-6 mt-8 w-full">
                       <div className="bg-success-500/10 p-4 rounded-2xl flex-1 text-center border border-success-500/20">
                          <span className="block text-2xl font-black text-success-500">{detail?.scoreTotal}</span>
                          <span className="text-[10px] font-bold text-success-500/70 uppercase">Correct</span>
                       </div>
                       <div className="bg-danger-500/10 p-4 rounded-2xl flex-1 text-center border border-danger-500/20">
                          <span className="block text-2xl font-black text-danger-500">{(detail?.maxScore ?? 0) - (detail?.scoreTotal ?? 0)}</span>
                          <span className="text-[10px] font-bold text-danger-500/70 uppercase">Incorrect</span>
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
                      <Link to={`/student/performance/${item.id}`}>
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
            <motion.div variants={itemVariants} className="bento-item-lg-12">
              <Card title="Detailed Analysis" subtitle="Question-by-question review" variant="glass">
                <div className="space-y-6">
                  <div className="bg-grad-primary p-1 rounded-[22px]">
                    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[20px]">
                      <h4 className="flex items-center gap-3 text-primary-600 font-bold">
                        <Trophy size={22} className="text-warning-500" /> 
                        Personalized AI Mentorship
                      </h4>
                      <p className="mt-4 text-text-main text-lg leading-relaxed font-medium italic">
                        "{detail.aiAnalysisSummary ?? 'AI analysis is processing your attempt. Check back soon for personalized feedback!'}"
                      </p>
                    </div>
                  </div>
                  <div className="mt-12">
                    <h4 className="mb-6 flex items-center gap-3 font-bold text-xl"><ListChecks size={24} className="text-primary-500" /> Review Questions</h4>
                    <div className="grid gap-6">
                      {detail.answers.map((answer, idx) => (
                        <div key={answer.question.id} className="bg-white rounded-2xl p-6 shadow-sm border border-border-soft flex flex-col gap-4 relative overflow-hidden">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${answer.isCorrect ? 'bg-success-500' : 'bg-danger-500'}`} />
                          <div className="flex justify-between items-center">
                            <span className="text-text-soft font-bold text-xs tracking-tighter uppercase">Question {idx + 1}</span>
                            {answer.isCorrect 
                              ? <div className="bg-success-500/10 text-success-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Correct</div> 
                              : <div className="bg-danger-500/10 text-danger-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14} /> Incorrect</div>
                            }
                          </div>
                          <p className="font-bold text-lg leading-snug">{answer.question.text}</p>
                          
                          <div className="grid md:grid-cols-2 gap-4 mt-2">
                             <div className="bg-surface-soft p-4 rounded-xl border border-border-soft">
                                <span className="block text-[10px] font-bold text-text-soft uppercase mb-1">Your Selection</span>
                                <span className={`font-bold ${answer.isCorrect ? 'text-success-500' : 'text-danger-500'}`}>{answer.selectedOption?.text ?? 'Not answered'}</span>
                             </div>
                             {!answer.isCorrect && (
                               <div className="bg-success-500/5 p-4 rounded-xl border border-success-500/20">
                                 <span className="block text-[10px] font-bold text-success-500/70 uppercase mb-1">Correct Answer</span>
                                 <span className="font-bold text-success-600">{answer.question.options.find(o => o.isCorrect)?.text}</span>
                               </div>
                             )}
                          </div>
                          
                          {answer.question.explanation && (
                            <div className="bg-primary-50/30 p-5 rounded-xl border border-primary-100/50 mt-2">
                               <div className="flex items-center gap-2 text-primary-600 font-bold text-xs uppercase tracking-wider mb-2">
                                  <Sparkles size={14} /> Concept Explanation
                               </div>
                               <p className="text-sm text-text-muted leading-relaxed">{answer.question.explanation}</p>
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
