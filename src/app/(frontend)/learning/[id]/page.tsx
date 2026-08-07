import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { LessonActions } from './LessonActions'

type Props = { params: Promise<{ id: string }> }

export default async function LessonPage({ params }: Props) {
  const { id } = await params
  const { payload, user } = await requireUser()

  let lesson
  try {
    lesson = await payload.findByID({
      collection: 'lessons',
      id,
      depth: 1,
    })
  } catch {
    notFound()
  }

  if (!lesson?.published) notFound()

  const quizzes = await payload.find({
    collection: 'quizzes',
    where: { lesson: { equals: lesson.id } },
    limit: 1,
  })
  const quiz = quizzes.docs[0]

  return (
    <div className="shell stack">
      <p>
        <Link href="/learning">← Learning</Link>
      </p>
      <header>
        <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
          <span className="badge badge-neutral">{lesson.wordClass || 'sign'}</span>
        </div>
        <h1 className="section-title">{lesson.name}</h1>
        <p className="lede muted">
          {lesson.maoriName || '—'}
          {lesson.secondaryName ? ` · also: ${lesson.secondaryName}` : ''}
        </p>
      </header>

      <section className="panel" aria-labelledby="video-heading">
        <h2 id="video-heading" className="sr-only">
          Lesson video
        </h2>
        <LessonActions
          lessonId={String(lesson.id)}
          videoUrl={lesson.videoUrl}
          title={`NZSL sign: ${lesson.name}`}
        />
        {lesson.instructions ? (
          <p className="muted" style={{ marginTop: '1rem' }}>
            {lesson.instructions}
          </p>
        ) : null}
        <div className="btn-row" style={{ marginTop: '1.25rem' }}>
          <Button href={`/learning/${lesson.id}/practice`}>Start practice</Button>
          {quiz ? (
            <Button href={`/learning/${lesson.id}/quiz`} variant="secondary">
              Take quiz
            </Button>
          ) : null}
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          Signed in as {user && 'email' in user ? user.email : 'learner'}. .
        </p>
      </section>
    </div>
  )
}
