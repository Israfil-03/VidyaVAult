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
  Download,
  Image as ImageIcon,
  BookOpen,
  Info,
  Sparkles
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
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
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Partial<QuestionBankEntry> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [aiConfig, setAiConfig] = useState({
    topic: '',
    difficulty: 'MEDIUM',
    numQuestions: 5,
    subject: 'PHYSICS'
  })

  const loadQuestions = useCallback(async () => {
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
  }, [token, filters, setError])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadQuestions()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadQuestions])

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

  const handleAiGenerate = async () => {
    if (!token) return
    setSubmitting(true)
    try {
      const generated = await apiRequest<any[]>('/ai/generate-questions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          subject: aiConfig.subject,
          board: 'CBSE', // Default or could be configurable
          classLevel: '12', // Default or could be configurable
          topic: aiConfig.topic,
          difficulty: aiConfig.difficulty,
          numQuestions: aiConfig.numQuestions,
        }),
      })

      const payload = generated.map(item => ({
        text: item.question,
        subject: aiConfig.subject,
        chapter: item.chapter || aiConfig.topic,
        difficulty: aiConfig.difficulty,
        explanation: item.explanation,
        options: item.options.map((opt: string, idx: number) => ({
          text: opt,
          isCorrect: idx === item.correctIndex
        }))
      }))

      await apiRequest('/question-bank/bulk', {
        method: 'POST',
        token,
        body: JSON.stringify({ questions: payload })
      })

      setIsAiModalOpen(false)
      void loadQuestions()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'AI generation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkUpload = async (csvText: string) => {
    if (!token) return
    setSubmitting(true)
    try {
      const lines = csvText.trim().split('\n')
      const payload = lines.slice(1).map(line => {
        const parts = line.split(',')
        return {
          text: parts[0],
          subject: parts[1],
          chapter: parts[2],
          difficulty: parts[3],
          imageUrl: parts[4] || undefined,
          explanation: parts[5] || undefined,
          options: [
            { text: parts[6], isCorrect: parts[10] === '0', imageUrl: parts[11] || undefined },
            { text: parts[7], isCorrect: parts[10] === '1', imageUrl: parts[12] || undefined },
            { text: parts[8], isCorrect: parts[10] === '2', imageUrl: parts[13] || undefined },
            { text: parts[9], isCorrect: parts[10] === '3', imageUrl: parts[14] || undefined },
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
             <Button variant="secondary" onClick={() => setIsAiModalOpen(true)} className="!bg-purple-500/10 !text-purple-500 !border-purple-500/20 hover:!bg-purple-500/20">
                <Sparkles size={18} className="mr-2" /> AI Scrape
             </Button>
             <Button onClick={() => {
                setCurrentQuestion({
                  text: '',
                  subject: 'PHYSICS',
                  difficulty: 'MEDIUM',
                  explanation: '',
                  imageUrl: '',
                  options: [
                    { id: '', text: '', isCorrect: true, imageUrl: '' },
                    { id: '', text: '', isCorrect: false, imageUrl: '' },
                    { id: '', text: '', isCorrect: false, imageUrl: '' },
                    { id: '', text: '', isCorrect: false, imageUrl: '' },
                  ] as QuestionBankEntry['options']
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
                <Card className="hover:border-primary-500/50 transition-colors group relative overflow-hidden">
                   <div className="flex flex-col md:flex-row gap-6">
                      {q.imageUrl && (
                        <div className="md:w-48 h-32 bg-black/20 rounded-xl overflow-hidden flex-shrink-0">
                           <img src={q.imageUrl} alt="Question" className="w-full h-full object-cover" />
                        </div>
                      )}
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
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt) => (
                               <div key={opt.id} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                                  opt.isCorrect ? 'bg-success-500/5 border-success-500/30 text-success-500 ring-1 ring-success-500/20' : 'bg-white/5 border-white/10 text-muted'
                               }`}>
                                  <div className="flex items-center gap-2">
                                     {opt.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                     <span className="font-medium">{opt.text}</span>
                                  </div>
                                  {opt.imageUrl && (
                                    <div className="h-20 w-full mt-1 bg-black/10 rounded-lg overflow-hidden">
                                       <img src={opt.imageUrl} alt="Option" className="w-full h-full object-contain" />
                                    </div>
                                  )}
                               </div>
                            ))}
                         </div>
                         {q.explanation && (
                            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 text-sm text-muted">
                               <div className="flex items-center gap-2 mb-1 text-white font-semibold">
                                  <BookOpen size={14} className="text-primary-500" /> Solution Explanation
                               </div>
                               {q.explanation}
                            </div>
                         )}
                      </div>
                      <div className="flex flex-row md:flex-col gap-2 md:self-start self-end">
                         <button 
                           onClick={() => {
                              setCurrentQuestion(q)
                              setIsEditModalOpen(true)
                           }}
                           className="p-3 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 rounded-xl transition-all"
                           title="Edit Question"
                         >
                            <Edit size={20} />
                         </button>
                         <button 
                           onClick={() => handleDelete(q.id)}
                           className="p-3 bg-danger-500/10 hover:bg-danger-500/20 text-danger-500 rounded-xl transition-all"
                           title="Delete Question"
                         >
                            <Trash2 size={20} />
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="bg-[#12141c] border border-white/10 rounded-3xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
             >
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h3 className="text-2xl font-black">{currentQuestion?.id ? 'Edit Question' : 'Add New Question'}</h3>
                      <p className="text-muted text-sm mt-1">Fill in the details to update the global question bank.</p>
                   </div>
                   <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                      <XCircle size={24} className="text-muted" />
                   </button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                   {/* Meta Section */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                            <Info size={12} /> Subject
                         </label>
                         <select 
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-primary-500 focus:ring-4 ring-primary-500/10 transition-all appearance-none"
                           value={currentQuestion?.subject}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, subject: e.target.value as QuestionBankEntry['subject'] }))}
                           required
                         >
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                            <Info size={12} /> Difficulty
                         </label>
                         <select 
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-primary-500 focus:ring-4 ring-primary-500/10 transition-all appearance-none"
                           value={currentQuestion?.difficulty}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, difficulty: e.target.value as QuestionBankEntry['difficulty'] }))}
                           required
                         >
                            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                            <ImageIcon size={12} /> Question Image URL
                         </label>
                         <input 
                           type="text"
                           placeholder="https://example.com/image.png"
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-primary-500 transition-all"
                           value={currentQuestion?.imageUrl || ''}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, imageUrl: e.target.value }))}
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-muted">Chapter Name</label>
                         <input 
                           type="text"
                           placeholder="e.g. Thermodynamics"
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-primary-500 transition-all"
                           value={currentQuestion?.chapter || ''}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, chapter: e.target.value }))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-muted">Concept Tag</label>
                         <input 
                           type="text"
                           placeholder="e.g. Entropy"
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-primary-500 transition-all"
                           value={currentQuestion?.concept || ''}
                           onChange={(e) => setCurrentQuestion(prev => ({ ...prev, concept: e.target.value }))}
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted">Question Statement</label>
                      <textarea 
                        placeholder="Type your question here. Use $...$ for LaTeX formulas."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary-500 transition-all min-h-[120px] resize-y leading-relaxed"
                        value={currentQuestion?.text}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, text: e.target.value }))}
                        required
                      />
                   </div>

                   {/* Options Section */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <label className="text-sm font-black uppercase tracking-widest text-primary-500">Answer Options</label>
                         <span className="text-xs text-muted">Select the correct radio button</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {currentQuestion?.options?.map((opt, idx) => (
                           <div key={idx} className={`p-5 rounded-3xl border transition-all ${opt.isCorrect ? 'bg-success-500/5 border-success-500/30' : 'bg-white/5 border-white/10'}`}>
                              <div className="flex items-center gap-3 mb-4">
                                 <input 
                                   type="radio" 
                                   name="isCorrect" 
                                   className="w-5 h-5 accent-success-500"
                                   checked={opt.isCorrect}
                                   onChange={() => {
                                      const newOptions = currentQuestion.options?.map((o, i) => ({ ...o, isCorrect: i === idx }))
                                      setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
                                   }}
                                 />
                                 <span className="text-xs font-bold uppercase tracking-widest text-muted">Option {String.fromCharCode(65 + idx)}</span>
                              </div>
                              <div className="space-y-3">
                                 <input 
                                   type="text" 
                                   className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-primary-500 transition-all"
                                   placeholder={`Option Text...`}
                                   value={opt.text}
                                   onChange={(e) => {
                                      const newOptions = [...(currentQuestion.options || [])]
                                      newOptions[idx] = { ...newOptions[idx], text: e.target.value }
                                      setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
                                   }}
                                   required
                                 />
                                 <div className="flex items-center gap-2">
                                    <ImageIcon size={14} className="text-muted" />
                                    <input 
                                      type="text" 
                                      className="flex-1 bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary-500 transition-all"
                                      placeholder="Option Image URL (Optional)"
                                      value={opt.imageUrl || ''}
                                      onChange={(e) => {
                                         const newOptions = [...(currentQuestion.options || [])]
                                         newOptions[idx] = { ...newOptions[idx], imageUrl: e.target.value }
                                         setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
                                      }}
                                    />
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                         <BookOpen size={14} /> Detailed Solution / Explanation
                      </label>
                      <textarea 
                        placeholder="Explain why the selected option is correct..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary-500 transition-all min-h-[100px] resize-y text-sm text-muted"
                        value={currentQuestion?.explanation || ''}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                      />
                   </div>

                   <div className="flex justify-end gap-4 pt-6">
                      <Button variant="secondary" size="lg" className="rounded-2xl px-8" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                      <Button type="submit" size="lg" className="rounded-2xl px-12" isLoading={submitting}>Save to Bank</Button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Scrape Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-[#12141c] border border-purple-500/20 rounded-3xl p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden"
             >
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 blur-[100px] pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8 relative">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                         <Sparkles className="text-purple-500" size={20} />
                         <span className="text-purple-500 text-[10px] font-black uppercase tracking-[0.2em]">Powered by Gemini AI</span>
                      </div>
                      <h3 className="text-2xl font-black">AI Question Scraper</h3>
                      <p className="text-muted text-sm mt-1">Generate high-quality academic questions instantly.</p>
                   </div>
                   <button onClick={() => setIsAiModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                      <XCircle size={24} className="text-muted" />
                   </button>
                </div>

                <div className="space-y-6 relative">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-muted">Subject</label>
                         <select 
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-purple-500 transition-all appearance-none"
                           value={aiConfig.subject}
                           onChange={(e) => setAiConfig(prev => ({ ...prev, subject: e.target.value }))}
                         >
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-muted">Difficulty</label>
                         <select 
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-purple-500 transition-all appearance-none"
                           value={aiConfig.difficulty}
                           onChange={(e) => setAiConfig(prev => ({ ...prev, difficulty: e.target.value }))}
                         >
                            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                         </select>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted">Topic / Chapter Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Quantum Mechanics or Photosynthesis"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-purple-500 transition-all"
                        value={aiConfig.topic}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, topic: e.target.value }))}
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted">Number of Questions (1-20)</label>
                      <input 
                        type="number"
                        min="1"
                        max="20"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-purple-500 transition-all"
                        value={aiConfig.numQuestions}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, numQuestions: parseInt(e.target.value) }))}
                      />
                   </div>

                   <div className="flex justify-end gap-4 mt-8">
                      <Button variant="secondary" size="lg" className="rounded-2xl px-8" onClick={() => setIsAiModalOpen(false)}>Cancel</Button>
                      <Button 
                        size="lg" 
                        className="rounded-2xl px-12 !bg-purple-600 hover:!bg-purple-700 shadow-lg shadow-purple-500/20" 
                        onClick={handleAiGenerate} 
                        isLoading={submitting}
                        disabled={!aiConfig.topic}
                      >
                         <Sparkles size={18} className="mr-2" /> Start Generating
                      </Button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-[#12141c] border border-white/10 rounded-3xl p-10 max-w-4xl w-full shadow-2xl"
             >
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h3 className="text-2xl font-black">Bulk Upload Questions</h3>
                      <p className="text-muted text-sm mt-1">Import multiple questions using CSV format.</p>
                   </div>
                   <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => {
                      const csvContent = "text,subject,chapter,difficulty,imageUrl,explanation,optA_text,optB_text,optC_text,optD_text,correctIdx(0-3),optA_img,optB_img,optC_img,optD_img\nWhat is the speed of light?,PHYSICS,Mechanics,EASY,,Speed is approx 3e8,3e8,4e8,5e8,2e8,0,,,,";
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'question_bank_template.csv';
                      a.click();
                   }}>
                      <Download size={14} className="mr-2" /> Download Template
                   </Button>
                </div>
                
                <div className="bg-primary-500/5 border border-primary-500/10 rounded-2xl p-4 mb-6 flex gap-4 items-start">
                   <Info className="text-primary-500 shrink-0 mt-1" size={20} />
                   <div className="text-xs text-muted leading-relaxed">
                      Ensure your CSV columns match exactly: <br/>
                      <code className="text-primary-500">text, subject, chapter, difficulty, imageUrl, explanation, optA, optB, optC, optD, correctIdx, optA_img, optB_img, optC_img, optD_img</code>
                   </div>
                </div>

                <textarea 
                   className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary-500 min-h-[300px] font-mono text-sm custom-scrollbar"
                   placeholder="Paste CSV rows here..."
                   id="bulkCsv"
                />
                
                <div className="flex justify-end gap-4 mt-8">
                   <Button variant="secondary" size="lg" className="rounded-2xl px-8" onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
                   <Button size="lg" className="rounded-2xl px-12" onClick={() => {
                      const val = (document.getElementById('bulkCsv') as HTMLTextAreaElement).value;
                      if (val) void handleBulkUpload(val);
                   }} isLoading={submitting}>Start Import</Button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  )
}
