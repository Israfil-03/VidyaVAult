import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  actions?: ReactNode
}

export const Card = ({ title, children, actions }: CardProps) => (
  <section className="card">
    {(title || actions) && (
      <header className="card-header">
        {title ? <h3>{title}</h3> : <span />}
        {actions}
      </header>
    )}
    {children}
  </section>
)
