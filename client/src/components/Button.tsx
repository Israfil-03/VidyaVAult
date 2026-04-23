import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => (
  <button
    className={`btn ${variant === 'secondary' ? 'btn-secondary' : 'btn-primary'} ${className}`}
    {...props}
  />
)
