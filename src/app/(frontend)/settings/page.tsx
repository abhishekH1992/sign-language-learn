import { requireUser } from '@/lib/auth'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const { user } = await requireUser()

  return (
    <div className="shell stack">
      <header>
        <h1 className="section-title">Settings</h1>
        <p className="lede muted">Update your profile and password.</p>
      </header>
      <section className="panel" style={{ maxWidth: 560 }}>
        <SettingsForm
          initialName={'name' in user && user.name ? String(user.name) : ''}
          email={'email' in user ? String(user.email) : ''}
          avatarUrl={'avatarUrl' in user && user.avatarUrl ? String(user.avatarUrl) : ''}
        />
      </section>
    </div>
  )
}
