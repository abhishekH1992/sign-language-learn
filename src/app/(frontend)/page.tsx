import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Button } from '@/components/ui/Button'

export default async function HomePage() {
  const { user } = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <div className="hero-auth">
      <section className="auth-panel" aria-labelledby="home-title">
        <p className="badge badge-ok">Handshape practice</p>
        <h1 id="home-title">Learn</h1>
        <p className="lede">
          Watch lesson videos, practise handshapes with camera feedback, and retake quizzes anytime —
          with clear visual guidance.
        </p>
        <div className="btn-row">
          <Button href="/register">Create account</Button>
          <Button href="/login" variant="secondary">
            Sign in
          </Button>
        </div>
      </section>
    </div>
  )
}
