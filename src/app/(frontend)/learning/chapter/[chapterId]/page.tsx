import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getLessonImageUrl } from '@/lib/lesson-image'
import {
  chapterLessons,
  chapterSections,
  nextUndoneLesson,
  publishedLessons,
} from '@/lib/hierarchy-progress'
import { paginate, parsePage } from '@/lib/pagination'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import type { Lesson } from '@/payload-types'

type Props = {
  params: Promise<{ chapterId: string }>
  searchParams: Promise<{ page?: string }>
}

function LessonList({
  lessons,
  progressByLesson,
}: {
  lessons: Lesson[]
  progressByLesson: Map<string, { status?: string | null }>
}) {
  return (
    <ul className="list learning-nav-list">
      {lessons.map((lesson) => {
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
  )
}

export default async function ChapterLearningPage({ params, searchParams }: Props) {
  const { chapterId } = await params
  const { page: pageParam } = await searchParams
  const { payload, user } = await requireUser()

  let chapter
  try {
    chapter = await payload.findByID({
      collection: 'chapters',
      id: chapterId,
      depth: 3,
    })
  } catch {
    notFound()
  }

  if (!chapter.published) notFound()

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

  const sections = chapterSections(chapter)
  const showSections = sections.length > 0
  const lessons = showSections ? [] : chapterLessons(chapter)
  const page = parsePage(pageParam)

  const sectionSlice = showSections ? paginate(sections, page) : null
  const lessonSlice = !showSections ? paginate(lessons, page) : null

  return (
    <div className="shell stack">
      <header>
        <p className="muted">
          <Link href="/learning">← Learning</Link>
        </p>
        <h1 className="section-title">{chapter.title}</h1>
        {chapter.description ? <p className="lede muted">{chapter.description}</p> : null}
      </header>

      <section className="panel" aria-labelledby="chapter-content-heading">
        <h2 id="chapter-content-heading" className="section-title" style={{ fontSize: '1.5rem' }}>
          {showSections ? 'Sections' : 'Lessons'}
        </h2>

        {showSections && sectionSlice ? (
          sectionSlice.total === 0 ? (
            <p className="muted" style={{ marginTop: '1rem' }}>
              No sections in this chapter yet.
            </p>
          ) : (
            <>
              <ul className="list learning-nav-list">
                {sectionSlice.items.map((section) => {
                  const sectionLessons = publishedLessons(section)
                  const next = nextUndoneLesson(sectionLessons, progressByLesson)
                  const done = sectionLessons.filter(
                    (lesson) => progressByLesson.get(String(lesson.id))?.status === 'completed',
                  ).length

                  const drillHref = `/learning/section/${section.id}?chapter=${chapter.id}`

                  return (
                    <li key={section.id} className="learning-nav-row">
                      <Link className="learning-nav-copy" href={drillHref}>
                        <strong>{section.title}</strong>
                        <div className="muted">
                          {sectionLessons.length} lesson
                          {sectionLessons.length === 1 ? '' : 's'}
                          {sectionLessons.length > 0
                            ? ` · ${done}/${sectionLessons.length} done`
                            : null}
                        </div>
                      </Link>
                      <div className="learning-nav-actions">
                        {next || sectionLessons.length === 0 ? (
                          <Button href={drillHref} variant="primary">
                            Continue →
                          </Button>
                        ) : (
                          <span className="badge badge-ok">✓ Complete</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Pagination
                slice={sectionSlice}
                hrefForPage={(p) =>
                  p <= 1
                    ? `/learning/chapter/${chapter.id}`
                    : `/learning/chapter/${chapter.id}?page=${p}`
                }
                label="sections"
              />
            </>
          )
        ) : null}

        {!showSections && lessonSlice ? (
          lessonSlice.total === 0 ? (
            <p className="muted" style={{ marginTop: '1rem' }}>
              No lessons in this chapter yet.
            </p>
          ) : (
            <>
              <LessonList lessons={lessonSlice.items} progressByLesson={progressByLesson} />
              <Pagination
                slice={lessonSlice}
                hrefForPage={(p) =>
                  p <= 1
                    ? `/learning/chapter/${chapter.id}`
                    : `/learning/chapter/${chapter.id}?page=${p}`
                }
                label="lessons"
              />
            </>
          )
        ) : null}
      </section>
    </div>
  )
}
