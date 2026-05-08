import { Plus, Lightbulb, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '../components/Card'
import { Button } from '../components/Button'

export const NewHomeworkCard = () => {
  const subjects = [
    { label: 'Chemistry', value: 'CHEMISTRY' },
    { label: 'Biology', value: 'BIOLOGY' },
    { label: 'Mathematics', value: 'MATHEMATICS' },
  ]

  return (
    <Card title="Create New Homework" subtitle="Add assignments to your curriculum" variant="glass">
      <div className="stack-gap" style={{ gap: '16px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <BookOpen size={20} style={{ color: 'var(--color-primary-600)' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Ready to assign?</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                Create homework with questions, set due dates, and track submissions.
              </p>
            </div>
          </div>

          <Link to="/teacher/test/new">
            <Button
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Plus size={18} />
              Create New Homework
            </Button>
          </Link>
        </div>

        <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 10px', color: 'var(--text-main)' }}>
            Quick Start by Subject
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {subjects.map((subject) => (
              <Link
                key={subject.value}
                to="/teacher/test/new"
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-soft)',
                  background: 'var(--surface-soft)',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  el.style.borderColor = 'var(--color-primary-500)'
                  el.style.background = 'var(--color-primary-100)'
                  el.style.color = 'var(--color-primary-700)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  el.style.borderColor = 'var(--border-soft)'
                  el.style.background = 'var(--surface-soft)'
                  el.style.color = 'var(--text-main)'
                }}
              >
                {subject.label}
              </Link>
            ))}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(251, 191, 36, 0.08)',
            borderRadius: '10px',
            padding: '12px',
            border: '1px solid rgba(251, 191, 36, 0.2)',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem' }}>
            <Lightbulb size={16} style={{ color: 'var(--color-warning-500)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '4px' }}>Pro Tip</strong>
              <p style={{ margin: '0', color: 'var(--text-soft)' }}>
                Use the AI question generator to quickly create diverse homework sets based on topics and difficulty.
              </p>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', textAlign: 'center' }}>
          💡 Homework appears in Live Homework immediately after creation
        </div>
      </div>
    </Card>
  )
}
