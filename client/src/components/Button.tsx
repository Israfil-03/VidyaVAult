import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={`btn ${
      variant === 'secondary' ? 'btn-secondary' : variant === 'ghost' ? 'btn-ghost' : 'btn-primary'
    } ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
    disabled={disabled || isLoading}
    {...props}
  >
    {isLoading ? <span className="btn-spinner" aria-hidden="true" /> : null}
    <span>{children}</span>
  </button>
)
