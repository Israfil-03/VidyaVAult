import { 
  Database, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'
import type { QuestionBankEntry } from '../types'

const navigation = [
  { label: 'Admin Dashboard', to: '/institute-admin', icon: <Database size={18} /> },
  { label: 'Question Bank', to: '/admin/question-bank', icon: <Database size={18} /> }
]

const SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY']
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']

export const QuestionBankPage = () => {
  const { token } = useAuth()
  const [questions, setQuestions] = useState<QuestionBankEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    subject: '',
    difficulty: '',
    search: ''
  })

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Partial<QuestionBankEntry> | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadQuestions = async () => {
    if (!token) return
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (filters.subject) query.append('subject', filters.subject)
      if (filters.difficulty) query.append('difficulty', filters.difficulty)
      if (filters.search) query.append('search', filters.search)

      const response = await apiRequest<QuestionBankEntry[]>(`/question-bank?${query.toString()}`, { token })
      setQuestions(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadQuestions()
    }, 300)
    return () => clearTimeout(timer)
  }, [filters, token])

  const handleDelete = async (id: string) => {
    if (!token || !window.confirm('Are you sure you want to delete this question?')) return
    try {
      await apiRequest(`/question-bank/${id}`, { method: 'DELETE', token })
      setQuestions(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !currentQuestion) return
    setSubmitting(true)
    try {
      const method = currentQuestion.id ? 'PUT' : 'POST'
      const url = currentQuestion.id ? `/question-bank/${currentQuestion.id}` : '/question-bank'
      
      await apiRequest(url, {
        method,
        token,
        body: JSON.stringify(currentQuestion)
      })
      
      setIsEditModalOpen(false)
      void loadQuestions()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkUpload = async (csvText: string) => {
    if (!token) return
    setSubmitting(true)
    try {
      // Basic CSV parser
      const lines = csvText.trim().split('\n')
      const payload = lines.slice(1).map(line => {
        const parts = line.split(',')
        return {
          text: parts[0],
          subject: parts[1],
          chapter: parts[2],
          difficulty: parts[3],
          options: [
            { text: parts[4], isCorrect: parts[8] === '0' },
            { text: parts[5], isCorrect: parts[8] === '1' },
            { text: parts[6], isCorrect: parts[8] === '2' },
            { text: parts[7], isCorrect: parts[8] === '3' },
          ]
        }
      })

      await apiRequest('/question-bank/bulk', {
        method: 'POST',
        token,
        body: JSON.stringify({ questions: payload })
      })
      
      setIsBulkModalOpen(false)
      void loadQuestions()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout title="Question Bank Management" navigation={navigation}>
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-danger-500/10 border border-danger-500/20 text-danger-500 rounded-xl mb-6">
            {error}
          </div>
        )}
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[300px]">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Search questions..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 focus:border-primary-500 outline-none transition-all"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
             </div>
             <select 
               className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary-500"
               value={filters.subject}
               onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
             >
                <option value="">All Subjects</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
          <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setIsBulkModalOpen(true)}>
                <Upload size={18} className="mr-2" /> Bulk Upload
             </Button>
             <Button onClick={() => {
                setCurrentQuestion({
                  text: '',
                  subject: 'PHYSICS',
                  difficulty: 'MEDIUM',
                  options: [
                    { id: '', text: '', isCorrect: true },
                    { id: '', text: '', isCorrect: false },
                    { id: '', text: '', isCorrect: false },
                    { id: '', text: '', isCorrect: false },
                  ] as any
                })
                setIsEditModalOpen(true)
             }}>
                <Plus size={18} className="mr-2" /> Add Question
             </Button>
          </div>
        </div>

        {/* Question List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="flex justify-center py-20">
               <Loader2 className="animate-spin text-primary-500" size={40} />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
               <AlertCircle className="mx-auto text-muted mb-4" size={48} />
               <h3 className="text-xl font-bold">No questions found</h3>
               <p className="text-muted">Try adjusting your filters or add a new question.</p>
            </div>
          ) : (
            questions.map((q) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:border-primary-500/50 transition-colors group">
                   <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary-500/10 text-primary-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                               {q.subject}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                               q.difficulty === 'EASY' ? 'bg-success-500/10 text-success-500' :
                               q.difficulty === 'HARD' ? 'bg-danger-500/10 text-danger-500' : 'bg-warning-500/10 text-warning-500'
                            }`}>
                               {q.difficulty}
                            </span>
                            {q.chapter && <span className="text-[10px] text-muted font-bold uppercase">{q.chapter}</span>}
                         </div>
                         <h4 className="text-lg font-semibold leading-relaxed mb-4">{q.text}</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((opt) => (
                               <div key={opt.id} className={`flex items-center gap-2 text-sm p-2 rounded-lg border ${
                                  opt.isCorrect ? 'bg-success-500/5 border-success-500/20 text-success-500' : 'bg-white/5 border-white/10 text-muted'
                               }`}>
                                  {opt.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                  {opt.text}
                               </div>
                            ))}
                         </div>
                      </div>
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => {
                              setCurrentQuestion(q)
                              setIsEditModalOpen(true)
                           }}
                           className="p-2 hover:bg-primary-500/10 text-primary-500 rounded-lg transition-colors"
                         >
                            <Edit size={18} />
                         </button>
                         <button 
                           onClick={() => handleDelete(q.id)}
                           className="p-2 hover:bg-danger-500/10 text-danger-500 rounded-lg transition-colors"
                         >
                            <Trash2 size={18} />
                         </button>
                      </div>
                   </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-[#1a1c23] border border-white/10 rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
             >
                <h3 className="text-2xl font-bold mb-6">{currentQuestion?.id ? 'Edit Question' : 'Add New Question'}</h3>
                <form onSubmit={handleSave} className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase text-muted">Subject</label>
                         <select 
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500"
                           value={currentQuestion?.subject}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, subject: e.target.value as any }))}
                           required
                         >
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase text-muted">Difficulty</label>
                         <select 
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500"
                           value={currentQuestion?.difficulty}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, difficulty: e.target.value as any }))}
                           required
                         >
                            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                         </select>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted">Question Text</label>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 min-h-[100px]"
                        value={currentQuestion?.text}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, text: e.target.value }))}
                        required
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase text-muted">Chapter</label>
                         <input 
                           type="text"
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500"
                           value={currentQuestion?.chapter || ''}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, chapter: e.target.value }))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase text-muted">Concept</label>
                         <input 
                           type="text"
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500"
                           value={currentQuestion?.concept || ''}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, concept: e.target.value }))}
                         />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-xs font-bold uppercase text-muted">Options (Select the correct one)</label>
                      {currentQuestion?.options?.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                           <input 
                             type="radio" 
                             name="isCorrect" 
                             checked={opt.isCorrect}
                             onChange={() => {
                                const newOptions = currentQuestion.options?.map((o, i) => ({ ...o, isCorrect: i === idx }))
                                setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
                             }}
                           />
                           <input 
                             type="text" 
                             className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500"
                             placeholder={`Option ${idx + 1}`}
                             value={opt.text}
                             onChange={(e) => {
                                const newOptions = [...(currentQuestion.options || [])]
                                newOptions[idx] = { ...newOptions[idx], text: e.target.value }
                                setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
                             }}
                             required
                           />
                        </div>
                      ))}
                   </div>

                   <div className="flex justify-end gap-3 pt-4">
                      <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                      <Button type="submit" isLoading={submitting}>Save Question</Button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-[#1a1c23] border border-white/10 rounded-2xl p-8 max-w-3xl w-full shadow-2xl"
             >
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-2xl font-bold">Bulk Upload Questions</h3>
                   <Button variant="secondary" size="sm" onClick={() => {
                      const csvContent = "text,subject,chapter,difficulty,opt1,opt2,opt3,opt4,correctIndex\nWhat is the speed of light?,PHYSICS,Mechanics,EASY,3e8,4e8,5e8,2e8,0";
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'question_template.csv';
                      a.click();
                   }}>
                      <Download size={14} className="mr-2" /> Template
                   </Button>
                </div>
                <p className="text-sm text-muted mb-4">Paste your CSV content below. Ensure it matches the template format.</p>
                <textarea 
                   className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 min-h-[300px] font-mono text-sm"
                   placeholder="text,subject,chapter,difficulty,opt1,opt2,opt3,opt4,correctIndex..."
                   id="bulkCsv"
                />
                <div className="flex justify-end gap-3 mt-6">
                   <Button variant="secondary" onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
                   <Button onClick={() => {
                      const val = (document.getElementById('bulkCsv') as HTMLTextAreaElement).value;
                      if (val) void handleBulkUpload(val);
                   }} isLoading={submitting}>Upload Questions</Button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  )
}
