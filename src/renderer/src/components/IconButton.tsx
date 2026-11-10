import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  children: ReactNode
}

/** 22px icon button with a hover tint; every instance carries an accessible label. */
export function IconButton({ label, active = false, children, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}
