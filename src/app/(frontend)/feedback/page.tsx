import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { FeedbackForm } from '@/components/FeedbackForm'

type Props = {
  searchParams: Promise<{ lesson?: string }>
}

export default async function FeedbackPage({ searchParams }: Props) {
  const { lesson: lessonParam } = await searchParams
  const { payload } = await requireUser()

  let lessonId: string | null = null
  let lessonName: string | null = null
  let cancelHref = '/dashboard'

  if (lessonParam) {
    try {
      const lesson = await payload.findByID({
        collection: 'lessons',
        id: lessonParam,
        depth: 0,
      })
      if (lesson?.published) {
        lessonId = String(lesson.id)
        lessonName = lesson.name
        cancelHref = `/learning/${lesson.id}`
      }
    } catch {
      // Treat as general feedback if lesson is missing.
    }
  }

  return (
    <div className="shell stack">
      <p className="muted">
        <Link href={cancelHref}>← Back</Link>
      </p>
      <header>
        <h1 className="section-title">
          {lessonName ? 'Lesson feedback' : 'Feedback'}
        </h1>
        <p className="lede muted">
          We are gathering feedback from the community to improve this learning experience. Share
          what helps, what is confusing, and what you would like next.
        </p>
      </header>

      <section className="panel" aria-labelledby="feedback-form-heading">
        <h2 id="feedback-form-heading" className="sr-only">
          Feedback form
        </h2>
        <FeedbackForm
          lessonId={lessonId}
          lessonName={lessonName}
          cancelHref={cancelHref}
        />
      </section>
    </div>
  )
}
