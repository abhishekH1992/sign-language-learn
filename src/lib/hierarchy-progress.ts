import type { Chapter, Lesson, LessonProgress, Section } from '@/payload-types'

export type ProgressCount = {
  done: number
  total: number
}

export type HierarchyProgress = {
  chapters: ProgressCount
  sections: ProgressCount
  lessons: ProgressCount
}

export type InProgressChapter = {
  id: number | string
  title: string
  description?: string | null
  done: number
  total: number
  nextLessonId: number | string
  nextLessonName: string
}

export function publishedLessons(section: Section): Lesson[] {
  return (section.lessons || [])
    .map((row) => (typeof row.lesson === 'object' ? (row.lesson as Lesson) : null))
    .filter((lesson): lesson is Lesson => Boolean(lesson?.published))
}

export function chapterSections(chapter: Chapter): Section[] {
  return (chapter.sections || [])
    .map((row) => (typeof row.section === 'object' ? (row.section as Section) : null))
    .filter((section): section is Section => Boolean(section))
}

export function chapterLessons(chapter: Chapter): Lesson[] {
  const lessons: Lesson[] = []
  for (const section of chapterSections(chapter)) {
    lessons.push(...publishedLessons(section))
  }
  return lessons
}

export function nextUndoneLesson(
  lessons: Lesson[],
  progressByLesson: Map<string, LessonProgress>,
): Lesson | null {
  for (const lesson of lessons) {
    if (!isLessonComplete(lesson.id, progressByLesson)) return lesson
  }
  return null
}

function isLessonComplete(
  lessonId: number | string,
  progressByLesson: Map<string, LessonProgress>,
) {
  return progressByLesson.get(String(lessonId))?.status === 'completed'
}

function lessonHasProgress(state: LessonProgress | undefined) {
  if (!state) return false
  return (
    state.status === 'in_progress' ||
    state.status === 'completed' ||
    Boolean(state.videoWatched) ||
    Boolean(state.practiceDone) ||
    Boolean(state.quizPassed)
  )
}

function hasLessonStarted(
  lessonId: number | string,
  progressByLesson: Map<string, LessonProgress>,
) {
  return lessonHasProgress(progressByLesson.get(String(lessonId)))
}

/** True when the learner has started or completed at least one lesson. */
export function hasAnyProgress(progressByLesson: Map<string, LessonProgress>) {
  for (const state of progressByLesson.values()) {
    if (lessonHasProgress(state)) return true
  }
  return false
}

/** Chapters / sections / lessons completed out of published content totals. */
export function computeHierarchyProgress(
  chapters: Chapter[],
  progressByLesson: Map<string, LessonProgress>,
): HierarchyProgress {
  let lessonDone = 0
  let lessonTotal = 0
  let sectionDone = 0
  let sectionTotal = 0
  let chapterDone = 0
  let chapterTotal = 0

  for (const chapter of chapters) {
    chapterTotal += 1
    let chapterLessons = 0
    let chapterLessonDone = 0

    for (const row of chapter.sections || []) {
      const section = typeof row.section === 'object' ? (row.section as Section) : null
      if (!section) continue

      sectionTotal += 1
      const lessons = publishedLessons(section)
      let sectionLessonDone = 0

      for (const lesson of lessons) {
        lessonTotal += 1
        chapterLessons += 1
        if (isLessonComplete(lesson.id, progressByLesson)) {
          lessonDone += 1
          sectionLessonDone += 1
          chapterLessonDone += 1
        }
      }

      if (lessons.length > 0 && sectionLessonDone === lessons.length) {
        sectionDone += 1
      }
    }

    if (chapterLessons > 0 && chapterLessonDone === chapterLessons) {
      chapterDone += 1
    }
  }

  return {
    chapters: { done: chapterDone, total: chapterTotal },
    sections: { done: sectionDone, total: sectionTotal },
    lessons: { done: lessonDone, total: lessonTotal },
  }
}

/** Chapters the learner has started but not finished, with next undone lesson. */
export function getInProgressChapters(
  chapters: Chapter[],
  progressByLesson: Map<string, LessonProgress>,
): InProgressChapter[] {
  const result: InProgressChapter[] = []

  for (const chapter of chapters) {
    const lessons = chapterLessons(chapter)
    if (lessons.length === 0) continue

    let done = 0
    let started = 0
    let nextLesson: Lesson | null = null

    for (const lesson of lessons) {
      const complete = isLessonComplete(lesson.id, progressByLesson)
      if (complete) {
        done += 1
        started += 1
        continue
      }
      if (hasLessonStarted(lesson.id, progressByLesson)) started += 1
      if (!nextLesson) nextLesson = lesson
    }

    if (started === 0 || done === lessons.length || !nextLesson) continue

    result.push({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      done,
      total: lessons.length,
      nextLessonId: nextLesson.id,
      nextLessonName: nextLesson.name,
    })
  }

  return result
}
