import { Card } from '../components/Card'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { getDashboardNavigation } from './shared/dashboardNavigation'

export const RewardExplanationPage = () => {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  const navigation =
    user.role === 'superadmin'
      ? [{ label: 'Dashboard', to: '/superadmin' }]
      : user.role === 'teacher_admin'
        ? getDashboardNavigation('teacher')
        : getDashboardNavigation('student')

  return (
    <DashboardLayout title="How VidyaVault Rewards Work" navigation={navigation}>
      <Card title="Reward Cycle" subtitle="Cycle governance and evaluation boundaries">
        <p>
          Reward cycles run over a fixed period (typically 2 months). Each cycle evaluates tests for one
          teacher and one subject.
        </p>
      </Card>
      <Card title="English vs Bengali Competition" subtitle="Fair-medium comparison model">
        <p>
          Only English and Bengali medium batches under the same teacher and subject are compared for fair
          in-teacher competition.
        </p>
      </Card>
      <Card title="Normalization Rules" subtitle="How scores are standardized">
        <p>
          Student performance is normalized as obtained marks / max marks across eligible submissions.
          Batch score is the average normalized score of participating students.
        </p>
      </Card>
      <Card title="Award Categories" subtitle="Current and future recognition types">
        <ul className="plain-list">
          <li>
            <strong>TopPerformanceBatch:</strong> highest average normalized score in the cycle.
          </li>
          <li>
            <strong>MostImprovedBatch:</strong> highest score increase versus previous cycle.
          </li>
          <li>
            <strong>Student Badges:</strong> SUBJECT_STAR, TOP_IMPROVER, and future badge categories.
          </li>
        </ul>
      </Card>
    </DashboardLayout>
  )
}
