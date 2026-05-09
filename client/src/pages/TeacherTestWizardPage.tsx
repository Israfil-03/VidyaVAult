import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Trash2, Plus } from 'lucide-react'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'
import type { QuestionInput } from '../types'
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
  id: crypto.randomUUID(),
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
    category: 'TEST',
    isDaily: false,
    boardTarget: 'WEST_BENGAL',
    classLevel: '10',
    startTime: '',
    endTime: '',
    durationMinutes: 60,
    creationMode: 'MANUAL',
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

  // Sub-wizard state for Step 3
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [qEditorStep, setQEditorStep] = useState<'DETAILS' | 'EXPLANATION'>('DETAILS')

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
          id: crypto.randomUUID(),
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
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI questions')
    }
  }

  const publishTest = async () => {
    if (!token) {
      return
    }
    setSaving(true)
    try {
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
      navigate('/teacher/test')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish test')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Teacher Test Wizard" navigation={navigation}>
      {error ? <p className="error-text">{error}</p> : null}

      <Card title={`Step ${step} of 5`} subtitle="Build and publish assessments with assignment targeting">
        <div className="wizard-steps">
          <span className={step === 1 ? 'active' : ''}>1. Basic Details</span>
          <span className={step === 2 ? 'active' : ''}>2. Question Mode</span>
          <span className={step === 3 ? 'active' : ''}>3. Question Editor</span>
          <span className={step === 4 ? 'active' : ''}>4. Assignment</span>
          <span className={step === 5 ? 'active' : ''}>5. Review</span>
        </div>
        <div className="test-progress">
          <span style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </Card>

      {step === 1 ? (
        <Card title="Basic test details">
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
                  <option value="BIOLOGY">Biology</option>
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
                  <option value="TEST">Class Test</option>
                  <option value="UNIT_TEST">Unit Test</option>
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
          <div className="inline-actions">
            <Button
              onClick={() => {
                setTestForm((prev) => ({ ...prev, creationMode: 'MANUAL' }))
                setStep(3)
              }}
            >
              Manual Entry
            </Button>
            <Button
              variant="secondary"
              onClick={() => setTestForm((prev) => ({ ...prev, creationMode: 'AI' }))}
            >
              AI Assisted
            </Button>
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
                <label>
                  Question text
                  <textarea
                    value={questions[currentQIndex].text}
                    placeholder="Enter question here..."
                    style={{ height: '100px' }}
                    onChange={(event) =>
                      updateQuestion(currentQIndex, (current) => ({ ...current, text: event.target.value }))
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
                      <input
                        value={option.text}
                        placeholder={`Option ${optionIndex + 1}`}
                        style={{ flex: 1 }}
                        onChange={(event) =>
                          updateQuestion(currentQIndex, (current) => ({
                            ...current,
                            options: current.options.map((entry, idx) =>
                              idx === optionIndex ? { ...entry, text: event.target.value } : entry,
                            ),
                          }))
                        }
                      />
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
                  <textarea
                    value={questions[currentQIndex].explanation}
                    placeholder="Explain why the answer is correct..."
                    style={{ height: '150px' }}
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
    </DashboardLayout>
  )
}
