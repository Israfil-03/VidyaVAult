import { Navigate, Route, Routes } from 'react-router-dom'

import { Loader } from '../components/Loader'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { LoginPage } from '../pages/LoginPage'
import { RewardExplanationPage } from '../pages/RewardExplanationPage'
import { StudentDashboard } from '../pages/StudentDashboard'
import { StudentResultsPage } from '../pages/StudentResultsPage'
import { SuperadminDashboard } from '../pages/SuperadminDashboard'
import { TakeTestPage } from '../pages/TakeTestPage'
import { TeacherDashboard } from '../pages/TeacherDashboard'
import { TeacherTestWizardPage } from '../pages/TeacherTestWizardPage'

const homePathByRole = {
  superadmin: '/superadmin',
  teacher_admin: '/teacher',
  student: '/student',
} as const

export const AppRouter = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loader />
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={user ? homePathByRole[user.role] : '/login'} replace />}
      />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/superadmin"
        element={
          <ProtectedRoute roles={['superadmin']}>
            <SuperadminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/tests/new"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherTestWizardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/tests/:testId/take"
        element={
          <ProtectedRoute roles={['student']}>
            <TakeTestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results/:submissionId"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentResultsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute roles={['superadmin', 'teacher_admin', 'student']}>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reward-explanation"
        element={
          <ProtectedRoute roles={['superadmin', 'teacher_admin', 'student']}>
            <RewardExplanationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={user ? homePathByRole[user.role] : '/login'} replace />}
      />
    </Routes>
  )
}
