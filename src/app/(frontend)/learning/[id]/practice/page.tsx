import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getLessonImageUrl } from '@/lib/lesson-image'
import { PracticeClient } from './PracticeClient'

type Props = { params: Promise<{ id: string }> }

export default async function PracticePage({ params }: Props) {
  const { id } = await params
  const { payload } = await requireUser()

  let lesson
  try {
    lesson = await payload.findByID({ collection: 'lessons', id, depth: 1 })
  } catch {
    notFound()
  }

  return (
    <div className="shell stack">
      <p>
        <Link href={`/learning/${lesson.id}`}>← {lesson.name}</Link>
      </p>
      <header>
        <h1 className="section-title">Practice: {lesson.name}</h1>
        <p className="lede muted">
          Allow camera access to practise the handshape. Feedback is text and on-screen status — never
          sound-only.
        </p>
      </header>
      <section className="panel">
        <PracticeClient
          lessonId={String(lesson.id)}
          lessonName={lesson.name}
          maoriName={lesson.maoriName || ''}
          imageUrl={getLessonImageUrl(lesson.image)}
        />
      </section>
    </div>
  )
}
