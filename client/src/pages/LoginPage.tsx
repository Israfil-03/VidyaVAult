import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { UserCircle, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react'

import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'
import './Login.css'

const rolePath: Record<Role, string> = {
  superadmin: '/superadmin',
  teacher_admin: '/teacher',
  student: '/student',
}

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

export const LoginPage = () => {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [roleHint, setRoleHint] = useState<Role>('superadmin')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate(rolePath[user.role], { replace: true })
    }
  }, [navigate, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const loggedInUser = await login(identity, password, roleHint)
      navigate(rolePath[loggedInUser.role], { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
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
        className="login-card"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
      >
        <header className="login-header">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.1, duration: 0.8 }}
            className="logo-icon-container"
          >
             <Sparkles size={40} className="logo-icon" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            VidyaVault
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Welcome back! Let's get you signed in.
          </motion.p>
        </header>

        <motion.form 
          onSubmit={handleSubmit} 
          className="login-form"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="input-group" variants={itemVariants}>
            <label htmlFor="role">Account Type</label>
            <div className="input-wrapper">
              <UserCircle className="input-icon" size={20} />
              <select
                id="role"
                className="login-input login-select with-icon"
                value={roleHint}
                onChange={(event) => setRoleHint(event.target.value as Role)}
              >
                <option value="superadmin">Superadmin</option>
                <option value="teacher_admin">Teacher Admin</option>
                <option value="student">Student</option>
              </select>
            </div>
          </motion.div>

          <motion.div className="input-group" variants={itemVariants}>
            <label htmlFor="identity">Email or username</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                id="identity"
                type="text"
                className="login-input with-icon"
                placeholder="Enter your email or username"
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                required
              />
            </div>
          </motion.div>

          <motion.div className="input-group" variants={itemVariants}>
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="password"
                type="password"
                className="login-input with-icon"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div 
                className="login-error"
                initial={{ opacity: 0, height: 0, y: -10, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', y: 0, marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, y: -10, marginBottom: 0 }}
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {submitting ? (
              <>
                <Loader2 className="btn-spinner-icon" size={20} />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="button-icon" size={20} />
              </>
            )}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  )
}
