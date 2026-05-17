import { Plus, Check, AlertCircle, ArrowRight, ArrowLeft, Trash2, Sparkles, Wand2, Edit3, Database, Search, XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'
import { AutoExpandingTextarea } from '../components/AutoExpandingTextarea'
import type { QuestionBankEntry } from '../types'
import './NewHomeworkCard.css' // Reusing stepper, columns and scrollbar styling

interface BatchOption {
  id: string
  name: string
  classLevel: string
}

interface NewPracticeDrillCardProps {
  batches: BatchOption[]
  onCreated: () => void
}

type Step = 'INFO' | 'CHOICE' | 'AI_CONFIG' | 'QUESTION' | 'EXPLANATION' | 'REVIEW'

interface Question {
  id: string
  text: string
  options: { text: string; isCorrect: boolean }[]
  explanation: string
}

export const NewPracticeDrillCard = ({ batches, onCreated }: NewPracticeDrillCardProps) => {
  const { token } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [autoSaveToBank, setAutoSaveToBank] = useState(false)
  
  // Question Bank Integration
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [bankQuestions, setBankQuestions] = useState<QuestionBankEntry[]>([])
  const [bankLoading, setBankLoading] = useState(false)
  const [bankSearch, setBankSearch] = useState('')

  const [step, setStep] = useState<Step>('INFO')
  
  const [info, setInfo] = useState({
    title: '',
    subject: 'CHEMISTRY',
    classLevel: '10',
    batchId: '',
  })

  const [aiConfig, setAiConfig] = useState({
    topic: '',
    difficulty: 'MEDIUM',
    numQuestions: 5,
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
    })
    setAiConfig({
      topic: '',
      difficulty: 'MEDIUM',
      numQuestions: 5,
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
    setAutoSaveToBank(false)
    setError(null)
  }

  const handleNextFromInfo = () => {
    if (!info.title || !info.batchId) {
      setError('Please fill in all basic details.')
      return
    }
    setError(null)
    setStep('CHOICE')
  }

  const handleAiGenerate = async () => {
    if (!aiConfig.topic || !token) {
      setError('Please enter a topic for AI generation.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await apiRequest<Array<{
        text: string
        options: Array<{ text: string; isCorrect: boolean }>
        explanation: string
      }>>('/ai/generate-questions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          subject: info.subject,
          board: 'WEST_BENGAL',
          classLevel: info.classLevel,
          topic: aiConfig.topic,
          difficulty: aiConfig.difficulty,
          numQuestions: aiConfig.numQuestions
        })
      })
      
      const generated = response.map(q => ({
        id: crypto.randomUUID(),
        text: q.text,
        options: q.options,
        explanation: q.explanation
      }))
      
      setQuestions(generated)
      setStep('REVIEW')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed')
    } finally {
      setLoading(false)
    }
  }

  const loadBankQuestions = async () => {
    if (!token) return
    setBankLoading(true)
    try {
      const query = new URLSearchParams()
      query.append('subject', info.subject)
      if (bankSearch) query.append('search', bankSearch)
      const response = await apiRequest<QuestionBankEntry[]>(`/question-bank?${query.toString()}`, { token })
      setBankQuestions(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question bank')
    } finally {
      setBankLoading(false)
    }
  }

  const handleImportFromBank = (q: QuestionBankEntry) => {
    setCurrentQuestion({
      id: crypto.randomUUID(),
      text: q.text,
      options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
      explanation: q.explanation || ''
    })
    setIsBankModalOpen(false)
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

  const handlePublish = async (finalQuestionsOverride?: Question[]) => {
    if (!token) return

    const finalQuestions = finalQuestionsOverride || [...questions, currentQuestion]
    
    if (finalQuestions.length === 0) {
      setError('Add at least one question before publishing.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const now = new Date()
      const hundredYearsLater = new Date()
      hundredYearsLater.setFullYear(now.getFullYear() + 100)

      if (autoSaveToBank) {
        await apiRequest('/question-bank/bulk', {
          method: 'POST',
          token,
          body: JSON.stringify({
            questions: finalQuestions.map(q => ({
              text: q.text,
              subject: info.subject,
              chapter: '',
              concept: '',
              difficulty: 'MEDIUM',
              explanation: q.explanation,
              isPublic: false,
              options: q.options.map(opt => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                imageUrl: ''
              }))
            }))
          })
        }).catch(err => {
           console.error('Failed to auto-save to bank:', err)
        })
      }

      await apiRequest('/tests', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: info.title,
          subject: info.subject,
          classLevel: info.classLevel,
          startTime: now.toISOString(),
          endTime: hundredYearsLater.toISOString(),
          durationMinutes: 0, // Untimed
          status: 'PUBLISHED',
          category: 'PRACTICE',
          isDaily: false,
          creationMode: finalQuestionsOverride ? 'AI' : 'MANUAL',
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
      setError(err instanceof Error ? err.message : 'Failed to publish practice drill')
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
      if (!newOptions.some(o => o.isCorrect)) {
        newOptions[0].isCorrect = true
      }
      return { ...prev, options: newOptions }
    })
  }

  const deleteGeneratedQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  if (!isCreating) {
    return (
      <Card title="Quick Practice Card" subtitle="Create active learning modules in seconds" variant="glass">
        <div 
          onClick={() => setIsCreating(true)} 
          className="nhc-create-btn"
          style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%)',
            borderColor: 'rgba(147, 51, 234, 0.2)'
          }}
        >
          <div 
            className="nhc-create-btn-icon"
            style={{
              background: 'rgba(147, 51, 234, 0.1)',
              color: 'rgb(168, 85, 247)'
            }}
          >
            <Plus size={32} />
          </div>
          <div className="text-center">
            <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>Create Practice Drill</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-soft)' }}>Click to open the inline MCQ & AI builder</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      title={step === 'INFO' ? "Drill Details" : step === 'CHOICE' ? "Builder Mode" : step === 'AI_CONFIG' ? "AI Configuration" : step === 'REVIEW' ? "Review Generated Drill" : `Question ${questions.length + 1}`} 
      subtitle={
        step === 'INFO' ? "Basic setup for your practice module" : 
        step === 'CHOICE' ? "Choose how you want to build questions" :
        step === 'AI_CONFIG' ? "Tell the AI what topics to cover" :
        step === 'REVIEW' ? "Review and edit the AI-generated drill" :
        step === 'QUESTION' ? "Enter question content and options" : 
        "Add an explanation (optional)"
      }
      variant="glass"
      actions={
        <Button variant="secondary" size="sm" onClick={() => { setIsCreating(false); resetAll(); }}>Cancel</Button>
      }
    >
      <div className="stack-gap" style={{ gap: '24px' }}>
        {/* Stepper */}
        <div className="nhc-stepper-container">
          <div className="nhc-stepper-line" />
          {(['INFO', 'CHOICE', 'QUESTION', 'REVIEW'] as const).map((s, idx) => {
            const isActive = 
              (s === 'INFO' && step === 'INFO') ||
              (s === 'CHOICE' && step === 'CHOICE') ||
              (s === 'QUESTION' && (step === 'QUESTION' || step === 'EXPLANATION' || step === 'AI_CONFIG')) ||
              (s === 'REVIEW' && step === 'REVIEW')
            
            const isCompleted = 
              (s === 'INFO' && step !== 'INFO') ||
              (s === 'CHOICE' && !['INFO', 'CHOICE'].includes(step)) ||
              (s === 'QUESTION' && step === 'REVIEW')

            const labels = { INFO: 'Details', CHOICE: 'Mode', QUESTION: 'Build', REVIEW: 'Finish' }

            return (
              <div key={s} className="nhc-stepper-item">
                <div 
                  className="nhc-stepper-circle" 
                  style={{ 
                    background: isActive ? 'rgb(168, 85, 247)' : isCompleted ? 'var(--success)' : 'var(--surface-main)', 
                    border: `2px solid ${isActive || isCompleted ? 'transparent' : 'var(--border-soft)'}`, 
                    color: isActive || isCompleted ? 'white' : 'var(--text-soft)' 
                  }}
                >
                  {isCompleted ? <Check size={14} /> : idx + 1}
                </div>
                <span className="nhc-stepper-label" style={{ fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--text-main)' : 'var(--text-soft)' }}>
                  {labels[s]}
                </span>
              </div>
            )
          })}
        </div>

        {/* Form area */}
        <div className="nhc-scrollable custom-scrollbar">
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
              marginBottom: '16px',
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
              marginBottom: '16px',
              alignItems: 'center'
            }}>
              <Check size={18} />
              Practice drill published successfully!
            </div>
          )}

          {step === 'INFO' && (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr', animation: 'fadeIn 0.4s ease-out' }}>
              <label>
                Drill Title
                <input 
                  placeholder="e.g. Inorganic Chemistry Practice Set 1"
                  value={info.title}
                  onChange={(e) => setInfo(f => ({ ...f, title: e.target.value }))}
                />
              </label>

              <div className="nhc-two-col">
                <label>
                  Subject
                  <select 
                    value={info.subject}
                    onChange={(e) => setInfo(f => ({ ...f, subject: e.target.value }))}
                  >
                    <option value="CHEMISTRY">Chemistry</option>
                    <option value="MATHEMATICS">Mathematics</option>
                    <option value="PHYSICS">Physics</option>
                  </select>
                </label>
                <label>
                  Batch Assignment
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

              <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 mt-2">
                <p className="text-xs text-primary-soft leading-relaxed m-0 flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400 shrink-0" />
                  <strong>Indefinite, Untimed Practice:</strong> Drills are completely stress-free. Students can start, take, submit, and reattempt them infinitely at any time. No time limits or window caps are enforced.
                </p>
              </div>

              <Button onClick={handleNextFromInfo} style={{ marginTop: '12px' }}>
                Next <ArrowRight size={18} style={{ marginLeft: '8px' }} />
              </Button>
            </div>
          )}

          {step === 'CHOICE' && (
            <div className="nhc-two-col" style={{ gap: '16px', animation: 'fadeIn 0.4s ease-out' }}>
              <div 
                onClick={() => setStep('QUESTION')}
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
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(168, 85, 247)'
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
                <Edit3 size={32} style={{ color: 'rgb(168, 85, 247)' }} />
                <div>
                  <h5 style={{ margin: '0 0 4px', fontWeight: '700' }}>Manual Builder</h5>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>Create each question manually</p>
                </div>
              </div>

              <div 
                onClick={() => setStep('AI_CONFIG')}
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  background: 'rgba(168, 85, 247, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(168, 85, 247)'
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Sparkles size={32} style={{ color: 'rgb(168, 85, 247)' }} />
                <div>
                  <h5 style={{ margin: '0 0 4px', fontWeight: '700' }}>AI Generator</h5>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>Let AI draft questions instantly</p>
                </div>
              </div>

              <Button variant="secondary" onClick={() => setStep('INFO')} style={{ gridColumn: 'span 2' }}>
                <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back
              </Button>
            </div>
          )}

          {step === 'AI_CONFIG' && (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr', animation: 'fadeIn 0.4s ease-out' }}>
              <label>
                Topic or Chapter
                <input 
                  placeholder="e.g. Periodic Table Trends, Integration, Dynamics..."
                  value={aiConfig.topic}
                  onChange={(e) => setAiConfig(f => ({ ...f, topic: e.target.value }))}
                  required
                />
              </label>

              <div className="nhc-two-col">
                <label>
                  Difficulty
                  <select 
                    value={aiConfig.difficulty}
                    onChange={(e) => setAiConfig(f => ({ ...f, difficulty: e.target.value }))}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>
                <label>
                  Number of Questions
                  <input 
                    type="number"
                    min="1"
                    max="20"
                    value={aiConfig.numQuestions}
                    onChange={(e) => setAiConfig(f => ({ ...f, numQuestions: parseInt(e.target.value) || 0 }))}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <Button variant="secondary" onClick={() => setStep('CHOICE')} style={{ flex: 1 }}>
                  <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back
                </Button>
                <Button onClick={handleAiGenerate} isLoading={loading} style={{ flex: 2, background: 'rgb(168, 85, 247)' }}>
                  {loading ? 'Generating...' : 'Generate Questions'} <Wand2 size={18} style={{ marginLeft: '8px' }} />
                </Button>
              </div>
            </div>
          )}

          {step === 'REVIEW' && (
            <div className="stack-gap" style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }} className="stack-gap">
                {questions.map((q, idx) => (
                  <div key={q.id} style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-soft)',
                    background: 'var(--surface-soft)',
                    position: 'relative'
                  }}>
                    <button 
                      onClick={() => deleteGeneratedQuestion(q.id)}
                      style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <h6 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>Q{idx + 1}: {q.text}</h6>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                      {q.options.map((o, i) => (
                        <li key={i} style={{ color: o.isCorrect ? 'rgb(168, 85, 247)' : 'inherit', fontWeight: o.isCorrect ? '700' : 'normal' }}>
                          {o.text} {o.isCorrect && '(Correct)'}
                        </li>
                      ))}
                    </ul>
                    {q.explanation && (
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        Note: {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--surface-soft)', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
                <input 
                  type="checkbox" 
                  id="autoSaveBankRev"
                  checked={autoSaveToBank}
                  onChange={(e) => setAutoSaveToBank(e.target.checked)} 
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="autoSaveBankRev" style={{ margin: 0, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                  Save all {questions.length} questions to my Question Bank
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <Button variant="secondary" onClick={() => setStep('AI_CONFIG')} style={{ flex: 1 }}>
                  Regenerate
                </Button>
                <Button onClick={() => handlePublish(questions)} isLoading={loading} style={{ flex: 2, background: 'rgb(168, 85, 247)' }}>
                  {loading ? 'Publishing...' : `Publish ${questions.length} Questions`}
                </Button>
              </div>
            </div>
          )}

          {step === 'QUESTION' && (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr', animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: '600' }}>Question Content</span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => {
                     void loadBankQuestions()
                     setIsBankModalOpen(true)
                  }}
                  className="!bg-purple-500/10 !text-purple-400 !border-purple-500/20 hover:!bg-purple-500/20"
                >
                  <Database size={14} className="mr-2" /> Import from Bank
                </Button>
              </div>
              <label>
                Question Text
                <AutoExpandingTextarea 
                  placeholder="Type your question here..."
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
                    <AutoExpandingTextarea 
                      placeholder={`Option ${idx + 1}`}
                      value={opt.text}
                      style={{ flex: 1 }}
                      onChange={(e) => {
                        const newOpts = [...currentQuestion.options]
                        newOpts[idx].text = e.target.value
                        setCurrentQuestion(q => ({ ...q, options: newOpts }))
                      }}
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
                      color: 'rgb(168, 85, 247)',
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
                <Button variant="secondary" onClick={() => setStep('CHOICE')} style={{ flex: 1 }}>
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
                  This will be shown to students after they complete the drill to aid concept clarity.
                </p>
                <AutoExpandingTextarea 
                  placeholder="Explain why the correct answer is right..."
                  value={currentQuestion.explanation}
                  onChange={(e) => setCurrentQuestion(q => ({ ...q, explanation: e.target.value }))}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--surface-soft)', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
                <input 
                  type="checkbox" 
                  id="autoSaveBankExp"
                  checked={autoSaveToBank}
                  onChange={(e) => setAutoSaveToBank(e.target.checked)} 
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="autoSaveBankExp" style={{ margin: 0, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                  Save question(s) to my Question Bank
                </label>
              </div>

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
                  onClick={() => handlePublish()} 
                  isLoading={loading}
                  style={{ width: '100%', padding: '14px', background: 'rgb(168, 85, 247)' }}
                >
                  {loading ? 'Publishing...' : `Publish Practice Drill (${questions.length + 1} Question${questions.length > 0 ? 's' : ''})`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Question Bank Modal Overlay */}
      {isBankModalOpen && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 1000, 
          background: 'rgba(0,0,0,0.85)', 
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ 
            background: '#12141c', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '24px', 
            width: '100%', 
            maxWidth: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            animation: 'modalFadeIn 0.3s ease-out'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Import from Bank</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-soft)' }}>Search and select questions for {info.subject}</p>
              </div>
              <button onClick={() => setIsBankModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-soft)', cursor: 'pointer' }}>
                <XCircle size={24} />
              </button>
            </div>

            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input 
                    type="text" 
                    placeholder="Search questions..." 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 10px 10px 38px', fontSize: '0.9rem', color: 'white' }}
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void loadBankQuestions()}
                  />
                </div>
                <Button size="sm" onClick={() => void loadBankQuestions()} isLoading={bankLoading}>Search</Button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="custom-scrollbar">
              {bankLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <Loader2 size={32} className="animate-spin text-primary-500" />
                </div>
              ) : bankQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>No questions found in bank. Hit search to load available questions.</div>
              ) : (
                <div className="stack-gap" style={{ gap: '12px' }}>
                  {bankQuestions.map(q => (
                    <div 
                      key={q.id} 
                      onClick={() => handleImportFromBank(q)}
                      style={{ 
                        padding: '16px', 
                        borderRadius: '16px', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        e.currentTarget.style.borderColor = 'rgb(168, 85, 247)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', color: 'var(--text-soft)' }}>{q.difficulty}</span>
                        {q.chapter && <span style={{ fontSize: '10px', color: 'rgb(168, 85, 247)', fontWeight: 700 }}>{q.chapter}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5, color: 'white' }}>{q.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
