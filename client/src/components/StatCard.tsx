import type { ReactNode } from 'react'

import { Card } from './Card'

interface StatCardProps {
  label: string
  value: number | string
  trend?: string
  tone?: 'primary' | 'success' | 'warning'
  icon?: ReactNode
}

export const StatCard = ({ label, value, trend, tone = 'primary', icon }: StatCardProps) => (
  <Card className={`stat-card stat-${tone}`}>
    <div className="stat-header">
      <p className="stat-label">{label}</p>
      {icon ? <span className="stat-icon">{icon}</span> : null}
    </div>
    <p className="stat-value">{value}</p>
    {trend ? <p className="stat-trend">{trend}</p> : <p className="stat-trend muted">No change data yet</p>}
  </Card>
)
