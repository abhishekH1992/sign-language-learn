'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type Props = {
  email?: string | null
}

export function SiteHeader({ email }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
    router.refresh()
  }

  const item = (href: string, label: string) => (
    <Link href={href} aria-current={pathname.startsWith(href) ? 'page' : undefined}>
      {label}
    </Link>
  )

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Link className="brand" href={email ? '/dashboard' : '/'}>
        Learn
      </Link>
      <nav className="nav" aria-label="Primary">
        {email ? (
          <>
            {item('/dashboard', 'Dashboard')}
            {item('/learning', 'Learning')}
            {item('/settings', 'Settings')}
            <span className="muted" style={{ paddingInline: '0.5rem' }}>
              {email}
            </span>
            <button className="linkish" type="button" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            {item('/login', 'Sign in')}
            {item('/register', 'Create account')}
          </>
        )}
      </nav>
    </header>
  )
}
