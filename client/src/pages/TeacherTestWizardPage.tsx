import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Trash2, Plus, Database, Search, CheckCircle2, Loader2, XCircle, Info, Settings, Edit3, Users, ClipboardCheck, AlertTriangle } from 'lucide-react'
import { AutoExpandingTextarea } from '../components/AutoExpandingTextarea'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'
import type { QuestionInput, QuestionBankEntry } from '../types'
import { getDashboardNavigation } from './shared/dashboardNavigation'

interface BatchOption {
  id: string
  name: string
}

interface StudentOption {
  id: string
  username: string
}

const navigation = getDashboardNavigation('teacher')

const createEmptyQuestion = (): QuestionInput => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
  text: '',
  chapter: '',
  concept: '',
  difficulty: 'MEDIUM',
  marks: 1,
  source: 'MANUAL',
  explanation: '',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
})

export const TeacherTestWizardPage = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [testForm, setTestForm] = useState({
    title: '',
    subject: 'CHEMISTRY',
    category: 'WEEKLY_TEST',
    isDaily: false,
    boardTarget: 'WEST_BENGAL',
    classLevel: '10',
    startTime: '',
    endTime: '',
    durationMinutes: 60,
    creationMode: 'MANUAL',
    autoSaveToBank: false,
  })
  const [aiConfig, setAiConfig] = useState({
    topic: '',
    difficulty: 'MEDIUM',
    numQuestions: 5,
  })
  const [questions, setQuestions] = useState<QuestionInput[]>([createEmptyQuestion()])
  const [aiPreviewQuestions, setAiPreviewQuestions] = useState<QuestionInput[] | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])
  
  // Question Bank Integration
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [bankQuestions, setBankQuestions] = useState<QuestionBankEntry[]>([])
  const [bankLoading, setBankLoading] = useState(false)
  const [bankFilters, setBankFilters] = useState({
    subject: testForm.subject,
    search: ''
  })

  // Sub-wizard state for Step 3
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [qEditorStep, setQEditorStep] = useState<'DETAILS' | 'EXPLANATION'>('DETAILS')
  const [similarQuestions, setSimilarQuestions] = useState<QuestionBankEntry[]>([])
  const [isCheckingSimilar, setIsCheckingSimilar] = useState(false)

  const assignmentPreview = useMemo(
    () => ({
      students: selectedStudentIds.length,
      batches: selectedBatchIds.length,
    }),
    [selectedBatchIds.length, selectedStudentIds.length],
  )

  useEffect(() => {
    const loadOptions = async () => {
      if (!token) {
        return
      }
      try {
        const [studentRows, batchRows] = await Promise.all([
          apiRequest<StudentOption[]>('/teacher/students', { method: 'GET', token }),
          apiRequest<BatchOption[]>('/teacher/batches', { method: 'GET', token }),
        ])
        setStudents(studentRows)
        setBatches(batchRows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignment data')
      }
    }
    void loadOptions()
  }, [token])

  const updateQuestion = (index: number, updater: (current: QuestionInput) => QuestionInput) => {
    setQuestions((prev) => prev.map((question, idx) => (idx === index ? updater(question) : question)))
  }

  const generateWithAi = async () => {
    if (!token) {
      return
    }

    try {
      const generated = await apiRequest<
        Array<{
          question: string
          options: string[]
          correctIndex: number
          explanation: string
          chapter: string
          concept: string
        }>
      >('/ai/generate-questions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          subject: testForm.subject,
          board: testForm.boardTarget,
          classLevel: testForm.classLevel,
          topic: aiConfig.topic,
          difficulty: aiConfig.difficulty,
          numQuestions: aiConfig.numQuestions,
        }),
      })

      setAiPreviewQuestions(
        generated.map((item) => ({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
          text: item.question,
          chapter: item.chapter,
          concept: item.concept,
          difficulty: aiConfig.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
          marks: 1,
          source: 'AI',
          explanation: item.explanation,
          options: item.options.map((optionText, index) => ({
            text: optionText,
            isCorrect: index === item.correctIndex,
          })),
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI questions')
    }
  }

  const loadBankQuestions = useCallback(async () => {
    if (!token) return
    setBankLoading(true)
    try {
      const query = new URLSearchParams()
      query.append('subject', bankFilters.subject)
      if (bankFilters.search) query.append('search', bankFilters.search)

      const response = await apiRequest<QuestionBankEntry[]>(`/question-bank?${query.toString()}`, { token })
      setBankQuestions(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bank questions')
    } finally {
      setBankLoading(false)
    }
  }, [token, bankFilters.subject, bankFilters.search])

  useEffect(() => {
    if (isBankModalOpen) {
      void loadBankQuestions()
    }
  }, [isBankModalOpen, loadBankQuestions])

  useEffect(() => {
    const text = questions[currentQIndex]?.text || ''
    if (text.length < 15) {
      setSimilarQuestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      if (!token) return
      setIsCheckingSimilar(true)
      try {
        const query = new URLSearchParams()
        query.append('text', text)
        query.append('subject', testForm.subject)
        const response = await apiRequest<QuestionBankEntry[]>(`/question-bank/similar?${query.toString()}`, { token })
        
        const data = Array.isArray(response) ? response : [];
        const currentBankId = questions[currentQIndex].bankId
        setSimilarQuestions(data.filter((q: QuestionBankEntry) => q.id !== currentBankId))
      } catch (err) {
        console.error('Failed to check similar questions:', err)
      } finally {
        setIsCheckingSimilar(false)
      }
    }, 800)

    return () => clearTimeout(timeoutId)
  }, [questions[currentQIndex]?.text, currentQIndex, token, testForm.subject, questions])

  const saveToBank = async (questionIndex: number, isPublic: boolean = false) => {
    if (!token) return
    const question = questions[questionIndex]
    try {
      if (question.savedToBank && question.bankId) {
        await apiRequest(`/question-bank/${question.bankId}`, {
          method: 'PUT',
          token,
          body: JSON.stringify({
            text: question.text,
            subject: testForm.subject,
            chapter: question.chapter,
            concept: question.concept,
            difficulty: question.difficulty,
            explanation: question.explanation,
            imageUrl: question.imageUrl,
            isPublic,
            options: question.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              imageUrl: opt.imageUrl
            }))
          })
        })
        updateQuestion(questionIndex, (current) => ({ ...current, isPublic }))
        alert('Question bank entry updated!')
      } else {
        const response = await apiRequest<QuestionBankEntry>('/question-bank', {
          method: 'POST',
          token,
          body: JSON.stringify({
            text: question.text,
            subject: testForm.subject,
            chapter: question.chapter,
            concept: question.concept,
            difficulty: question.difficulty,
            explanation: question.explanation,
            imageUrl: question.imageUrl,
            isPublic,
            options: question.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              imageUrl: opt.imageUrl
            }))
          })
        })
        updateQuestion(questionIndex, (current) => ({
          ...current,
          savedToBank: true,
          bankId: response.id,
          isPublic
        }))
        alert('Question saved to bank successfully!')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save to bank')
    }
  }

  const publishTest = async () => {
    if (!token) {
      return
    }
    setSaving(true)
    try {
      if (testForm.autoSaveToBank) {
        const manualNewQuestions = questions.filter(q => !q.savedToBank && q.text.trim() !== '')
        if (manualNewQuestions.length > 0) {
          await apiRequest('/question-bank/bulk', {
            method: 'POST',
            token,
            body: JSON.stringify({
              questions: manualNewQuestions.map(q => ({
                text: q.text,
                subject: testForm.subject,
                chapter: q.chapter,
                concept: q.concept,
                difficulty: q.difficulty,
                explanation: q.explanation,
                imageUrl: q.imageUrl,
                isPublic: q.isPublic ?? false,
                options: q.options.map(opt => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  imageUrl: opt.imageUrl
                }))
              }))
            })
          }).catch(err => {
             console.error('Failed to auto-save to bank:', err)
          })
        }
      }

      await apiRequest('/tests', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...testForm,
          status: 'PUBLISHED',
          startTime: new Date(testForm.startTime).toISOString(),
          endTime: new Date(testForm.endTime).toISOString(),
          questions,
          assignments: [
            ...selectedStudentIds.map((studentId) => ({ studentId })),
            ...selectedBatchIds.map((batchId) => ({ batchId })),
          ],
        }),
      })
      const target = testForm.category === 'HOMEWORK' ? '/teacher/homework' : '/teacher/test'
      navigate(target)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish test')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Teacher Test Wizard" navigation={navigation}>
      {error ? <p className="error-text">{error}</p> : null}

      <Card 
        title={`Step ${step} of 5`} 
        subtitle="Build and publish assessments with assignment targeting"
        icon={<Settings size={20} />}
      >
        <div className="wizard-steps">
          <span className={step === 1 ? 'active' : ''}><Info size={16} /> 1. Basic Details</span>
          <span className={step === 2 ? 'active' : ''}><Settings size={16} /> 2. Question Mode</span>
          <span className={step === 3 ? 'active' : ''}><Edit3 size={16} /> 3. Question Editor</span>
          <span className={step === 4 ? 'active' : ''}><Users size={16} /> 4. Assignment</span>
          <span className={step === 5 ? 'active' : ''}><ClipboardCheck size={16} /> 5. Review</span>
        </div>
        <div className="test-progress">
          <span style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </Card>

      {step === 1 ? (
        <Card title="Basic test details" icon={<Info size={20} />}>
          <div className="form-grid">
            <label>
              Title
              <input
                value={testForm.title}
                onChange={(event) => setTestForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>
            <div className="inline-grid">
              <label>
                Subject
                <select
                  value={testForm.subject}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, subject: event.target.value }))}
                >
                  <option value="CHEMISTRY">Chemistry</option>
                  <option value="MATHEMATICS">Mathematics</option>
                  <option value="PHYSICS">Physics</option>
                </select>
              </label>
              <label>
                Board
                <select
                  value={testForm.boardTarget}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, boardTarget: event.target.value }))}
                >
                  <option value="WEST_BENGAL">West Bengal</option>
                  <option value="ICSE">ICSE</option>
                  <option value="CBSE">CBSE</option>
                </select>
              </label>
            </div>
            <div className="inline-grid">
              <label>
                Category
                <select
                  value={testForm.category}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, category: event.target.value }))}
                >
                  <option value="HOMEWORK">Daily Homework</option>
                  <option value="WEEKLY_TEST">Weekly Test</option>
                  <option value="MONTHLY_TEST">Monthly Test</option>
                  <option value="PRACTICE">Practice Drill</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testForm.isDaily}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, isDaily: event.target.checked }))}
                  style={{ width: 'auto' }}
                />
                Is Daily Homework?
              </label>
            </div>
            <div className="inline-grid">
              <label>
                Class
                <input
                  value={testForm.classLevel}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, classLevel: event.target.value }))}
                />
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  value={testForm.durationMinutes}
                  onChange={(event) =>
                    setTestForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))
                  }
                />
              </label>
            </div>
            <div className="inline-grid">
              <label>
                Start time
                <input
                  type="datetime-local"
                  value={testForm.startTime}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, startTime: event.target.value }))}
                />
              </label>
              <label>
                End time
                <input
                  type="datetime-local"
                  value={testForm.endTime}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, endTime: event.target.value }))}
                />
              </label>
            </div>
            <Button onClick={() => setStep(2)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card title="Choose question mode">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', animation: 'fadeIn 0.4s ease-out' }}>
            <div 
              onClick={() => {
                setTestForm((prev) => ({ ...prev, creationMode: 'MANUAL' }))
                setStep(3)
              }}
              style={{
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border-soft)',
                background: 'var(--surface-soft)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-400)'
                e.currentTarget.style.background = 'var(--surface-main)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-soft)'
                e.currentTarget.style.background = 'var(--surface-soft)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Edit3 size={32} style={{ color: 'var(--color-primary-500)' }} />
              <div>
                <h5 style={{ margin: '0 0 4px', fontWeight: '700' }}>Manual Entry</h5>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>Add questions one by one manually</p>
              </div>
            </div>

            <div 
              onClick={() => setTestForm((prev) => ({ ...prev, creationMode: 'AI' }))}
              style={{
                padding: '24px',
                borderRadius: '16px',
                border: testForm.creationMode === 'AI' ? '2px solid var(--color-primary-500)' : '1px solid var(--color-primary-200)',
                background: testForm.creationMode === 'AI' ? 'var(--color-primary-50)' : 'rgba(59, 130, 246, 0.05)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-500)'
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={(e) => {
                if (testForm.creationMode !== 'AI') {
                  e.currentTarget.style.borderColor = 'var(--color-primary-200)'
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'
                }
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Database size={32} style={{ color: 'var(--color-primary-600)' }} />
              <div>
                <h5 style={{ margin: '0 0 4px', fontWeight: '700' }}>AI Assisted</h5>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>Generate questions using AI</p>
              </div>
            </div>

            <div 
              onClick={() => {
                setBankFilters(prev => ({ ...prev, subject: testForm.subject }))
                setIsBankModalOpen(true)
              }}
              style={{
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border-soft)',
                background: 'var(--surface-soft)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-400)'
                e.currentTarget.style.background = 'var(--surface-main)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-soft)'
                e.currentTarget.style.background = 'var(--surface-soft)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Search size={32} style={{ color: 'var(--color-accent-500)' }} />
              <div>
                <h5 style={{ margin: '0 0 4px', fontWeight: '700' }}>Question Bank</h5>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>Search from your saved questions</p>
              </div>
            </div>
          </div>

          {testForm.creationMode === 'AI' ? (
            <div className="form-grid">
              <label>
                Topic / Chapter
                <input
                  value={aiConfig.topic}
                  onChange={(event) => setAiConfig((prev) => ({ ...prev, topic: event.target.value }))}
                />
              </label>
              <div className="inline-grid">
                <label>
                  Difficulty
                  <select
                    value={aiConfig.difficulty}
                    onChange={(event) => setAiConfig((prev) => ({ ...prev, difficulty: event.target.value }))}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>
                <label>
                  Number of questions
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={aiConfig.numQuestions}
                    onChange={(event) =>
                      setAiConfig((prev) => ({ ...prev, numQuestions: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>
              <Button onClick={generateWithAi}>Generate Questions</Button>
            </div>
          ) : null}

          {testForm.creationMode === 'AI' && aiPreviewQuestions ? (
            <div className="ai-preview-section">
              <h3>AI Generated Preview</h3>
              <div className="stack-gap">
                {aiPreviewQuestions.map((q, idx) => (
                  <div key={q.id} className="preview-item">
                    <p>
                      <strong>Q{idx + 1}:</strong> {q.text}
                    </p>
                    <ul>
                      {q.options.map((o, oIdx) => (
                        <li key={oIdx} className={o.isCorrect ? 'correct-preview' : ''}>
                          {o.text} {o.isCorrect && '(Correct)'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="inline-actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAiPreviewQuestions(null)
                    void generateWithAi()
                  }}
                >
                  Regenerate
                </Button>
                <Button
                  onClick={() => {
                    setQuestions((prev) => (prev.length === 1 && prev[0].text === '' ? aiPreviewQuestions : [...prev, ...aiPreviewQuestions]))
                    setAiPreviewQuestions(null)
                    setStep(3)
                  }}
                >
                  Add to Editor
                </Button>
              </div>
            </div>
          ) : null}

          <div className="inline-actions">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            {testForm.creationMode === 'MANUAL' && (
              <Button onClick={() => setStep(3)}>Continue</Button>
            )}
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card
          title={`Question ${currentQIndex + 1} of ${questions.length}`}
          subtitle={qEditorStep === 'DETAILS' ? "Enter question text and options" : "Provide an explanation for this question"}
          icon={<Edit3 size={20} />}
          actions={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  const newQ = createEmptyQuestion()
                  setQuestions([...questions, newQ])
                  setCurrentQIndex(questions.length)
                  setQEditorStep('DETAILS')
                }}
              >
                + Add New
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="!text-primary-500 !bg-primary-500/10 hover:!bg-primary-500/20"
                onClick={() => saveToBank(currentQIndex, questions[currentQIndex].isPublic || false)}
                disabled={!questions[currentQIndex].text}
              >
                <Database size={14} className="mr-2" /> {questions[currentQIndex].savedToBank ? 'Update in Bank' : 'Save to Bank'}
              </Button>
              {questions.length > 1 && (
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="delete-btn"
                  onClick={() => {
                    const newQs = questions.filter((_, i) => i !== currentQIndex)
                    setQuestions(newQs)
                    setCurrentQIndex(Math.max(0, currentQIndex - 1))
                    setQEditorStep('DETAILS')
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          }
        >
          <div className="stack-gap">
            {/* Sub-step indicator */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div 
                onClick={() => setQEditorStep('DETAILS')}
                style={{ 
                  flex: 1, 
                  height: '4px', 
                  borderRadius: '2px', 
                  background: qEditorStep === 'DETAILS' ? 'var(--color-primary-500)' : 'var(--border-soft)',
                  cursor: 'pointer'
                }} 
              />
              <div 
                onClick={() => setQEditorStep('EXPLANATION')}
                style={{ 
                  flex: 1, 
                  height: '4px', 
                  borderRadius: '2px', 
                  background: qEditorStep === 'EXPLANATION' ? 'var(--color-primary-500)' : 'var(--border-soft)',
                  cursor: 'pointer'
                }} 
              />
            </div>

            {qEditorStep === 'DETAILS' ? (
              <div className="form-grid" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span>Question text</span>
                  {isCheckingSimilar && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Loader2 size={12} className="animate-spin" /> Checking bank...</span>}
                </label>
                <div style={{ marginBottom: '16px' }}>
                  <AutoExpandingTextarea
                    value={questions[currentQIndex].text}
                    placeholder="Enter question here..."
                    onChange={(event) =>
                      updateQuestion(currentQIndex, (current) => ({ ...current, text: event.target.value }))
                    }
                  />
                </div>

                {similarQuestions.length > 0 && (
                  <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', color: 'rgb(202, 138, 4)', fontSize: '0.85rem' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ display: 'block', marginBottom: '4px' }}>Similar question found in your Bank!</strong>
                      <span>A question starting with "{similarQuestions[0].text.substring(0, 40)}..." already exists. </span>
                      <button 
                        onClick={() => {
                          const sq = similarQuestions[0];
                          updateQuestion(currentQIndex, current => ({
                            ...current,
                            text: sq.text,
                            chapter: sq.chapter || '',
                            concept: sq.concept || '',
                            difficulty: sq.difficulty,
                            explanation: sq.explanation || '',
                            imageUrl: sq.imageUrl || '',
                            savedToBank: true,
                            bankId: sq.id,
                            isPublic: sq.isPublic,
                            options: sq.options.map(opt => ({
                              text: opt.text,
                              isCorrect: opt.isCorrect,
                              imageUrl: opt.imageUrl || ''
                            }))
                          }))
                          setSimilarQuestions([]);
                        }}
                        style={{ background: 'none', border: 'none', color: 'rgb(202, 138, 4)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                      >
                        Load it instead?
                      </button>
                    </div>
                  </div>
                )}

                <label>
                  Question Image URL (Optional)
                  <input
                    type="text"
                    value={questions[currentQIndex].imageUrl || ''}
                    placeholder="https://example.com/image.png"
                    onChange={(event) =>
                      updateQuestion(currentQIndex, (current) => ({ ...current, imageUrl: event.target.value }))
                    }
                  />
                </label>
                <div className="inline-grid">
                  <label>
                    Chapter
                    <input
                      value={questions[currentQIndex].chapter}
                      onChange={(event) =>
                        updateQuestion(currentQIndex, (current) => ({ ...current, chapter: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Concept
                    <input
                      value={questions[currentQIndex].concept}
                      onChange={(event) =>
                        updateQuestion(currentQIndex, (current) => ({ ...current, concept: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="stack-gap" style={{ gap: '10px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: '600' }}>
                    Options (Select the correct one)
                  </span>
                  {questions[currentQIndex].options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="radio"
                        name={`correct-${currentQIndex}`}
                        checked={option.isCorrect}
                        onChange={() =>
                          updateQuestion(currentQIndex, (current) => ({
                            ...current,
                            options: current.options.map((entry, idx) =>
                              idx === optionIndex ? { ...entry, isCorrect: true } : { ...entry, isCorrect: false },
                            ),
                          }))
                        }
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <AutoExpandingTextarea
                          value={option.text}
                          placeholder={`Option ${optionIndex + 1}`}
                          onChange={(event) =>
                            updateQuestion(currentQIndex, (current) => ({
                              ...current,
                              options: current.options.map((entry, idx) =>
                                idx === optionIndex ? { ...entry, text: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                        <input
                          value={option.imageUrl || ''}
                          placeholder="Option Image URL (Optional)"
                          style={{ width: '100%', fontSize: '0.75rem', height: '30px' }}
                          onChange={(event) =>
                            updateQuestion(currentQIndex, (current) => ({
                              ...current,
                              options: current.options.map((entry, idx) =>
                                idx === optionIndex ? { ...entry, imageUrl: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                      </div>
                      {questions[currentQIndex].options.length > 2 && (
                        <button 
                          onClick={() => {
                            updateQuestion(currentQIndex, (current) => ({
                              ...current,
                              options: current.options.filter((_, i) => i !== optionIndex)
                            }))
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-soft)', cursor: 'pointer' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  {questions[currentQIndex].options.length < 10 && (
                    <button 
                      onClick={() => {
                        updateQuestion(currentQIndex, (current) => ({
                          ...current,
                          options: [...current.options, { text: '', isCorrect: false }]
                        }))
                      }}
                      style={{ 
                        background: 'transparent', 
                        border: '1px dashed var(--border-strong)', 
                        borderRadius: '10px',
                        padding: '8px',
                        color: 'var(--color-primary-600)',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Plus size={16} /> Add Option
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="form-grid" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <label>
                  Explanation (Optional)
                  <AutoExpandingTextarea
                    value={questions[currentQIndex].explanation}
                    placeholder="Explain why the answer is correct..."
                    onChange={(event) =>
                      updateQuestion(currentQIndex, (current) => ({ ...current, explanation: event.target.value }))
                    }
                  />
                </label>
                <div className="inline-grid">
                  <label>
                    Difficulty
                    <select
                      value={questions[currentQIndex].difficulty}
                      onChange={(event) =>
                        updateQuestion(currentQIndex, (current) => ({
                          ...current,
                          difficulty: event.target.value as QuestionInput['difficulty'],
                        }))
                      }
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </label>
                  <label>
                    Marks
                    <input
                      type="number"
                      value={questions[currentQIndex].marks}
                      onChange={(event) =>
                        updateQuestion(currentQIndex, (current) => ({ ...current, marks: Number(event.target.value) }))
                      }
                    />
                  </label>
                </div>

                <div style={{ marginTop: '16px', padding: '16px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: 'var(--color-primary-700)' }}>Add to Question Bank</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-primary-600)' }}>Save this question to reuse in future tests and homework.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-primary-700)', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={questions[currentQIndex].isPublic || false}
                        onChange={(e) => updateQuestion(currentQIndex, (current) => ({ ...current, isPublic: e.target.checked }))}
                        style={{ width: 'auto', margin: 0 }}
                      /> 
                      Make Global
                    </label>
                    <Button 
                      onClick={() => saveToBank(currentQIndex, questions[currentQIndex].isPublic || false)}
                      disabled={!questions[currentQIndex].text}
                    >
                      <Database size={16} style={{ marginRight: '8px' }} /> {questions[currentQIndex].savedToBank ? 'Update in Bank' : 'Save to Bank'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                variant="secondary" 
                disabled={currentQIndex === 0 && qEditorStep === 'DETAILS'}
                onClick={() => {
                  if (qEditorStep === 'EXPLANATION') {
                    setQEditorStep('DETAILS')
                  } else {
                    setCurrentQIndex(currentQIndex - 1)
                    setQEditorStep('EXPLANATION')
                  }
                }}
              >
                <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back
              </Button>
              <Button 
                variant="secondary"
                disabled={currentQIndex === questions.length - 1 && qEditorStep === 'EXPLANATION'}
                onClick={() => {
                  if (qEditorStep === 'DETAILS') {
                    setQEditorStep('EXPLANATION')
                  } else {
                    setCurrentQIndex(currentQIndex + 1)
                    setQEditorStep('DETAILS')
                  }
                }}
              >
                Next <ArrowRight size={18} style={{ marginLeft: '8px' }} />
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back to Mode
              </Button>
              <Button onClick={() => setStep(4)}>Assign Students</Button>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card title="Assign to students and batches">
          <div className="two-col">
            <div>
              <h4>Students</h4>
              {students.length === 0 ? (
                <div className="empty-state">No students available for assignment.</div>
              ) : (
                <ul className="checkbox-list">
                  {students.map((student) => (
                    <li key={student.id}>
                      <label className="checkbox-inline">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={(event) =>
                            setSelectedStudentIds((prev) =>
                              event.target.checked
                                ? [...prev, student.id]
                                : prev.filter((value) => value !== student.id),
                            )
                          }
                        />
                        {student.username}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4>Batches</h4>
              {batches.length === 0 ? (
                <div className="empty-state">No batches available for assignment.</div>
              ) : (
                <ul className="checkbox-list">
                  {batches.map((batch) => (
                    <li key={batch.id}>
                      <label className="checkbox-inline">
                        <input
                          type="checkbox"
                          checked={selectedBatchIds.includes(batch.id)}
                          onChange={(event) =>
                            setSelectedBatchIds((prev) =>
                              event.target.checked
                                ? [...prev, batch.id]
                                : prev.filter((value) => value !== batch.id),
                            )
                          }
                        />
                        {batch.name}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="inline-actions">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={() => setStep(5)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card title="Review and publish">
          <p>
            <strong>{testForm.title || 'Untitled test'}</strong> - {testForm.subject} / Class{' '}
            {testForm.classLevel}
          </p>
          <p>
            Questions: {questions.length} | Assigned Students: {assignmentPreview.students} | Assigned
            Batches: {assignmentPreview.batches}
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface-soft)', borderRadius: '12px', marginBottom: '16px' }}>
            <input 
              type="checkbox" 
              id="bulkSaveBank"
              checked={testForm.autoSaveToBank}
              onChange={(e) => setTestForm(prev => ({ ...prev, autoSaveToBank: e.target.checked }))} 
              style={{ width: 'auto', margin: 0 }}
            />
            <label htmlFor="bulkSaveBank" style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
              Automatically save all new questions from this test to my Question Bank
            </label>
          </div>

          <div className="inline-actions">
            <Button variant="secondary" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button onClick={publishTest} isLoading={saving}>
              {saving ? 'Publishing...' : 'Publish Test'}
            </Button>
          </div>
          <p>
            <Link to="/teacher/test">Cancel and return to dashboard</Link>
          </p>
        </Card>
      ) : null}
      {/* Question Bank Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-[#12141c] border border-white/10 rounded-3xl p-8 max-w-5xl w-full shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-2xl font-black">Question Bank</h3>
                    <p className="text-muted text-sm mt-1">Select questions to add to your assessment.</p>
                 </div>
                 <button onClick={() => setIsBankModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <XCircle size={24} className="text-muted" />
                 </button>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-6">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search bank questions..." 
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-primary-500"
                      value={bankFilters.search}
                      onChange={(e) => setBankFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                 </div>
                 <select 
                   className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none"
                   value={bankFilters.subject}
                   onChange={(e) => setBankFilters(prev => ({ ...prev, subject: e.target.value }))}
                 >
                    <option value="PHYSICS">Physics</option>
                    <option value="CHEMISTRY">Chemistry</option>
                    <option value="MATHEMATICS">Mathematics</option>
                 </select>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                 {bankLoading ? (
                    <div className="flex justify-center py-20">
                       <Loader2 className="animate-spin text-primary-500" size={40} />
                    </div>
                 ) : bankQuestions.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                       <p className="text-muted">No questions found in the bank for these filters.</p>
                    </div>
                 ) : (
                    bankQuestions.map((q) => {
                       const isSelected = questions.some(existing => existing.text === q.text);
                       return (
                          <div 
                            key={q.id} 
                            onClick={() => {
                               if (isSelected) {
                                  setQuestions(prev => prev.filter(p => p.text !== q.text));
                               } else {
                                  const newQ: QuestionInput = {
                                     id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
                                     text: q.text,
                                     chapter: q.chapter || '',
                                     concept: q.concept || '',
                                     difficulty: q.difficulty,
                                     marks: 1,
                                     source: 'MANUAL',
                                     explanation: q.explanation || '',
                                     imageUrl: q.imageUrl || '',
                                     savedToBank: true,
                                     bankId: q.id,
                                     isPublic: q.isPublic,
                                     options: q.options.map((opt: { text: string; isCorrect: boolean; imageUrl?: string }) => ({
                                        text: opt.text,
                                        isCorrect: opt.isCorrect,
                                        imageUrl: opt.imageUrl || ''
                                     }))
                                  };
                                  setQuestions(prev => (prev.length === 1 && prev[0].text === '' ? [newQ] : [...prev, newQ]));
                               }
                            }}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
                               isSelected ? 'bg-primary-500/10 border-primary-500 shadow-[0_0_20px_rgba(var(--color-primary-500-rgb),0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                          >
                             <div className="flex justify-between gap-4">
                                <div className="flex-1">
                                   <div className="flex items-center gap-2 mb-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded text-muted">
                                         {q.subject}
                                      </span>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">
                                         {q.difficulty}
                                      </span>
                                   </div>
                                   <p className="font-semibold leading-relaxed">{q.text}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                   isSelected ? 'bg-primary-500 border-primary-500' : 'border-white/10 group-hover:border-white/30'
                                }`}>
                                   {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                </div>
                             </div>
                          </div>
                       );
                    })
                 )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                 <Button size="lg" className="rounded-2xl px-12" onClick={() => {
                    setIsBankModalOpen(false);
                    if (questions.some(q => q.text !== '')) {
                       setStep(3);
                    }
                 }}>
                    Continue with {questions.filter(q => q.text !== '').length} Questions
                 </Button>
              </div>
           </div>
        </div>
      )}

    </DashboardLayout>
  )
}
