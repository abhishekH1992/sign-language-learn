import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getLessonImageUrl } from '@/lib/lesson-image'
import { publishedLessons } from '@/lib/hierarchy-progress'
import { paginate, parsePage } from '@/lib/pagination'
import { Pagination } from '@/components/ui/Pagination'

type Props = {
  params: Promise<{ sectionId: string }>
  searchParams: Promise<{ page?: string; chapter?: string }>
}

export default async function SectionLearningPage({ params, searchParams }: Props) {
  const { sectionId } = await params
  const { page: pageParam, chapter: chapterParam } = await searchParams
  const { payload, user } = await requireUser()

  let section
  try {
    section = await payload.findByID({
      collection: 'sections',
      id: sectionId,
      depth: 2,
    })
  } catch {
    notFound()
  }

  const progress = await payload.find({
    collection: 'lesson-progress',
    where: { user: { equals: user.id } },
    limit: 500,
    depth: 0,
  })

  const progressByLesson = new Map(
    progress.docs.map((item) => [
      String(typeof item.lesson === 'object' ? item.lesson.id : item.lesson),
      item,
    ]),
  )

  const lessons = publishedLessons(section)
  const slice = paginate(lessons, parsePage(pageParam))
  const backHref = chapterParam
    ? `/learning/chapter/${chapterParam}`
    : '/learning'

  return (
    <div className="shell stack">
      <header>
        <p className="muted">
          <Link href="/learning">Learning</Link>
          {chapterParam ? (
            <>
              {' · '}
              <Link href={`/learning/chapter/${chapterParam}`}>Chapter</Link>
            </>
          ) : null}
          {' · '}
          <Link href={backHref}>← Back</Link>
        </p>
        <h1 className="section-title">{section.title}</h1>
        <p className="lede muted">Lessons in this section.</p>
      </header>

      <section className="panel" aria-labelledby="lessons-heading">
        <h2 id="lessons-heading" className="section-title" style={{ fontSize: '1.5rem' }}>
          Lessons
        </h2>

        {slice.total === 0 ? (
          <p className="muted" style={{ marginTop: '1rem' }}>
            No published lessons in this section yet.
          </p>
        ) : (
          <>
            <ul className="list learning-nav-list">
              {slice.items.map((lesson) => {
                const done = progressByLesson.get(String(lesson.id))?.status === 'completed'
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
            <Pagination
              slice={slice}
              hrefForPage={(p) => {
                const base = `/learning/section/${section.id}`
                const chapterQs = chapterParam ? `chapter=${chapterParam}` : ''
                if (p <= 1) return chapterQs ? `${base}?${chapterQs}` : base
                return chapterQs
                  ? `${base}?${chapterQs}&page=${p}`
                  : `${base}?page=${p}`
              }}
              label="lessons"
            />
          </>
        )}
      </section>
    </div>
  )
}
