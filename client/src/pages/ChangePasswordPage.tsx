import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'
import { getDashboardNavigation } from './shared/dashboardNavigation'

export const ChangePasswordPage = () => {
  const navigate = useNavigate()
  const { token, user, refreshMe } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!user) {
    return null
  }

  const navigation =
    user.role === 'superadmin'
      ? [{ label: 'Dashboard', to: '/superadmin' }]
      : user.role === 'teacher_admin'
        ? getDashboardNavigation('teacher')
        : getDashboardNavigation('student')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      return
    }
    setError(null)
    setSuccess(null)
    setSaving(true)
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
              ? '/teacher/homework'
              : '/student/homework',
        )
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Change Password" navigation={navigation}>
      <Card
        title="Update your password"
        subtitle="Use a strong password with at least 8 characters and a symbol."
      >
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
          <Button type="submit" isLoading={saving}>
            Change Password
          </Button>
        </form>
      </Card>
    </DashboardLayout>
  )
}
