import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'

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
    <div className="auth-page">
      <Card>
        <div className="brand-login">
          <h1>
            <span>Vidya</span>Vault
          </h1>
          <p>Test, analytics, and rewards for modern tuition classrooms.</p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Role view
            <select value={roleHint} onChange={(event) => setRoleHint(event.target.value as Role)}>
              <option value="superadmin">Superadmin</option>
              <option value="teacher_admin">Teacher Admin</option>
              <option value="student">Student</option>
            </select>
          </label>
          <label>
            Email or username
            <input
              type="text"
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
