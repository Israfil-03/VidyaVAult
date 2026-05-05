import type { ReactNode } from 'react'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: number | string
  trend?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger'
  icon?: ReactNode
}

export const StatCard = ({ label, value, trend, tone = 'primary', icon }: StatCardProps) => {
  const tones = {
    primary: 'var(--grad-primary)',
    success: 'var(--grad-success)',
    warning: 'var(--grad-warning)',
    danger: 'var(--grad-danger)',
  }

  return (
    <Card className={`stat-card stat-${tone}`} tilt variant="glass">
      <div className="stat-header">
        <p className="stat-label">{label}</p>
        {icon ? (
          <span 
            className="stat-icon" 
            style={{ 
              background: tones[tone], 
              color: 'white',
              padding: '8px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="stat-value">{value}</p>
      {trend ? (
        <p className="stat-trend" style={{ fontWeight: 600 }}>{trend}</p>
      ) : (
        <p className="stat-trend muted">No change data yet</p>
      )}
    </Card>
  )
}
