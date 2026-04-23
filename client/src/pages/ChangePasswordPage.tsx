import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'

export const ChangePasswordPage = () => {
  const navigate = useNavigate()
  const { token, user, refreshMe } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!user) {
    return null
  }

  const navigation =
    user.role === 'superadmin'
      ? [{ label: 'Dashboard', to: '/superadmin' }]
      : user.role === 'teacher_admin'
        ? [{ label: 'Dashboard', to: '/teacher' }]
        : [
            { label: 'Dashboard', to: '/student' },
            { label: 'Results', to: '/student/results' },
          ]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      return
    }
    setError(null)
    setSuccess(null)
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        token,
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      setCurrentPassword('')
      setNewPassword('')
      await refreshMe()
      setSuccess('Password changed successfully.')
      setTimeout(() => {
        navigate(
          user.role === 'superadmin'
            ? '/superadmin'
            : user.role === 'teacher_admin'
              ? '/teacher'
              : '/student',
        )
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed')
    }
  }

  return (
    <DashboardLayout title="Change Password" navigation={navigation}>
      <Card title="Update your password">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}
          <Button type="submit">Change Password</Button>
        </form>
      </Card>
    </DashboardLayout>
  )
}
