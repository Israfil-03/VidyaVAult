import { Phone, User, UserCheck, Loader2, Database } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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
  user: {
    id: string
    username: string
    email: string | null
  }
  subject: string
}

interface BatchOption {
  id: string
  name: string
  classLevel: string
  medium: string
  boardTarget: string | null
}

interface TeacherOption {
  id: string
  subject: string
  user: {
    id: string
    username: string
    email: string | null
  }
  batches: BatchOption[]
}

interface SubjectApprovalOption {
  subject: string
  teachers: TeacherOption[]
}

interface ApprovalContext {
  request: RegistrationRequest
  subjects: SubjectApprovalOption[]
}

interface RegistrationPreview {
  overallSerial: number
  batchSerialNo: number
  batchNo: string
  shortId: string
  longId: string
}

interface ApprovalResult extends RegistrationPreview {
  assignments: {
    subject: string
    teacherId: string
    batchId?: string
  }[]
}

type BatchMode = 'existing' | 'new'

interface AssignmentDraft {
  subject: string
  teacherId: string
  batchMode: BatchMode
  batchId: string
  newBatchName: string
}

const navigation = [
  { label: 'Admin Dashboard', to: '/institute-admin', icon: <UserCheck size={18} /> },
  { label: 'Question Bank', to: '/admin/question-bank', icon: <Database size={18} /> }
]

const SUBJECT_LABELS: Record<string, string> = {
  PHYSICS: 'Physics',
  CHEMISTRY: 'Chemistry',
  MATHEMATICS: 'Mathematics',
}

const MEDIUM_LABELS: Record<string, string> = {
  BENGALI: 'Bengali',
  ENGLISH: 'English',
}

const formatSubject = (subject: string): string => SUBJECT_LABELS[subject] ?? subject
const formatMedium = (medium: string): string => MEDIUM_LABELS[medium] ?? medium

export const AdminDashboard = () => {
  const { token } = useAuth()
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [approvalContext, setApprovalContext] = useState<ApprovalContext | null>(null)
  const [assignmentMap, setAssignmentMap] = useState<Record<string, AssignmentDraft>>({})
  const [useSharedBatchName, setUseSharedBatchName] = useState(false)
  const [sharedBatchName, setSharedBatchName] = useState('')
  const [preview, setPreview] = useState<RegistrationPreview | null>(null)
  const [wizardLoading, setWizardLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [requestData, teacherData] = await Promise.all([
        apiRequest<RegistrationRequest[]>('/institute-admin/requests', { token }),
        apiRequest<Teacher[]>('/institute-admin/teachers', { token }),
      ])
      setRequests(requestData)
      setTeachers(teacherData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const resetWizard = () => {
    setWizardOpen(false)
    setWizardStep(1)
    setApprovalContext(null)
    setAssignmentMap({})
    setUseSharedBatchName(false)
    setSharedBatchName('')
    setPreview(null)
    setWizardLoading(false)
    setPreviewLoading(false)
    setActionLoading(false)
    setWizardError(null)
  }

  const getSubjectOption = (subject: string): SubjectApprovalOption | undefined =>
    approvalContext?.subjects.find((entry) => entry.subject === subject)

  const getTeacherById = (subject: string, teacherId: string): TeacherOption | undefined =>
    getSubjectOption(subject)?.teachers.find((teacher) => teacher.id === teacherId)

  const initAssignments = (context: ApprovalContext): Record<string, AssignmentDraft> => {
    const initial: Record<string, AssignmentDraft> = {}

    for (const subjectEntry of context.subjects) {
      const firstTeacher = subjectEntry.teachers[0]
      const firstBatch = firstTeacher?.batches[0]
      initial[subjectEntry.subject] = {
        subject: subjectEntry.subject,
        teacherId: firstTeacher?.id ?? '',
        batchMode: firstBatch ? 'existing' : 'new',
        batchId: firstBatch?.id ?? '',
        newBatchName: '',
      }
    }

    return initial
  }

  const openApprovalWizard = async (requestId: string) => {
    if (!token) return

    setWizardOpen(true)
    setWizardStep(1)
    setWizardLoading(true)
    setWizardError(null)
    setPreview(null)

    try {
      const context = await apiRequest<ApprovalContext>(
        `/institute-admin/requests/${requestId}/approval-options`,
        { token },
      )
      setApprovalContext(context)
      setAssignmentMap(initAssignments(context))
      setUseSharedBatchName(false)
      setSharedBatchName('')
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Failed to load approval details')
    } finally {
      setWizardLoading(false)
    }
  }

  const handleDecline = async (requestId: string) => {
    if (!token || !window.confirm('Are you sure you want to decline this request?')) return
    try {
      await apiRequest(`/institute-admin/requests/${requestId}/decline`, {
        method: 'POST',
        token,
      })
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const updateAssignment = (subject: string, patch: Partial<AssignmentDraft>) => {
    setAssignmentMap((prev) => {
      const current = prev[subject]
      if (!current) return prev
      return {
        ...prev,
        [subject]: {
          ...current,
          ...patch,
        },
      }
    })
  }

  const handleTeacherChange = (subject: string, teacherId: string) => {
    const selectedTeacher = getTeacherById(subject, teacherId)
    const firstBatch = selectedTeacher?.batches[0]
    updateAssignment(subject, {
      teacherId,
      batchMode: firstBatch ? 'existing' : 'new',
      batchId: firstBatch?.id ?? '',
    })
  }

  const validateWizard = (): string | null => {
    if (!approvalContext) {
      return 'Approval details not loaded yet.'
    }

    if (useSharedBatchName && sharedBatchName.trim().length === 0) {
      return 'Enter a shared batch name.'
    }

    for (const subjectEntry of approvalContext.subjects) {
      const draft = assignmentMap[subjectEntry.subject]
      if (!draft) {
        return `Batch and teacher setup missing for ${formatSubject(subjectEntry.subject)}.`
      }

      const selectedTeacher = subjectEntry.teachers.find((teacher) => teacher.id === draft.teacherId)
      if (!selectedTeacher) {
        return `Select a teacher for ${formatSubject(subjectEntry.subject)}.`
      }

      if (draft.batchMode === 'existing') {
        if (!draft.batchId) {
          return `Select a batch for ${formatSubject(subjectEntry.subject)}.`
        }
        const selectedBatch = selectedTeacher.batches.find((batch) => batch.id === draft.batchId)
        if (!selectedBatch) {
          return `Selected batch is invalid for ${formatSubject(subjectEntry.subject)}.`
        }
      } else {
        const newBatchName = useSharedBatchName ? sharedBatchName.trim() : draft.newBatchName.trim()
        if (newBatchName.length === 0) {
          return `Enter a new batch name for ${formatSubject(subjectEntry.subject)}.`
        }
      }
    }

    return null
  }

  const fetchPreview = async (): Promise<boolean> => {
    if (!token || !approvalContext) return false

    setPreviewLoading(true)
    setWizardError(null)
    try {
      const previewData = await apiRequest<RegistrationPreview>(
        `/institute-admin/requests/${approvalContext.request.id}/approval-preview`,
        {
          method: 'POST',
          token,
        },
      )
      setPreview(previewData)
      return true
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Failed to fetch registration preview')
      setPreview(null)
      return false
    } finally {
      setPreviewLoading(false)
    }
  }

  const goToPreviewStep = async () => {
    const validationError = validateWizard()
    if (validationError) {
      setWizardError(validationError)
      return
    }

    const loaded = await fetchPreview()
    if (loaded) {
      setWizardStep(3)
    }
  }

  const buildApprovalPayload = () => {
    if (!approvalContext) {
      return null
    }

    const assignments: Array<
      | { subject: string; teacherId: string; batchId: string }
      | { subject: string; teacherId: string; createBatch: { name: string } }
    > = []

    for (const subjectEntry of approvalContext.subjects) {
      const draft = assignmentMap[subjectEntry.subject]
      if (!draft) {
        return null
      }

      if (draft.batchMode === 'existing') {
        assignments.push({
          subject: draft.subject,
          teacherId: draft.teacherId,
          batchId: draft.batchId,
        })
        continue
      }

      const name = useSharedBatchName ? sharedBatchName.trim() : draft.newBatchName.trim()
      assignments.push({
        subject: draft.subject,
        teacherId: draft.teacherId,
        createBatch: {
          name,
        },
      })
    }

    return {
      assignments,
    }
  }

  const handleApprove = async () => {
    if (!token || !approvalContext) return

    const validationError = validateWizard()
    if (validationError) {
      setWizardError(validationError)
      return
    }

    const payload = buildApprovalPayload()
    if (!payload) {
      setWizardError('Approval payload could not be prepared.')
      return
    }

    setActionLoading(true)
    setWizardError(null)
    try {
      const result = await apiRequest<ApprovalResult>(
        `/institute-admin/requests/${approvalContext.request.id}/approve`,
        {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        },
      )

      alert(`Student approved.\nShort ID: ${result.shortId}\nLong ID: ${result.longId}`)
      resetWizard()
      await loadData()
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Approval failed')
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
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{request.fullName}</span>
                          <span className="text-xs muted flex items-center gap-1">
                            <Phone size={10} /> {request.phone}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-white/5 px-2 py-1 rounded border border-white/10">
                            Class {request.classLevel}
                          </span>
                          <span className="bg-white/5 px-2 py-1 rounded border border-white/10">
                            {formatMedium(request.medium)}
                          </span>
                          <span className="bg-white/5 px-2 py-1 rounded border border-white/10">
                            {request.year}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {request.subjects.map((subject) => (
                            <span key={subject} className="subject-pill text-[10px]">
                              {formatSubject(subject)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs muted">
                          {new Date(request.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              void openApprovalWizard(request.id)
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="btn-error-ghost"
                            onClick={() => {
                              void handleDecline(request.id)
                            }}
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

        {wizardOpen ? (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1a1c23] border border-white/10 rounded-2xl p-6 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold">Student Approval Wizard</h3>
                  <p className="text-sm muted">Review the application, assign teachers and batches, then confirm IDs.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={resetWizard} disabled={actionLoading}>
                  Close
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-6 text-xs">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`px-3 py-1 rounded-full border ${
                      wizardStep === step ? 'border-primary text-white bg-primary/20' : 'border-white/10 muted'
                    }`}
                  >
                    Step {step}
                  </span>
                ))}
              </div>

              {wizardLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : !approvalContext ? (
                <div className="text-sm text-error py-4">
                  {wizardError ?? 'Could not load approval details.'}
                </div>
              ) : (
                <div className="space-y-5">
                  {wizardError ? <div className="text-sm text-error">{wizardError}</div> : null}

                  {wizardStep === 1 ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="text-xs muted mb-1">Student Name</div>
                          <div className="font-semibold">{approvalContext.request.fullName}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="text-xs muted mb-1">Phone</div>
                          <div className="font-semibold">{approvalContext.request.phone}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="text-xs muted mb-1">Class</div>
                          <div className="font-semibold">{approvalContext.request.classLevel}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="text-xs muted mb-1">Medium</div>
                          <div className="font-semibold">{formatMedium(approvalContext.request.medium)}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="text-xs muted mb-1">Year</div>
                          <div className="font-semibold">{approvalContext.request.year}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="text-xs muted mb-1">Submitted</div>
                          <div className="font-semibold">
                            {new Date(approvalContext.request.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="text-xs muted mb-2">Requested Subjects</div>
                        <div className="flex flex-wrap gap-2">
                          {approvalContext.request.subjects.map((subject) => (
                            <span key={subject} className="subject-pill text-[11px]">
                              {formatSubject(subject)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="text-xs muted mb-1">Batch Number Rule</div>
                        <p className="text-sm">
                          Batch number is auto-generated from subjects as binary (Physics, Chemistry, Mathematics):
                          selected = 1, not selected = 0.
                        </p>
                        <p className="text-xs muted mt-2">
                          Example: PCM = 111, PC = 110, PM = 101, CM = 011.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={() => setWizardStep(2)}>Next: Teacher & Batch Setup</Button>
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 2 ? (
                    <div className="space-y-4">
                      {approvalContext.subjects.length > 1 ? (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={useSharedBatchName}
                              onChange={(event) => setUseSharedBatchName(event.target.checked)}
                            />
                            Create one shared new batch name for all selected subjects
                          </label>
                          {useSharedBatchName ? (
                            <input
                              type="text"
                              className="mt-3 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-primary outline-none"
                              placeholder="Shared batch name (e.g. JEE-2026-A)"
                              value={sharedBatchName}
                              onChange={(event) => setSharedBatchName(event.target.value)}
                            />
                          ) : null}
                        </div>
                      ) : null}

                      {approvalContext.subjects.map((subjectEntry) => {
                        const draft = assignmentMap[subjectEntry.subject]
                        const selectedTeacher = draft
                          ? subjectEntry.teachers.find((teacher) => teacher.id === draft.teacherId)
                          : undefined
                        const selectedTeacherBatches = selectedTeacher?.batches ?? []
                        const existingBatchAvailable = selectedTeacherBatches.length > 0

                        return (
                          <div key={subjectEntry.subject} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                            <div className="font-semibold">{formatSubject(subjectEntry.subject)}</div>

                            <div className="input-group">
                              <label className="text-xs font-bold uppercase tracking-wider mb-2 block">
                                Teacher
                              </label>
                              <select
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-primary outline-none"
                                value={draft?.teacherId ?? ''}
                                onChange={(event) => handleTeacherChange(subjectEntry.subject, event.target.value)}
                              >
                                <option value="">Select teacher...</option>
                                {subjectEntry.teachers.map((teacher) => (
                                  <option key={teacher.id} value={teacher.id}>
                                    {teacher.user.username} ({formatSubject(teacher.subject)})
                                  </option>
                                ))}
                              </select>
                              {subjectEntry.teachers.length === 0 ? (
                                <p className="text-xs text-error mt-1">
                                  No teacher available for this subject yet.
                                </p>
                              ) : null}
                            </div>

                            {draft?.teacherId ? (
                              <div className="space-y-2">
                                <div className="flex gap-2 text-xs">
                                  <button
                                    type="button"
                                    className={`px-3 py-1 rounded border ${
                                      draft.batchMode === 'existing'
                                        ? 'border-primary bg-primary/20 text-white'
                                        : 'border-white/10 muted'
                                    }`}
                                    onClick={() =>
                                      updateAssignment(subjectEntry.subject, {
                                        batchMode: 'existing',
                                        batchId: selectedTeacherBatches[0]?.id ?? '',
                                      })
                                    }
                                    disabled={!existingBatchAvailable}
                                  >
                                    Use existing batch
                                  </button>
                                  <button
                                    type="button"
                                    className={`px-3 py-1 rounded border ${
                                      draft.batchMode === 'new'
                                        ? 'border-primary bg-primary/20 text-white'
                                        : 'border-white/10 muted'
                                    }`}
                                    onClick={() => updateAssignment(subjectEntry.subject, { batchMode: 'new' })}
                                  >
                                    Create new batch
                                  </button>
                                </div>

                                {draft.batchMode === 'existing' ? (
                                  <select
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-primary outline-none"
                                    value={draft.batchId}
                                    onChange={(event) =>
                                      updateAssignment(subjectEntry.subject, { batchId: event.target.value })
                                    }
                                  >
                                    <option value="">Select available batch...</option>
                                    {selectedTeacherBatches.map((batch) => (
                                      <option key={batch.id} value={batch.id}>
                                        {batch.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : useSharedBatchName ? (
                                  <div className="text-xs muted">
                                    Shared batch name will be used: {sharedBatchName || '(not set)'}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-primary outline-none"
                                    value={draft.newBatchName}
                                    placeholder={`New batch name for ${formatSubject(subjectEntry.subject)}`}
                                    onChange={(event) =>
                                      updateAssignment(subjectEntry.subject, { newBatchName: event.target.value })
                                    }
                                  />
                                )}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}

                      <div className="flex justify-between">
                        <Button variant="secondary" onClick={() => setWizardStep(1)}>
                          Back
                        </Button>
                        <Button onClick={() => void goToPreviewStep()}>
                          Next: Preview Registration IDs
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 3 ? (
                    <div className="space-y-4">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="text-xs muted mb-2">Final Assignment Summary</div>
                        <div className="space-y-2 text-sm">
                          {approvalContext.subjects.map((subjectEntry) => {
                            const draft = assignmentMap[subjectEntry.subject]
                            const teacher = draft
                              ? subjectEntry.teachers.find((option) => option.id === draft.teacherId)
                              : undefined
                            const batchLabel =
                              draft?.batchMode === 'existing'
                                ? teacher?.batches.find((batch) => batch.id === draft.batchId)?.name ?? 'Not selected'
                                : useSharedBatchName
                                  ? sharedBatchName || 'Not set'
                                  : draft?.newBatchName || 'Not set'

                            return (
                              <div key={subjectEntry.subject} className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{formatSubject(subjectEntry.subject)}:</span>
                                <span>{teacher?.user.username ?? 'Not selected'}</span>
                                <span className="muted">| Batch:</span>
                                <span>{batchLabel}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs muted">Registration Number Preview</div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              void fetchPreview()
                            }}
                            disabled={previewLoading}
                          >
                            {previewLoading ? <Loader2 className="animate-spin" size={14} /> : 'Refresh Preview'}
                          </Button>
                        </div>

                        {previewLoading ? (
                          <div className="py-4 flex justify-center">
                            <Loader2 className="animate-spin text-primary" size={24} />
                          </div>
                        ) : preview ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                              <div className="text-xs muted mb-1">Short ID</div>
                              <div className="font-semibold tracking-wide">{preview.shortId}</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                              <div className="text-xs muted mb-1">Long ID</div>
                              <div className="font-semibold break-all">{preview.longId}</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                              <div className="text-xs muted mb-1">Overall Serial</div>
                              <div className="font-semibold">{preview.overallSerial}</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                              <div className="text-xs muted mb-1">Batch Serial</div>
                              <div className="font-semibold">
                                {preview.batchSerialNo} (Batch {preview.batchNo})
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm muted">Preview not available yet.</p>
                        )}
                      </div>

                      <div className="flex justify-between">
                        <Button variant="secondary" onClick={() => setWizardStep(2)} disabled={actionLoading}>
                          Back
                        </Button>
                        <Button onClick={() => void handleApprove()} disabled={actionLoading || previewLoading}>
                          {actionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Approval'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </motion.div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
