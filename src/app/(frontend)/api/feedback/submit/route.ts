import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getLessonNav } from '@/lib/lesson-nav'

function toRelationId(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    feedback?: string
    lessonId?: string | number | null
  }

  const text = typeof body.feedback === 'string' ? body.feedback.trim() : ''
  if (!text) {
    return NextResponse.json({ error: 'Feedback is required.' }, { status: 400 })
  }
  if (text.length > 10000) {
    return NextResponse.json({ error: 'Feedback is too long.' }, { status: 400 })
  }

  let lessonId = toRelationId(body.lessonId)
  let sectionId: number | null = null
  let chapterId: number | null = null

  if (lessonId != null) {
    try {
      const lesson = await payload.findByID({
        collection: 'lessons',
        id: lessonId,
        depth: 0,
        overrideAccess: true,
      })
      lessonId = toRelationId(lesson.id)
      if (lessonId == null) {
        return NextResponse.json({ error: 'Lesson not found.' }, { status: 400 })
      }
      const nav = await getLessonNav(payload, lessonId)
      sectionId = toRelationId(nav.sectionId)
      chapterId = toRelationId(nav.chapterId)
    } catch {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 400 })
    }
  }

  try {
    const created = await payload.create({
      collection: 'feedback',
      data: {
        user: toRelationId(user.id) ?? user.id,
        feedback: text,
        ...(lessonId != null ? { lesson: lessonId } : {}),
        ...(sectionId != null ? { section: sectionId } : {}),
        ...(chapterId != null ? { chapter: chapterId } : {}),
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      id: created.id,
      ok: true,
    })
  } catch (error) {
    console.error('[feedback/submit]', error)
    return NextResponse.json(
      { error: 'Could not save feedback. Check lesson and try again.' },
      { status: 400 },
    )
  }
}
