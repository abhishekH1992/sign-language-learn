import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  const { user } = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <div className="hero-auth">
      <section className="auth-panel" aria-labelledby="login-title">
        <h1 id="login-title">Learn</h1>
        <p className="lede">Sign in to continue your learning journey.</p>
        <LoginForm />
        <p className="muted" style={{ marginTop: '1.25rem' }}>
          New here? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </div>
  )
}
