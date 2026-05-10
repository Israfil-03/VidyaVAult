import { Navigate, Route, Routes } from 'react-router-dom'

import { Loader } from '../components/Loader'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { LoginPage } from '../pages/LoginPage'
import { RewardExplanationPage } from '../pages/RewardExplanationPage'
import { StudentPortalPage } from '../pages/StudentPortalPage'
import { StudentResultsPage } from '../pages/StudentResultsPage'
import { SuperadminDashboard } from '../pages/SuperadminDashboard'
import { TakeTestPage } from '../pages/TakeTestPage'
import { TeacherPortalPage } from '../pages/TeacherPortalPage'
import { TeacherTestWizardPage } from '../pages/TeacherTestWizardPage'
import { RegistrationPage } from '../pages/RegistrationPage'
import { SetupProfilePage } from '../pages/SetupProfilePage'
import { AdminDashboard } from '../pages/AdminDashboard'
import { QuestionBankPage } from '../pages/QuestionBankPage'
import { QuestionBankPage } from '../pages/QuestionBankPage'

const homePathByRole = {
  superadmin: '/superadmin',
  institute_admin: '/institute-admin',
  teacher_admin: '/teacher/homework',
  student: '/student/homework',
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
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/setup-profile" element={<SetupProfilePage />} />

      <Route
        path="/superadmin"
        element={
          <ProtectedRoute roles={['superadmin']}>
            <SuperadminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/institute-admin"
        element={
          <ProtectedRoute roles={['institute_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/question-bank"
        element={
          <ProtectedRoute roles={['superadmin', 'institute_admin']}>
            <QuestionBankPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <Navigate to="/teacher/homework" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/homework"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherPortalPage section="homework" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/practice"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherPortalPage section="practice" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/test"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherPortalPage section="test" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/leaderboard"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherPortalPage section="leaderboard" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/performance"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherPortalPage section="performance" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/profile"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherPortalPage section="profile" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/test/new"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <TeacherTestWizardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/tests/new"
        element={
          <ProtectedRoute roles={['teacher_admin']}>
            <Navigate to="/teacher/test/new" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['student']}>
            <Navigate to="/student/homework" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/homework"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentPortalPage section="homework" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/practice"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentPortalPage section="practice" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/test"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentPortalPage section="test" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/leaderboard"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentPortalPage section="leaderboard" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/performance"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentPortalPage section="performance" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentPortalPage section="profile" />
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
        path="/student/performance/:submissionId"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results"
        element={
          <ProtectedRoute roles={['student']}>
            <Navigate to="/student/performance" replace />
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
