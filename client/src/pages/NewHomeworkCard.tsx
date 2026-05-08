import { Plus, Check, AlertCircle, Calendar, BookOpen, User } from 'lucide-react'
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

export const NewHomeworkCard = ({ batches, onCreated }: NewHomeworkCardProps) => {
  const { token } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    title: '',
    subject: 'CHEMISTRY',
    classLevel: '10',
    batchId: '',
    dueDate: '',
    questionText: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  })

  const resetForm = () => {
    setForm({
      title: '',
      subject: 'CHEMISTRY',
      classLevel: '10',
      batchId: '',
      dueDate: '',
      questionText: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    })
    setError(null)
  }

  const handlePublish = async () => {
    if (!token) return

    if (!form.title || !form.batchId || !form.questionText || !form.dueDate) {
      setError('Please fill in all required fields.')
      return
    }

    if (form.options.some((o) => !o.text)) {
      setError('All 4 options must have text.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const startTime = new Date()
      const endTime = new Date(form.dueDate)

      if (endTime <= startTime) {
        throw new Error('Due date must be in the future.')
      }

      await apiRequest('/tests', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: form.title,
          subject: form.subject,
          classLevel: form.classLevel,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMinutes: 60, // Default duration
          status: 'PUBLISHED',
          creationMode: 'MANUAL',
          questions: [
            {
              text: form.questionText,
              difficulty: 'MEDIUM',
              marks: 1,
              options: form.options,
            },
          ],
          assignments: [{ batchId: form.batchId }],
        }),
      })

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setIsCreating(false)
        resetForm()
        onCreated()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish homework')
    } finally {
      setLoading(false)
    }
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
      title="Create Homework" 
      subtitle="Simple MCQ Publisher" 
      variant="glass"
      actions={
        <Button variant="secondary" size="sm" onClick={() => { setIsCreating(false); resetForm(); }}>Cancel</Button>
      }
    >
      <div className="stack-gap" style={{ gap: '20px' }}>
        {error && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '10px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            gap: '10px',
            color: '#ef4444',
            fontSize: '0.9rem'
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

        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <label>
            Assignment Title
            <input 
              placeholder="e.g. Chemical Bonding Worksheet"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Subject
              <select 
                value={form.subject}
                onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
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
                value={form.batchId}
                onChange={(e) => {
                  const b = batches.find(x => x.id === e.target.value)
                  setForm(f => ({ ...f, batchId: e.target.value, classLevel: b?.classLevel || '10' }))
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
              value={form.dueDate}
              onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </label>

          <div style={{ 
            marginTop: '8px',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.02)',
            borderRadius: '12px',
            border: '1px solid var(--border-soft)'
          }}>
            <label style={{ marginBottom: '12px', fontWeight: '700', fontSize: '0.95rem', display: 'block' }}>
              Question Text
              <textarea 
                placeholder="Type your question here..."
                style={{ height: '80px', marginTop: '8px' }}
                value={form.questionText}
                onChange={(e) => setForm(f => ({ ...f, questionText: e.target.value }))}
              />
            </label>

            <div className="stack-gap" style={{ gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Options (Select the correct one)
              </span>
              {form.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="radio" 
                    name="correct-opt"
                    checked={opt.isCorrect}
                    onChange={() => {
                      setForm(f => ({
                        ...f,
                        options: f.options.map((o, i) => ({ ...o, isCorrect: i === idx }))
                      }))
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <input 
                    placeholder={`Option ${idx + 1}`}
                    value={opt.text}
                    onChange={(e) => {
                      const newOpts = [...form.options]
                      newOpts[idx].text = e.target.value
                      setForm(f => ({ ...f, options: newOpts }))
                    }}
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handlePublish} 
            isLoading={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Publishing...' : 'Publish Homework'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
