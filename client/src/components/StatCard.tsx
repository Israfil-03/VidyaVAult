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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {icon ? (
          <div 
            className="stat-icon-wrapper" 
            style={{ 
              background: tones[tone], 
              color: 'white',
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)',
              flexShrink: 0
            }}
          >
            {icon}
          </div>
        ) : null}
        <div>
          <p className="stat-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{label}</p>
          <p className="stat-value" style={{ margin: '4px 0', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</p>
          {trend && (
            <p className="stat-trend" style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}>{trend}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
