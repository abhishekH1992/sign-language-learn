import Link from 'next/link'
import { requireUser } from '@/lib/auth'

export default async function LearningPage() {
  const { payload, user } = await requireUser()

  const [chapters, lessons, progress] = await Promise.all([
    payload.find({
      collection: 'chapters',
      where: { published: { equals: true } },
      sort: 'sortOrder',
      limit: 50,
    }),
    payload.find({
      collection: 'lessons',
      where: { published: { equals: true } },
      sort: 'sortOrder',
      limit: 200,
      depth: 1,
    }),
    payload.find({
      collection: 'lesson-progress',
      where: { user: { equals: user.id } },
      limit: 200,
      depth: 0,
    }),
  ])

  const progressByLesson = new Map(
    progress.docs.map((item) => [typeof item.lesson === 'object' ? item.lesson.id : item.lesson, item]),
  )

  return (
    <div className="shell stack">
      <header>
        <h1 className="section-title">Learning</h1>
        <p className="lede muted">Chapters and lessons. Each lesson has video, practice, and a quiz.</p>
      </header>

      {chapters.docs.map((chapter) => {
        const chapterLessons = lessons.docs.filter((lesson) => {
          const chapterId = typeof lesson.chapter === 'object' ? lesson.chapter.id : lesson.chapter
          return chapterId === chapter.id
        })

        return (
          <section key={chapter.id} className="panel" aria-labelledby={`chapter-${chapter.id}`}>
            <h2 id={`chapter-${chapter.id}`} className="section-title" style={{ fontSize: '1.6rem' }}>
              {chapter.title}
            </h2>
            {chapter.description ? <p className="muted">{chapter.description}</p> : null}
            <ul className="list" style={{ marginTop: '1rem' }}>
              {chapterLessons.map((lesson) => {
                const state = progressByLesson.get(lesson.id)
                const done = state?.status === 'completed'
                return (
                  <li key={lesson.id}>
                    <Link className="lesson-row" href={`/learning/${lesson.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lesson.drawingUrl || '/placeholder-sign.svg'}
                        alt=""
                        width={88}
                        height={66}
                      />
                      <div>
                        <strong>{lesson.name}</strong>
                        <div className="muted">
                          {lesson.maoriName || '—'} · {lesson.wordClass || 'sign'}
                        </div>
                      </div>
                      <span className={`badge ${done ? 'badge-ok' : 'badge-neutral'}`}>
                        {done ? '✓ Completed' : 'Continue →'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
