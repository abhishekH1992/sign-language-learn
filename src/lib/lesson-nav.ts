import type { Payload } from 'payload'
import type { Chapter, Lesson, Section } from '@/payload-types'
import { chapterSections, publishedLessons } from '@/lib/hierarchy-progress'

export type LessonNav = {
  lessonsListHref: string
  /** Lesson page URL for the next lesson in the section, or null if this was the last. */
  nextLessonHref: string | null
}

function findLessonContext(chapters: Chapter[], lessonId: number | string) {
  const target = String(lessonId)

  for (const chapter of chapters) {
    const sections = chapterSections(chapter)
    for (const section of sections) {
      const lessons = publishedLessons(section as Section)
      const index = lessons.findIndex((lesson: Lesson) => String(lesson.id) === target)
      if (index >= 0) {
        return { chapter, section, lessons, index }
      }
    }
  }

  return null
}

/** Resolve lessons-list and next-practice URLs for a lesson. */
export async function getLessonNav(
  payload: Payload,
  lessonId: number | string,
): Promise<LessonNav> {
  const chapters = await payload.find({
    collection: 'chapters',
    where: { published: { equals: true } },
    sort: 'sortOrder',
    limit: 100,
    depth: 3,
  })

  const context = findLessonContext(chapters.docs as Chapter[], lessonId)
  if (context) {
    const { chapter, section, lessons, index } = context
    const lessonsListHref = `/learning/section/${section.id}?chapter=${chapter.id}`
    const next = lessons[index + 1]
    return {
      lessonsListHref,
      nextLessonHref: next ? `/learning/${next.id}` : null,
    }
  }

  for (const chapter of chapters.docs as Chapter[]) {
    if (chapterSections(chapter).length === 0) {
      return {
        lessonsListHref: `/learning/chapter/${chapter.id}`,
        nextLessonHref: null,
      }
    }
  }

  return { lessonsListHref: '/learning', nextLessonHref: null }
}

/** Find the section (and chapter) that contains a lesson for back-navigation. */
export async function getLessonListHref(
  payload: Payload,
  lessonId: number | string,
): Promise<string> {
  const nav = await getLessonNav(payload, lessonId)
  return nav.lessonsListHref
}
