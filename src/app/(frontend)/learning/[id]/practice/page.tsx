import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getLessonImageUrl } from '@/lib/lesson-image'
import { getLessonNav } from '@/lib/lesson-nav'
import { PracticeClient } from './PracticeClient'

type Props = { params: Promise<{ id: string }> }

export default async function PracticePage({ params }: Props) {
  const { id } = await params
  const { payload, user } = await requireUser()

  let lesson
  try {
    lesson = await payload.findByID({ collection: 'lessons', id, depth: 1 })
  } catch {
    notFound()
  }

  const [nav, progress] = await Promise.all([
    getLessonNav(payload, lesson.id),
    payload.find({
      collection: 'lesson-progress',
      where: {
        and: [{ user: { equals: user!.id } }, { lesson: { equals: lesson.id } }],
      },
      limit: 1,
      depth: 0,
    }),
  ])

  const pastScore = progress.docs[0]?.bestPracticeScore
  const pastScoreValue =
    typeof pastScore === 'number' && pastScore > 0 ? pastScore : null

  return (
    <div className="shell stack">
      <div className="btn-row" style={{ justifyContent: 'space-between' }}>
        <Link href={nav.lessonsListHref}>← Lessons</Link>
        <Link href={`/feedback?lesson=${lesson.id}`}>Give feedback</Link>
      </div>
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
          lessonsListHref={nav.lessonsListHref}
          nextLessonHref={nav.nextLessonHref}
          pastScore={pastScoreValue}
        />
      </section>
    </div>
  )
}
