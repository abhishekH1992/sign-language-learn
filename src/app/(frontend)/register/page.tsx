import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { RegisterForm } from './RegisterForm'

export default async function RegisterPage() {
  const { user } = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <div className="hero-auth">
      <section className="auth-panel" aria-labelledby="register-title">
        <h1 id="register-title">NZSL Learn</h1>
        <p className="lede">Create your learner account to track progress and retake quizzes freely.</p>
        <RegisterForm />
        <p className="muted" style={{ marginTop: '1.25rem' }}>
          Already learning? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </div>
  )
}
