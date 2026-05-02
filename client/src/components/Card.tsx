import type { ReactNode } from 'react'

import { motion, useReducedMotion } from 'framer-motion'

interface CardProps {
  title?: string
  children: ReactNode
  actions?: ReactNode
  subtitle?: string
  className?: string
}

export const Card = ({ title, children, actions, subtitle, className = '' }: CardProps) => {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      className={`card ${className}`.trim()}
      initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.24, ease: 'easeOut' }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
    >
      {(title || actions || subtitle) && (
        <header className="card-header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      )}
      {children}
    </motion.section>
  )
}
