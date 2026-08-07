import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getLessonImageUrl } from '@/lib/lesson-image'
import {
  computeHierarchyProgress,
  getInProgressChapters,
  hasAnyProgress,
} from '@/lib/hierarchy-progress'
import { ProgressStatCards } from '@/components/ui/ProgressStatCards'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import type { Lesson } from '@/payload-types'

const UPCOMING_LIMIT = 3

export default async function DashboardPage() {
  const { payload, user } = await requireUser()

  const [chapters, progress, notifications] = await Promise.all([
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
    payload.find({
      collection: 'notifications',
      where: { user: { equals: user.id } },
      limit: 8,
      sort: '-createdAt',
    }),
  ])

  const progressByLesson = new Map(
    progress.docs.map((item) => [
      String(typeof item.lesson === 'object' ? item.lesson.id : item.lesson),
      item,
    ]),
  )

  const learnerHasProgress = hasAnyProgress(progressByLesson)
  const hierarchyProgress = computeHierarchyProgress(chapters.docs, progressByLesson)
  const inProgressChapters = learnerHasProgress
    ? getInProgressChapters(chapters.docs, progressByLesson)
    : []

  const publishedLessons: Lesson[] = []
  for (const chapter of chapters.docs) {
    for (const row of chapter.sections || []) {
      const section = typeof row.section === 'object' ? row.section : null
      if (!section || typeof section !== 'object') continue
      for (const lessonRow of section.lessons || []) {
        const lesson = typeof lessonRow.lesson === 'object' ? (lessonRow.lesson as Lesson) : null
        if (lesson?.published) publishedLessons.push(lesson)
      }
    }
  }

  const remaining = publishedLessons.filter(
    (lesson) => progressByLesson.get(String(lesson.id))?.status !== 'completed',
  )
  const upcoming = remaining.slice(0, UPCOMING_LIMIT)
  const showBrowseAll = remaining.length > UPCOMING_LIMIT

  return (
    <div className="shell stack">
      <header>
        <h1 className="section-title">
          Kia ora{user && 'name' in user && user.name ? `, ${user.name}` : ''}
        </h1>
        <p className="lede muted">See your progress, upcoming lessons, and notifications.</p>
      </header>

      {learnerHasProgress ? (
        <section className="panel" aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="section-title" style={{ fontSize: '1.5rem' }}>
            Progress
          </h2>
          <ProgressStatCards progress={hierarchyProgress} />
        </section>
      ) : null}

      {inProgressChapters.length > 0 ? (
        <section className="panel" aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="section-title" style={{ fontSize: '1.5rem' }}>
            Continue learning
          </h2>
          <p className="muted" style={{ marginTop: '0.35rem' }}>
            Chapters you have started and still need to finish.
          </p>
          <ul className="list continue-chapter-list">
            {inProgressChapters.map((chapter) => (
              <li key={chapter.id} className="continue-chapter-card">
                <div className="continue-chapter-main">
                  <div>
                    <strong className="continue-chapter-title">{chapter.title}</strong>
                    {chapter.description ? (
                      <p className="muted continue-chapter-desc">{chapter.description}</p>
                    ) : null}
                  </div>
                  <Button href={`/learning/${chapter.nextLessonId}`} variant="primary">
                    Continue →
                  </Button>
                </div>
                <ProgressBar
                  value={chapter.done}
                  max={chapter.total}
                  label="Lessons completed"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="section-title" style={{ fontSize: '1.5rem' }}>
          Upcoming learning
        </h2>
        {upcoming.length === 0 ? (
          <p className="muted">You have completed every published lesson. Ka pai!</p>
        ) : (
          <ul className="list upcoming-list">
            {upcoming.map((lesson) => {
              const imageSrc = getLessonImageUrl(lesson.image, '/placeholder-sign.svg')
              const isLetter =
                lesson.wordClass === 'letter' ||
                (lesson.name.length === 1 && /[A-Za-z]/.test(lesson.name))
              const subtitleParts = [
                lesson.maoriName ? `Māori: ${lesson.maoriName}` : null,
                lesson.secondaryName ? `Also: ${lesson.secondaryName}` : null,
                isLetter ? `Letter ${lesson.name.toUpperCase()} · fingerspelling` : null,
                !isLetter && lesson.wordClass ? lesson.wordClass : null,
              ].filter(Boolean)

              return (
                <li key={lesson.id}>
                  <Link className="lesson-row upcoming-card" href={`/learning/${lesson.id}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc} alt="" width={88} height={66} />
                    <div>
                      <strong>{lesson.name}</strong>
                      <div className="muted">
                        {subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'Continue this lesson'}
                      </div>
                    </div>
                    <span className="badge badge-neutral">Continue →</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {showBrowseAll ? (
          <div style={{ marginTop: '1rem' }}>
            <Button href="/learning" variant="secondary">
              Browse all lessons
            </Button>
          </div>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="notifications-heading">
        <h2 id="notifications-heading" className="section-title" style={{ fontSize: '1.5rem' }}>
          Notifications
        </h2>
        {notifications.docs.length === 0 ? (
          <p className="muted">No notifications yet. Complete a quiz to get feedback updates here.</p>
        ) : (
          <ul className="list">
            {notifications.docs.map((note) => (
              <li key={note.id}>
                <strong>{note.title}</strong>
                <div className="muted">{note.body}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
