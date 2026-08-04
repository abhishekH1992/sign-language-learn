import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'secondary'
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  children,
  href,
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: Props) {
  const classes = `btn btn-${variant} ${className}`.trim()

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} type={type} {...rest}>
      {children}
    </button>
  )
}
