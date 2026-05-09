import { User, Phone, UserCheck, Loader2 } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { StatCard } from '../components/StatCard'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../services/api'

interface RegistrationRequest {
  id: string
  fullName: string
  subjects: string[]
  classLevel: string
  medium: string
  phone: string
  year: number
  status: string
  createdAt: string
}

interface Teacher {
  id: string
  user: { username: string }
  subject: string
}

const navigation = [
  { label: 'Admin Dashboard', to: '/institute-admin', icon: <UserCheck size={18} /> }
]

export const AdminDashboard = () => {
  const { token } = useAuth()
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Approval state
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approvalData, setApprovalData] = useState({
    batchNo: '',
    teacherId: '',
  })
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [reqData, teacherData] = await Promise.all([
        apiRequest<RegistrationRequest[]>('/institute-admin/requests', { token }),
        apiRequest<Teacher[]>('/institute-admin/teachers', { token }),
      ])
      setRequests(reqData)
      setTeachers(teacherData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleDecline = async (id: string) => {
    if (!token || !window.confirm('Are you sure you want to decline this request?')) return
    try {
      await apiRequest(`/institute-admin/requests/${id}/decline`, {
        method: 'POST',
        token,
      })
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const handleApprove = async () => {
    if (!token || !approvingId) return
    if (!approvalData.batchNo || !approvalData.teacherId) {
      alert('Please assign a Batch and a Teacher.')
      return
    }

    setActionLoading(true)
    try {
      const result = await apiRequest<{ shortId: string; longId: string }>(`/institute-admin/requests/${approvingId}/approve`, {
        method: 'POST',
        token,
        body: JSON.stringify(approvalData),
      })
      alert(`Student Approved!\nShort ID: ${result.shortId}\nLong ID: ${result.longId}`)
      setApprovingId(null)
      setApprovalData({ batchNo: '', teacherId: '' })

      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <DashboardLayout title="Institute Admin Portal" navigation={navigation}>
      <div className="space-y-6">
        <div className="stats-grid">
          <StatCard label="Pending Requests" value={requests.length} icon={<User size={18} />} tone="warning" />
          <StatCard label="Available Teachers" value={teachers.length} icon={<UserCheck size={18} />} />
        </div>

        <Card title="Student Registration Queue" subtitle="Review and process incoming applications">
          {error ? <div className="mb-4 text-sm text-error">{error}</div> : null}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 muted">No pending registration requests found.</div>
          ) : (
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Details</th>
                    <th>Subjects</th>
                    <th>Submitted</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{req.fullName}</span>
                          <span className="text-xs muted flex items-center gap-1">
                            <Phone size={10} /> {req.phone}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-white/5 px-2 py-1 rounded border border-white/10">Class {req.classLevel}</span>
                          <span className="bg-white/5 px-2 py-1 rounded border border-white/10">{req.medium === 'BENGALI' ? 'Bengali' : 'English'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {req.subjects.map(s => (
                            <span key={s} className="subject-pill text-[10px]">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs muted">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setApprovingId(req.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="btn-error-ghost"
                            onClick={() => handleDecline(req.id)}
                          >
                            Decline
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Approval Modal Placeholder - Simple Overlay */}
        {approvingId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1a1c23] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2">Approve Student</h3>
              <p className="text-sm muted mb-6">Assign a batch and teacher to generate registration IDs.</p>

              <div className="space-y-4">
                <div className="input-group">
                  <label className="text-xs font-bold uppercase tracking-wider mb-2 block">Batch Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 10 or 11"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-primary outline-none"
                    value={approvalData.batchNo}
                    onChange={e => setApprovalData(prev => ({ ...prev, batchNo: e.target.value }))}
                  />
                </div>

                <div className="input-group">
                  <label className="text-xs font-bold uppercase tracking-wider mb-2 block">Assign Teacher</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-primary outline-none"
                    value={approvalData.teacherId}
                    onChange={e => setApprovalData(prev => ({ ...prev, teacherId: e.target.value }))}
                  >
                    <option value="">Select teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.user.username} ({t.subject})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button
                    className="flex-1"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Approval'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setApprovingId(null)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
