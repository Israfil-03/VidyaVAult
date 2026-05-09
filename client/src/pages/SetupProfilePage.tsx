import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Lock, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'

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

export const SetupProfilePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [shortId, setShortId] = useState(searchParams.get('id') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await apiRequest('/auth/setup-profile', {
        method: 'POST',
        body: JSON.stringify({ shortId, password }),
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile setup failed')
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
          <h2 className="text-2xl font-bold mb-4 text-white">Profile Created!</h2>
          <p className="text-muted mb-8 px-6">
            Your profile has been set up successfully. You can now log in using your ID: <strong>{shortId}</strong>
          </p>
          <Link to="/login" className="login-button inline-flex items-center justify-center">
            Go to Login
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
      </div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
      >
        <header className="login-header">
          <div className="logo-icon-container">
             <Sparkles size={40} className="logo-icon" />
          </div>
          <h1>Create Your Profile</h1>
          <p>Set a secure password for your new account.</p>
        </header>

        <motion.form
          onSubmit={handleSubmit}
          className="login-form"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="input-group" variants={itemVariants}>
            <label htmlFor="shortId">Registration ID</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="shortId"
                type="text"
                className="login-input with-icon"
                placeholder="Enter your registration ID"
                value={shortId}
                onChange={(e) => setShortId(e.target.value)}
                required
              />
            </div>
          </motion.div>

          <motion.div className="input-group" variants={itemVariants}>
            <label htmlFor="password">Set Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="password"
                type="password"
                className="login-input with-icon"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </motion.div>

          <motion.div className="input-group" variants={itemVariants}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="confirmPassword"
                type="password"
                className="login-input with-icon"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
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
            className="login-button"
            disabled={submitting}
            variants={itemVariants}
          >
            {submitting ? (
              <><Loader2 className="animate-spin mr-2" size={20} /> Processing...</>
            ) : (
              <>Create Your Profile <ArrowRight className="ml-2" size={20} /></>
            )}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  )
}
