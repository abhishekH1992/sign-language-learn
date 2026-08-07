import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getLessonImageUrl } from '@/lib/lesson-image'
import type { Lesson, Section } from '@/payload-types'

export default async function LearningPage() {
  const { payload, user } = await requireUser()

  const [chapters, progress] = await Promise.all([
    payload.find({
      collection: 'chapters',
      where: { published: { equals: true } },
      sort: 'sortOrder',
      limit: 50,
      depth: 3,
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
        <p className="lede muted">Chapters, sections, and lessons. Each lesson has video, practice, and a quiz.</p>
      </header>

      {chapters.docs.map((chapter) => {
        const sectionRows = chapter.sections || []

        return (
          <section key={chapter.id} className="panel" aria-labelledby={`chapter-${chapter.id}`}>
            <h2 id={`chapter-${chapter.id}`} className="section-title" style={{ fontSize: '1.6rem' }}>
              {chapter.title}
            </h2>
            {chapter.description ? <p className="muted">{chapter.description}</p> : null}

            {sectionRows.length === 0 ? (
              <p className="muted" style={{ marginTop: '1rem' }}>
                No sections in this chapter yet.
              </p>
            ) : (
              sectionRows.map((row, index) => {
                const section = typeof row.section === 'object' ? (row.section as Section) : null
                if (!section) return null

                const lessons = (section.lessons || [])
                  .map((lessonRow) =>
                    typeof lessonRow.lesson === 'object' ? (lessonRow.lesson as Lesson) : null,
                  )
                  .filter((lesson): lesson is Lesson => Boolean(lesson?.published))

                return (
                  <div key={section.id || index} style={{ marginTop: '1.25rem' }}>
                    <h3 className="section-title" style={{ fontSize: '1.2rem' }}>
                      {section.title}
                    </h3>
                    <ul className="list" style={{ marginTop: '0.75rem' }}>
                      {lessons.map((lesson) => {
                        const state = progressByLesson.get(lesson.id)
                        const done = state?.status === 'completed'
                        return (
                          <li key={lesson.id}>
                            <Link className="lesson-row" href={`/learning/${lesson.id}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getLessonImageUrl(lesson.image, '/placeholder-sign.svg')}
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
                  </div>
                )
              })
            )}
          </section>
        )
      })}
    </div>
  )
}
