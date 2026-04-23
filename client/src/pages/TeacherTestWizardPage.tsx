import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'
import type { QuestionInput } from '../types'

interface BatchOption {
  id: string
  name: string
}

interface StudentOption {
  id: string
  username: string
}

const navigation = [
  { label: 'Dashboard', to: '/teacher' },
  { label: 'Create Test Wizard', to: '/teacher/tests/new' },
]

const createEmptyQuestion = (): QuestionInput => ({
  text: '',
  chapter: '',
  concept: '',
  difficulty: 'MEDIUM',
  marks: 1,
  source: 'MANUAL',
  explanation: '',
  options: [
    { text: '', isCorrect: false },
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
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])

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

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()])
  }

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

      setQuestions(
        generated.map((item) => ({
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
      setStep(3)
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
      navigate('/teacher')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish test')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Teacher Test Wizard" navigation={navigation}>
      {error ? <p className="error-text">{error}</p> : null}

      <Card title={`Step ${step} of 5`}>
        <div className="wizard-steps">
          <span className={step === 1 ? 'active' : ''}>1. Basic Details</span>
          <span className={step === 2 ? 'active' : ''}>2. Question Mode</span>
          <span className={step === 3 ? 'active' : ''}>3. Question Editor</span>
          <span className={step === 4 ? 'active' : ''}>4. Assignment</span>
          <span className={step === 5 ? 'active' : ''}>5. Review</span>
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

          <div className="inline-actions">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card
          title="Question editor"
          actions={
            <Button variant="secondary" onClick={addQuestion}>
              + Add Question
            </Button>
          }
        >
          <div className="stack-gap">
            {questions.map((question, index) => (
              <div key={`${question.text}-${index}`} className="question-card">
                <h4>Question {index + 1}</h4>
                <label>
                  Question text
                  <textarea
                    value={question.text}
                    onChange={(event) =>
                      updateQuestion(index, (current) => ({ ...current, text: event.target.value }))
                    }
                  />
                </label>
                <div className="inline-grid">
                  <label>
                    Chapter
                    <input
                      value={question.chapter}
                      onChange={(event) =>
                        updateQuestion(index, (current) => ({ ...current, chapter: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Concept
                    <input
                      value={question.concept}
                      onChange={(event) =>
                        updateQuestion(index, (current) => ({ ...current, concept: event.target.value }))
                      }
                    />
                  </label>
                </div>
                {question.options.map((option, optionIndex) => (
                  <label key={`${index}-${optionIndex}`}>
                    Option {optionIndex + 1}
                    <div className="inline-grid">
                      <input
                        value={option.text}
                        onChange={(event) =>
                          updateQuestion(index, (current) => ({
                            ...current,
                            options: current.options.map((entry, idx) =>
                              idx === optionIndex ? { ...entry, text: event.target.value } : entry,
                            ),
                          }))
                        }
                      />
                      <label className="checkbox-inline">
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(event) =>
                            updateQuestion(index, (current) => ({
                              ...current,
                              options: current.options.map((entry, idx) =>
                                idx === optionIndex ? { ...entry, isCorrect: event.target.checked } : entry,
                              ),
                            }))
                          }
                        />
                        Correct
                      </label>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="inline-actions">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => setStep(4)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card title="Assign to students and batches">
          <div className="two-col">
            <div>
              <h4>Students</h4>
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
            </div>
            <div>
              <h4>Batches</h4>
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
            <Button onClick={publishTest} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish Test'}
            </Button>
          </div>
          <p>
            <Link to="/teacher">Cancel and return to dashboard</Link>
          </p>
        </Card>
      ) : null}
    </DashboardLayout>
  )
}
