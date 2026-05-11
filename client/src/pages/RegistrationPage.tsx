import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
  const [formData, setFormData] = useState<{
    fullName: string;
    phone: string;
    classLevel: string;
    medium: string;
    subjects: string[];
  }>({
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
        <header className="login-header text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="logo-icon-container mx-auto"
          >
             <Sparkles size={48} className="logo-icon text-primary-500" />
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-4 text-white">Join Vidya<span>Vault</span></h1>
          <p className="text-muted mt-2">Start your premium learning journey today.</p>
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

          <div className="form-row-flex mb-4">
            <motion.div className="input-group flex-1" variants={itemVariants}>
              <label>Class</label>
              <div className="toggle-container">
                {['11', '12'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={formData.classLevel === c ? 'active' : ''}
                    onClick={() => setFormData(prev => ({ ...prev, classLevel: c }))}
                  >
                    {formData.classLevel === c && (
                      <motion.div
                        layoutId="class-bg"
                        className="selection-bg"
                        initial={false}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        style={{ left: 4, right: '50%' }}
                      />
                    )}
                    {formData.classLevel === c && c === '12' && (
                      <motion.div
                        layoutId="class-bg"
                        className="selection-bg"
                        initial={false}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        style={{ left: '50%', right: 4 }}
                      />
                    )}
                    <span className="relative z-20">Class {c}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div className="input-group flex-1" variants={itemVariants}>
              <label>Medium</label>
              <div className="toggle-container">
                {[
                  { id: 'BENGALI', label: 'Bengali' },
                  { id: 'ENGLISH', label: 'English' }
                ].map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    className={formData.medium === m.id ? 'active' : ''}
                    onClick={() => setFormData(prev => ({ ...prev, medium: m.id }))}
                  >
                    {formData.medium === m.id && (
                      <motion.div
                        layoutId="medium-bg"
                        className="selection-bg"
                        initial={false}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        style={{ left: idx === 0 ? 4 : '50%', right: idx === 0 ? '50%' : 4 }}
                      />
                    )}
                    <span className="relative z-20">{m.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div className="input-group mb-4" variants={itemVariants}>
            <label>Subject Selection</label>
            <div className="subjects-grid">
              {[
                { id: 'PHYSICS', label: 'Physics' },
                { id: 'CHEMISTRY', label: 'Chemistry' },
                { id: 'MATHEMATICS', label: 'Mathematics' },
                { id: 'BIOLOGY', label: 'Biology' }
              ].map(sub => (
                <label 
                  key={sub.id} 
                  className={`subject-option ${formData.subjects.includes(sub.id) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.subjects.includes(sub.id)}
                    onChange={() => handleSubjectChange(sub.id)}
                  />
                  
                  <div className="custom-checkbox">
                    {formData.subjects.includes(sub.id) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <CheckCircle2 size={16} className="text-white" />
                      </motion.div>
                    )}
                  </div>
                  
                  <span className="subject-label">
                    {sub.label}
                  </span>

                  {formData.subjects.includes(sub.id) && (
                    <motion.div 
                      layoutId={`glow-${sub.id}`}
                      className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-30"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
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
                className="login-input with-icon"
                style={{ background: 'rgba(255,255,255,0.03)', opacity: 0.6, cursor: 'not-allowed' }}
                value={new Date().getFullYear()}
                readOnly
              />
            </div>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="login-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="login-button mt-4"
            disabled={submitting}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(59, 130, 246, 0.5)' }}
            whileTap={{ scale: 0.98 }}
            variants={itemVariants}
          >
            {submitting ? (
              <><Loader2 className="animate-spin mr-2" size={20} /> Processing...</>
            ) : (
              <>Create Account <ArrowRight className="ml-2" size={20} /></>
            )}
          </motion.button>

          <motion.p className="text-center mt-6 text-sm text-muted" variants={itemVariants}>
            Already have an account? <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
          </motion.p>
        </motion.form>
      </motion.div>
    </div>
  )
}
