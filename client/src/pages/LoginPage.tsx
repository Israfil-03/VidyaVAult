import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'
import './Login.css'

const rolePath: Record<Role, string> = {
  superadmin: '/superadmin',
  teacher_admin: '/teacher',
  student: '/student',
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
      </div>

      <div className="login-card">
        <header className="login-header">
          <h1>VidyaVault</h1>
          <p>Welcome back! Please enter your details.</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="role">Role view</label>
            <select
              id="role"
              className="login-input login-select"
              value={roleHint}
              onChange={(event) => setRoleHint(event.target.value as Role)}
            >
              <option value="superadmin">Superadmin</option>
              <option value="teacher_admin">Teacher Admin</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="identity">Email or username</label>
            <input
              id="identity"
              type="text"
              className="login-input"
              placeholder="Enter your email or username"
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={submitting}>
            {submitting ? (
              <>
                <span className="btn-spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
