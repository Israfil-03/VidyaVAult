import { Plus, Check, AlertCircle, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'

interface BatchOption {
  id: string
  name: string
  classLevel: string
}

interface NewHomeworkCardProps {
  batches: BatchOption[]
  onCreated: () => void
}

type Step = 'INFO' | 'QUESTION' | 'EXPLANATION'

interface Question {
  id: string
  text: string
  options: { text: string; isCorrect: boolean }[]
  explanation: string
}

export const NewHomeworkCard = ({ batches, onCreated }: NewHomeworkCardProps) => {
  const { token } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [step, setStep] = useState<Step>('INFO')
  
  const [info, setInfo] = useState({
    title: '',
    subject: 'CHEMISTRY',
    classLevel: '10',
    batchId: '',
    dueDate: '',
  })

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: crypto.randomUUID(),
    text: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
    explanation: '',
  })

  const resetAll = () => {
    setStep('INFO')
    setInfo({
      title: '',
      subject: 'CHEMISTRY',
      classLevel: '10',
      batchId: '',
      dueDate: '',
    })
    setQuestions([])
    setCurrentQuestion({
      id: crypto.randomUUID(),
      text: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
      explanation: '',
    })
    setError(null)
  }

  const handleNextFromInfo = () => {
    if (!info.title || !info.batchId || !info.dueDate) {
      setError('Please fill in all basic details.')
      return
    }
    setError(null)
    setStep('QUESTION')
  }

  const handleNextFromQuestion = () => {
    if (!currentQuestion.text) {
      setError('Please enter the question text.')
      return
    }
    if (currentQuestion.options.some(o => !o.text)) {
      setError('All options must have text.')
      return
    }
    if (!currentQuestion.options.some(o => o.isCorrect)) {
      setError('Please select a correct answer.')
      return
    }
    setError(null)
    setStep('EXPLANATION')
  }

  const handleAddMoreQuestions = () => {
    setQuestions(prev => [...prev, currentQuestion])
    setCurrentQuestion({
      id: crypto.randomUUID(),
      text: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
      explanation: '',
    })
    setStep('QUESTION')
  }

  const handlePublish = async () => {
    if (!token) return

    const finalQuestions = [...questions, currentQuestion]
    
    setLoading(true)
    setError(null)

    try {
      const startTime = new Date()
      const endTime = new Date(info.dueDate)

      if (endTime <= startTime) {
        throw new Error('Due date must be in the future.')
      }

      await apiRequest('/tests', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: info.title,
          subject: info.subject,
          classLevel: info.classLevel,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMinutes: 60,
          status: 'PUBLISHED',
          creationMode: 'MANUAL',
          questions: finalQuestions.map(q => ({
            text: q.text,
            difficulty: 'MEDIUM',
            marks: 1,
            options: q.options,
            explanation: q.explanation
          })),
          assignments: [{ batchId: info.batchId }],
        }),
      })

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setIsCreating(false)
        resetAll()
        onCreated()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish homework')
    } finally {
      setLoading(false)
    }
  }

  const addOption = () => {
    if (currentQuestion.options.length >= 10) return
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }))
  }

  const removeOption = (index: number) => {
    if (currentQuestion.options.length <= 2) return
    setCurrentQuestion(prev => {
      const newOptions = prev.options.filter((_, i) => i !== index)
      // Ensure at least one is correct if we removed the correct one
      if (!newOptions.some(o => o.isCorrect)) {
        newOptions[0].isCorrect = true
      }
      return { ...prev, options: newOptions }
    })
  }

  if (!isCreating) {
    return (
      <Card title="Quick Homework" subtitle="Create assignments in seconds" variant="glass">
        <div 
          onClick={() => setIsCreating(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)',
            borderRadius: '16px',
            padding: '32px 24px',
            border: '2px dashed rgba(59, 130, 246, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--color-primary-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary-600)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
          }}>
            <Plus size={32} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>Create New Homework</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-soft)' }}>Click to open the quick MCQ builder</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      title={step === 'INFO' ? "Homework Details" : `Question ${questions.length + 1}`} 
      subtitle={step === 'INFO' ? "Basic setup for your assignment" : step === 'QUESTION' ? "Enter question and options" : "Add an explanation (optional)"}
      variant="glass"
      actions={
        <Button variant="secondary" size="sm" onClick={() => { setIsCreating(false); resetAll(); }}>Cancel</Button>
      }
    >
      <div className="stack-gap" style={{ gap: '20px' }}>
        {/* Progress Dots */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '4px' }}>
          {(['INFO', 'QUESTION', 'EXPLANATION'] as Step[]).map(s => (
            <div key={s} style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: step === s ? 'var(--color-primary-500)' : 'var(--border-soft)',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>

        {error && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '10px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            gap: '10px',
            color: '#ef4444',
            fontSize: '0.9rem',
            animation: 'slideInUp 0.3s ease-out'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '10px', 
            background: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid rgba(34, 197, 94, 0.2)',
            display: 'flex',
            gap: '10px',
            color: '#22c55e',
            fontSize: '0.9rem',
            alignItems: 'center'
          }}>
            <Check size={18} />
            Homework published successfully!
          </div>
        )}

        {step === 'INFO' && (
          <div className="form-grid" style={{ gridTemplateColumns: '1fr', animation: 'fadeIn 0.4s ease-out' }}>
            <label>
              Assignment Title
              <input 
                placeholder="e.g. Chemical Bonding Worksheet"
                value={info.title}
                onChange={(e) => setInfo(f => ({ ...f, title: e.target.value }))}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Subject
                <select 
                  value={info.subject}
                  onChange={(e) => setInfo(f => ({ ...f, subject: e.target.value }))}
                >
                  <option value="CHEMISTRY">Chemistry</option>
                  <option value="BIOLOGY">Biology</option>
                  <option value="MATHEMATICS">Mathematics</option>
                  <option value="PHYSICS">Physics</option>
                </select>
              </label>
              <label>
                Batch
                <select 
                  value={info.batchId}
                  onChange={(e) => {
                    const b = batches.find(x => x.id === e.target.value)
                    setInfo(f => ({ ...f, batchId: e.target.value, classLevel: b?.classLevel || '10' }))
                  }}
                >
                  <option value="">Select Batch</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} (Class {b.classLevel})</option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Due Date & Time
              <input 
                type="datetime-local"
                value={info.dueDate}
                onChange={(e) => setInfo(f => ({ ...f, dueDate: e.target.value }))}
              />
            </label>

            <Button onClick={handleNextFromInfo} style={{ marginTop: '12px' }}>
              Next <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </Button>
          </div>
        )}

        {step === 'QUESTION' && (
          <div className="form-grid" style={{ gridTemplateColumns: '1fr', animation: 'fadeIn 0.4s ease-out' }}>
            <label>
              Question Text
              <textarea 
                placeholder="Type your question here..."
                style={{ height: '100px' }}
                value={currentQuestion.text}
                onChange={(e) => setCurrentQuestion(q => ({ ...q, text: e.target.value }))}
              />
            </label>

            <div className="stack-gap" style={{ gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: '600' }}>
                Options (Select the correct one)
              </span>
              {currentQuestion.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="radio" 
                    name="correct-opt"
                    checked={opt.isCorrect}
                    onChange={() => {
                      setCurrentQuestion(q => ({
                        ...q,
                        options: q.options.map((o, i) => ({ ...o, isCorrect: i === idx }))
                      }))
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <input 
                    placeholder={`Option ${idx + 1}`}
                    value={opt.text}
                    onChange={(e) => {
                      const newOpts = [...currentQuestion.options]
                      newOpts[idx].text = e.target.value
                      setCurrentQuestion(q => ({ ...q, options: newOpts }))
                    }}
                    style={{ flex: 1 }}
                  />
                  {currentQuestion.options.length > 2 && (
                    <button 
                      onClick={() => removeOption(idx)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--text-soft)', 
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              
              {currentQuestion.options.length < 10 && (
                <button 
                  onClick={addOption}
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

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button variant="secondary" onClick={() => setStep('INFO')} style={{ flex: 1 }}>
                <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back
              </Button>
              <Button onClick={handleNextFromQuestion} style={{ flex: 1 }}>
                Next <ArrowRight size={18} style={{ marginLeft: '8px' }} />
              </Button>
            </div>
          </div>
        )}

        {step === 'EXPLANATION' && (
          <div className="form-grid" style={{ gridTemplateColumns: '1fr', animation: 'fadeIn 0.4s ease-out' }}>
            <label>
              Explanation (Optional)
              <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                This will be shown to students after they answer or when the test ends.
              </p>
              <textarea 
                placeholder="Explain why the answer is correct..."
                style={{ height: '120px' }}
                value={currentQuestion.explanation}
                onChange={(e) => setCurrentQuestion(q => ({ ...q, explanation: e.target.value }))}
              />
            </label>

            <div className="stack-gap" style={{ gap: '12px', marginTop: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="secondary" onClick={() => setStep('QUESTION')} style={{ flex: 1 }}>
                  <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back
                </Button>
                <Button variant="secondary" onClick={handleAddMoreQuestions} style={{ flex: 1 }}>
                  <Plus size={18} style={{ marginRight: '8px' }} /> Add More
                </Button>
              </div>
              
              <Button 
                onClick={handlePublish} 
                isLoading={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '14px' }}
              >
                {loading ? 'Publishing...' : `Publish Homework (${questions.length + 1} Question${questions.length > 0 ? 's' : ''})`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
