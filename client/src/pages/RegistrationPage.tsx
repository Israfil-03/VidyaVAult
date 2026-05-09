import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { User, Phone, Layers, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'

import { apiRequest } from '../services/api'
import './Login.css'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
}

export const RegistrationPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    classLevel: '11',
    medium: 'BENGALI',
    subjects: [] as string[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubjectChange = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formData.subjects.length === 0) {
      setError('Please select at least one subject.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-bg-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <motion.div 
          className="login-card text-center py-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex justify-center mb-6">
            <div className="bg-success/20 p-4 rounded-full text-success">
              <CheckCircle2 size={64} />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white">Application Submitted!</h2>
          <p className="text-muted mb-8 px-6">
            Your request has been submitted successfully. Please wait for the Institute Admin to approve your application.
          </p>
          <Link to="/login" className="login-button inline-flex items-center justify-center">
            Return to Login
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>

      <motion.div
        className="login-card registration-card"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
      >
        <header className="login-header">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="logo-icon-container"
          >
             <Sparkles size={40} className="logo-icon" />
          </motion.div>
          <h1>Join VidyaVault</h1>
          <p>Apply for admission to start your learning journey.</p>
        </header>

        <motion.form
          onSubmit={handleSubmit}
          className="login-form"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="input-group" variants={itemVariants}>
            <label htmlFor="fullName">Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input
                id="fullName"
                type="text"
                className="login-input with-icon"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required
              />
            </div>
          </motion.div>

          <motion.div className="input-group" variants={itemVariants}>
            <label htmlFor="phone">Phone Number</label>
            <div className="input-wrapper">
              <Phone className="input-icon" size={20} />
              <input
                id="phone"
                type="tel"
                className="login-input with-icon"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
          </motion.div>

          <div className="form-row-flex gap-4 flex mb-4">
            <motion.div className="input-group flex-1" variants={itemVariants}>
              <label>Class</label>
              <div className="toggle-group flex gap-2">
                {['11', '12'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`flex-1 py-2 rounded-lg border transition-all ${formData.classLevel === c ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-muted'}`}
                    onClick={() => setFormData(prev => ({ ...prev, classLevel: c }))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div className="input-group flex-1" variants={itemVariants}>
              <label>Medium</label>
              <div className="toggle-group flex gap-2">
                {[
                  { id: 'BENGALI', label: 'Bengali' },
                  { id: 'ENGLISH', label: 'English' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`flex-1 py-2 rounded-lg border transition-all ${formData.medium === m.id ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-muted'}`}
                    onClick={() => setFormData(prev => ({ ...prev, medium: m.id as any }))}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div className="input-group mb-6" variants={itemVariants}>
            <label>Subject Selection</label>
            <div className="subjects-grid grid grid-cols-2 gap-3 mt-2">
              {[
                { id: 'PHYSICS', label: 'Physics' },
                { id: 'CHEMISTRY', label: 'Chemistry' },
                { id: 'MATHEMATICS', label: 'Mathematics' }
              ].map(sub => (
                <label key={sub.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.subjects.includes(sub.id) ? 'bg-primary/20 border-primary text-white' : 'bg-white/5 border-white/10 text-muted hover:bg-white/10'}`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.subjects.includes(sub.id)}
                    onChange={() => handleSubjectChange(sub.id)}
                  />
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.subjects.includes(sub.id) ? 'bg-primary border-primary' : 'border-white/20'}`}>
                    {formData.subjects.includes(sub.id) && <CheckCircle2 size={14} />}
                  </div>
                  <span className="text-sm font-medium">{sub.label}</span>
                </label>
              ))}
            </div>
          </motion.div>

          <motion.div className="input-group" variants={itemVariants}>
            <label>Enrollment Year</label>
            <div className="input-wrapper">
              <Layers className="input-icon" size={20} />
              <input
                type="text"
                className="login-input with-icon bg-white/5 opacity-50 cursor-not-allowed"
                value={new Date().getFullYear()}
                readOnly
              />
            </div>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="login-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="login-button mt-4"
            disabled={submitting}
            variants={itemVariants}
          >
            {submitting ? (
              <><Loader2 className="animate-spin mr-2" size={20} /> Submitting...</>
            ) : (
              <>Submit Application <ArrowRight className="ml-2" size={20} /></>
            )}
          </motion.button>

          <motion.p className="text-center mt-6 text-sm text-muted" variants={itemVariants}>
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </motion.p>
        </motion.form>
      </motion.div>
    </div>
  )
}
