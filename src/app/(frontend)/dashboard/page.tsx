import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getLessonImageUrl } from '@/lib/lesson-image'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'

const UPCOMING_LIMIT = 3

export default async function DashboardPage() {
  const { payload, user } = await requireUser()

  const [lessons, progress, notifications] = await Promise.all([
    payload.find({
      collection: 'lessons',
      where: { published: { equals: true } },
      limit: 200,
      sort: 'sortOrder',
      depth: 1,
    }),
    payload.find({
      collection: 'lesson-progress',
      where: { user: { equals: user.id } },
      limit: 200,
      depth: 1,
    }),
    payload.find({
      collection: 'notifications',
      where: { user: { equals: user.id } },
      limit: 8,
      sort: '-createdAt',
    }),
  ])

  const completed = progress.docs.filter((item) => item.status === 'completed').length
  const progressByLesson = new Map(
    progress.docs.map((item) => [typeof item.lesson === 'object' ? item.lesson.id : item.lesson, item]),
  )

  const remaining = lessons.docs.filter(
    (lesson) => progressByLesson.get(lesson.id)?.status !== 'completed',
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

      <section className="panel" aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="section-title" style={{ fontSize: '1.5rem' }}>
          Progress
        </h2>
        <ProgressBar value={completed} max={lessons.totalDocs || 1} label="Lessons completed" />
      </section>

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
