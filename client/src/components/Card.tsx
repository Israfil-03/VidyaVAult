import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface CardProps {
  title?: string
  children: ReactNode
  actions?: ReactNode
  subtitle?: string
  className?: string
  variant?: 'default' | 'glass' | 'elevated' | 'gradient' | 'outline'
  tilt?: boolean
}

export const Card = ({
  title,
  children,
  actions,
  subtitle,
  className = '',
  variant = 'default',
  tilt = false,
}: CardProps) => {
  const reduceMotion = useReducedMotion()

  const variants = {
    default: '',
    glass: 'glass-card',
    elevated: 'elevated-card',
    gradient: 'gradient-card',
    outline: 'outline-card',
  }

  const motionProps = tilt && !reduceMotion
    ? {
        whileHover: {
          rotateY: 5,
          rotateX: -5,
          scale: 1.02,
          translateZ: 20,
        },
        transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
      }
    : {
        whileHover: reduceMotion ? undefined : { y: -4 },
        transition: { duration: 0.24, ease: 'easeOut' as const },
      }

  return (
    <motion.section
      className={`card ${variants[variant]} ${tilt ? 'tilt-card' : ''} ${className}`.trim()}
      initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      {...motionProps}
    >
      {(title || actions || subtitle) && (
        <header className="card-header">
          <div style={{ transform: tilt ? 'translateZ(30px)' : 'none' }}>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          <div style={{ transform: tilt ? 'translateZ(40px)' : 'none' }}>
            {actions}
          </div>
        </header>
      )}
      <div style={{ transform: tilt ? 'translateZ(20px)' : 'none' }}>
        {children}
      </div>
    </motion.section>
  )
}
