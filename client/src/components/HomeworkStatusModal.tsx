import { X, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { apiRequest } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface Answer {
  questionText: string
  selectedOption?: string
  isCorrect: boolean
  marks: number
}

interface StudentSubmission {
  studentId: string
  username: string
  email: string | null
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED'
  submittedAt: string | null
  score: number
  maxScore: number
  answers: Answer[]
}

interface HomeworkStatusModalProps {
  testId: string
  testTitle: string
  onClose: () => void
}

export const HomeworkStatusModal = ({ testId, testTitle, onClose }: HomeworkStatusModalProps) => {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StudentSubmission[]>([])
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      try {
        setLoading(true)
        const response = await apiRequest<StudentSubmission[]>(`/tests/${testId}/submissions`, {
          method: 'GET',
          token,
        })
        setData(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load submission status')
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [testId, token])

  const getStatusIcon = (status: StudentSubmission['status']) => {
    switch (status) {
      case 'SUBMITTED':
        return <CheckCircle size={18} style={{ color: '#22c55e' }} />
      case 'IN_PROGRESS':
        return <Clock size={18} style={{ color: '#eab308' }} />
      default:
        return <AlertCircle size={18} style={{ color: '#94a3b8' }} />
    }
  }

  const getStatusText = (status: StudentSubmission['status']) => {
    switch (status) {
      case 'SUBMITTED': return 'Submitted'
      case 'IN_PROGRESS': return 'In Progress'
      default: return 'Not Started'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <Card 
          title={`Submission Status: ${testTitle}`} 
          subtitle="Detailed view of student progress and responses"
          variant="glass"
          actions={
            <Button variant="secondary" size="sm" onClick={onClose}>
              <X size={18} />
            </Button>
          }
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }} className="stack-gap">
            {loading && <div className="empty-state">Loading submission data...</div>}
            {error && <div className="error-text">{error}</div>}
            
            {!loading && !error && data.length === 0 && (
              <div className="empty-state">No students assigned to this homework.</div>
            )}

            {!loading && !error && data.length > 0 && (
              <div className="table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-soft)' }}>
                      <th style={{ padding: '12px' }}>Student</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Score</th>
                      <th style={{ padding: '12px' }}>Submitted At</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((student) => (
                      <React.Fragment key={student.studentId}>
                        <tr style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600' }}>{student.username}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>{student.email || 'No email'}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {getStatusIcon(student.status)}
                              <span style={{ fontSize: '0.9rem' }}>{getStatusText(student.status)}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {student.status === 'SUBMITTED' ? (
                              <span style={{ fontWeight: '700', color: 'var(--color-primary-600)' }}>
                                {student.score} / {student.maxScore}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.9rem', color: 'var(--text-soft)' }}>
                            {student.submittedAt ? new Date(student.submittedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {student.status === 'SUBMITTED' && (
                              <button 
                                onClick={() => setExpandedStudentId(expandedStudentId === student.studentId ? null : student.studentId)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-primary-600)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: '600',
                                  fontSize: '0.85rem'
                                }}
                              >
                                {expandedStudentId === student.studentId ? 'Hide Responses' : 'View Responses'}
                                {expandedStudentId === student.studentId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedStudentId === student.studentId && (
                          <tr>
                            <td colSpan={5} style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.03)', borderRadius: '0 0 12px 12px' }}>
                              <div className="stack-gap" style={{ gap: '12px' }}>
                                <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>Question-wise Analysis</h5>
                                {student.answers.map((answer, idx) => (
                                  <div key={idx} style={{ 
                                    padding: '12px', 
                                    background: 'var(--surface-main)', 
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${answer.isCorrect ? '#22c55e' : '#ef4444'}`,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                  }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>
                                      Q{idx + 1}: {answer.questionText}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-soft)' }}>Selected: </span>
                                        <span style={{ fontWeight: '500' }}>{answer.selectedOption || 'Not answered'}</span>
                                      </div>
                                      <div style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '4px',
                                        background: answer.isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: answer.isCorrect ? '#22c55e' : '#ef4444',
                                        fontWeight: '700'
                                      }}>
                                        {answer.isCorrect ? 'CORRECT' : 'INCORRECT'} (+{answer.marks})
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

import React from 'react'
