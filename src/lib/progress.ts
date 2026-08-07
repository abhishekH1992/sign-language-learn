import type { Payload } from 'payload'

function toNumericId(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

export async function upsertLessonProgress(
  payload: Payload,
  user: { id: number | string },
  lessonId: number | string,
  patch: {
    videoWatched?: boolean
    practiceDone?: boolean
    quizPassed?: boolean
    bestQuizScore?: number
    bestPracticeScore?: number
    status?: 'not_started' | 'in_progress' | 'completed'
  },
) {
  const userId = toNumericId(user.id)
  const lessonNumericId = toNumericId(lessonId)

  const existing = await payload.find({
    collection: 'lesson-progress',
    where: {
      and: [{ user: { equals: userId } }, { lesson: { equals: lessonNumericId } }],
    },
    limit: 1,
    overrideAccess: true,
  })

  const current = existing.docs[0]
  const videoWatched = patch.videoWatched ?? current?.videoWatched ?? false
  const practiceDone = patch.practiceDone ?? current?.practiceDone ?? false
  const quizPassed = patch.quizPassed ?? current?.quizPassed ?? false
  const bestQuizScore = Math.max(patch.bestQuizScore ?? 0, current?.bestQuizScore ?? 0)
  const bestPracticeScore = Math.max(
    patch.bestPracticeScore ?? 0,
    current?.bestPracticeScore ?? 0,
  )

  let status = patch.status
  if (patch.status === 'completed' || (quizPassed && videoWatched)) {
    status = 'completed'
  } else if (!status) {
    if (videoWatched || practiceDone || quizPassed) status = 'in_progress'
    else status = 'not_started'
  }

  const data = {
    user: userId,
    lesson: lessonNumericId,
    videoWatched,
    practiceDone,
    quizPassed,
    bestQuizScore,
    bestPracticeScore,
    status,
    lastActivityAt: new Date().toISOString(),
  }

  if (current) {
    return payload.update({
      collection: 'lesson-progress',
      id: current.id,
      data,
      overrideAccess: true,
    })
  }

  return payload.create({
    collection: 'lesson-progress',
    data,
    overrideAccess: true,
  })
}
