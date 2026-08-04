import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { upsertLessonProgress } from '@/lib/progress'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { lessonId?: string }
  if (!body.lessonId) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  await upsertLessonProgress(payload, user, body.lessonId, {
    videoWatched: true,
    status: 'in_progress',
  })

  return NextResponse.json({ ok: true })
}
