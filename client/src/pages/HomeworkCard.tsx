import { FileText, Search, Eye } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Card } from '../components/Card'
import { HomeworkStatusModal } from '../components/HomeworkStatusModal'

interface TestRow {
  id: string
  title: string
  subject: string
  status: string
  classLevel: string
  startTime: string
  endTime: string
  _count: {
    questions: number
    assignments: number
    submissions: number
  }
}

interface HomeworkCardProps {
  tests: TestRow[]
  formatShortDate: (dateLike: string) => string
  getTestWindowStatus: (test: Pick<TestRow, 'startTime' | 'endTime'>) => 'active' | 'upcoming' | 'closed'
}

type FilterStatus = 'all' | 'upcoming' | 'active' | 'closed'

export const HomeworkCard = ({ tests, formatShortDate, getTestWindowStatus }: HomeworkCardProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTest, setSelectedTest] = useState<{ id: string; title: string } | null>(null)

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const windowStatus = getTestWindowStatus(test)
      const matchesFilter = activeFilter === 'all' || windowStatus === activeFilter
      const matchesSearch =
        searchQuery === '' ||
        test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.subject.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [tests, activeFilter, searchQuery, getTestWindowStatus])

  const getStatusColor = (test: TestRow): string => {
import { FileText, Search, Eye } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Card } from '../components/Card'
import { HomeworkStatusModal } from '../components/HomeworkStatusModal'

interface TestRow {
  id: string
  title: string
  subject: string
  status: string
  classLevel: string
  startTime: string
  endTime: string
  _count: {
    questions: number
    assignments: number
    submissions: number
  }
}

interface HomeworkCardProps {
  tests: TestRow[]
  formatShortDate: (dateLike: string) => string
  getTestWindowStatus: (test: Pick<TestRow, 'startTime' | 'endTime'>) => 'active' | 'upcoming' | 'closed'
}

type FilterStatus = 'all' | 'upcoming' | 'active' | 'closed'

export const HomeworkCard = ({ tests, formatShortDate, getTestWindowStatus }: HomeworkCardProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTest, setSelectedTest] = useState<{ id: string; title: string } | null>(null)

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const windowStatus = getTestWindowStatus(test)
      const matchesFilter = activeFilter === 'all' || windowStatus === activeFilter
      const matchesSearch =
        searchQuery === '' ||
        test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.subject.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [tests, activeFilter, searchQuery, getTestWindowStatus])

  const getStatusColor = (test: TestRow): string => {
    const windowStatus = getTestWindowStatus(test)
    if (windowStatus === 'active') return 'status-active'
    if (windowStatus === 'upcoming') return 'status-upcoming'
    return 'status-closed'
  }

  return (
    <div style={{ position: 'relative' }}>
      <Card title="Live Homework" subtitle="Active and upcoming assignments" variant="glass">
        <div className="stack-gap">
          <div className="inline-actions" style={{ gap: '8px', marginBottom: '12px' }}>
            {(['all', 'upcoming', 'active', 'closed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: activeFilter === filter ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid var(--border-soft)',
                  background: activeFilter === filter ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: activeFilter === filter ? 'var(--color-primary-600)' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-soft)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '12px',
                paddingTop: '10px',
                paddingBottom: '10px',
                border: '1px solid var(--border-soft)',
                borderRadius: '10px',
                background: 'var(--surface-soft)',
                fontSize: '0.94rem',
                color: 'var(--text-main)',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-500)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-soft)'
              }}
            />
          </div>

          {filteredTests.length === 0 ? (
            <div className="empty-state">
              <FileText size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>
                {tests.length === 0 ? 'No homework assigned yet.' : 'No homework matches your filters.'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Assignments</th>
                    <th style={{ textAlign: 'center' }}>Submissions</th>
                    <th style={{ textAlign: 'center' }}>Due</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test) => (
                    <tr key={test.id}>
                      <td>
                        <strong>{test.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '2px' }}>
                          Class {test.classLevel}
                        </div>
                      </td>
                      <td>{test.subject}</td>
                      <td>
                        <span className={`status-pill ${getStatusColor(test)}`}>
                          {getTestWindowStatus(test).charAt(0).toUpperCase() + getTestWindowStatus(test).slice(1)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <strong>{test._count.assignments}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <strong>{test._count.submissions}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                          {formatShortDate(test.endTime)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedTest({ id: test.id, title: test.title })}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-primary-600)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '600',
                            fontSize: '0.85rem'
                          }}
                          title="View Submission Status"
                        >
                          <Eye size={18} />
                          Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', textAlign: 'center', marginTop: '8px' }}>
            Showing {filteredTests.length} of {tests.length} homework assignments
          </div>
        </div>
      </Card>
      {selectedTest && (
        <HomeworkStatusModal 
          testId={selectedTest.id} 
          testTitle={selectedTest.title} 
          onClose={() => setSelectedTest(null)} 
        />
      )}
    </div>
  )
}
