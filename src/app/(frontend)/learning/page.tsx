import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import {
  chapterLessons,
  chapterSections,
  nextUndoneLesson,
} from '@/lib/hierarchy-progress'
import { paginate, parsePage } from '@/lib/pagination'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'

type Props = {
  searchParams: Promise<{ page?: string }>
}

export default async function LearningPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams
  const { payload, user } = await requireUser()

  const [chapters, progress] = await Promise.all([
    payload.find({
      collection: 'chapters',
      where: { published: { equals: true } },
      sort: 'sortOrder',
      limit: 200,
      depth: 3,
    }),
    payload.find({
      collection: 'lesson-progress',
      where: { user: { equals: user!.id } },
      limit: 500,
      depth: 0,
    }),
  ])

  const progressByLesson = new Map(
    progress.docs.map((item) => [
      String(typeof item.lesson === 'object' ? item.lesson.id : item.lesson),
      item,
    ]),
  )

  const slice = paginate(chapters.docs, parsePage(pageParam))

  return (
    <div className="shell stack">
      <header>
        <h1 className="section-title">Learning</h1>
        <p className="lede muted">Choose a chapter to browse sections and lessons.</p>
      </header>

      <section className="panel" aria-labelledby="chapters-heading">
        <h2 id="chapters-heading" className="section-title" style={{ fontSize: '1.5rem' }}>
          Chapters
        </h2>

        {slice.total === 0 ? (
          <p className="muted" style={{ marginTop: '1rem' }}>
            No published chapters yet.
          </p>
        ) : (
          <>
            <ul className="list learning-nav-list">
              {slice.items.map((chapter) => {
                const lessons = chapterLessons(chapter)
                const sections = chapterSections(chapter)
                const next = nextUndoneLesson(lessons, progressByLesson)
                const done = lessons.filter(
                  (lesson) => progressByLesson.get(String(lesson.id))?.status === 'completed',
                ).length
                // Drill into sections, or lessons when the chapter has no sections.
                const drillHref = `/learning/chapter/${chapter.id}`

                return (
                  <li key={chapter.id} className="learning-nav-row">
                    <Link className="learning-nav-copy" href={drillHref}>
                      <strong>{chapter.title}</strong>
                      <div className="muted">
                        {sections.length > 0
                          ? `${sections.length} section${sections.length === 1 ? '' : 's'} · ${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`
                          : `${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`}
                        {lessons.length > 0 ? ` · ${done}/${lessons.length} done` : null}
                      </div>
                      {chapter.description ? (
                        <p className="muted learning-nav-desc">{chapter.description}</p>
                      ) : null}
                    </Link>
                    <div className="learning-nav-actions">
                      {lessons.length > 0 && !next ? (
                        <span className="badge badge-ok">✓ Complete</span>
                      ) : (
                        <Button href={drillHref} variant="primary">
                          Continue →
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            <Pagination
              slice={slice}
              hrefForPage={(page) => (page <= 1 ? '/learning' : `/learning?page=${page}`)}
              label="chapters"
            />
          </>
        )}
      </section>
    </div>
  )
}
