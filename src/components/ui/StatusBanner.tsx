import type { ReactNode } from 'react'

type Props = {
  tone?: 'ok' | 'warn' | 'error' | 'neutral'
  title: string
  children?: ReactNode
}

export function StatusBanner({ tone = 'neutral', title, children }: Props) {
  const icon = tone === 'ok' ? '✓' : tone === 'error' ? '!' : 'i'

  return (
    <div className="status-banner" data-tone={tone === 'neutral' ? undefined : tone} role="status">
      <span className="badge badge-neutral" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{title}</strong>
        {children ? <div className="muted">{children}</div> : null}
      </div>
    </div>
  )
}
