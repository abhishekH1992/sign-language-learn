'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { StatusBanner } from '@/components/ui/StatusBanner'

type Props = {
  initialName: string
  email: string
  avatarUrl: string
}

export function SettingsForm({ initialName, email, avatarUrl }: Props) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    const confirm = String(form.get('confirm') || '')

    if (password && password !== confirm) {
      setError('New passwords do not match.')
      setPending(false)
      return
    }

    const body: Record<string, string> = {
      name: String(form.get('name') || ''),
      avatarUrl: String(form.get('avatarUrl') || ''),
    }
    if (password) body.password = password

    try {
      const me = await fetch('/api/users/me', { credentials: 'include' })
      const meData = (await me.json()) as { user?: { id: string | number } }
      if (!meData.user?.id) {
        setError('Session expired. Sign in again.')
        setPending(false)
        return
      }

      const res = await fetch(`/api/users/${meData.user.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        setError('Could not save settings.')
        setPending(false)
        return
      }

      setMessage('Settings saved.')
      router.refresh()
    } catch {
      setError('Could not save settings.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" defaultValue={initialName} required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" defaultValue={email} disabled aria-describedby="email-help" />
        <p id="email-help" className="muted">
          Email is your sign-in identity for this account.
        </p>
      </div>
      <div className="field">
        <label htmlFor="avatarUrl">Avatar URL</label>
        <input id="avatarUrl" name="avatarUrl" defaultValue={avatarUrl} type="url" />
      </div>
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={8}
        />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm new password</label>
        <input
          id="confirm"
          name="confirm"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={8}
        />
      </div>
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />{' '}
          Show password
        </label>
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <StatusBanner tone="ok" title={message} /> : null}
      <div className="btn-row">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Button href="/dashboard" variant="secondary">
          Back to dashboard
        </Button>
      </div>
    </form>
  )
}
