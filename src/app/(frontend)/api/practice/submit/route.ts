import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generatePracticeFeedback } from '@/lib/openai-feedback'
import { upsertLessonProgress } from '@/lib/progress'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    lessonId?: string
    score?: number
    signalCodes?: string[]
    basis?: Record<string, unknown>
    scoreSource?: string
  }

  if (!body.lessonId || typeof body.score !== 'number' || !Array.isArray(body.signalCodes)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const lesson = await payload.findByID({
    collection: 'lessons',
    id: body.lessonId,
  })

  console.info('[NZSL practice] submit_received', {
    userId: user.id,
    lessonId: lesson.id,
    lessonName: lesson.name,
    score: body.score,
    signalCodes: body.signalCodes,
    scoreSource: body.scoreSource,
    basis: body.basis,
    feedbackBasis:
      'Text feedback is generated from score + signalCodes (+ optional OpenAI). CV does not identify the NZSL gloss yet.',
  })

  const feedback = await generatePracticeFeedback({
    lessonName: lesson.name,
    maoriName: lesson.maoriName,
    score: body.score,
    signalCodes: body.signalCodes,
  })

  console.info('[NZSL practice] feedback_generated', {
    lessonName: lesson.name,
    usedOpenAI: feedback.usedOpenAI,
    feedback: feedback.feedback,
    inputs: { score: body.score, signalCodes: body.signalCodes },
  })

  await upsertLessonProgress(payload, user, lesson.id, {
    practiceDone: true,
    videoWatched: true,
  })

  return NextResponse.json({
    score: body.score,
    signalCodes: body.signalCodes,
    feedback: feedback.feedback,
    usedOpenAI: feedback.usedOpenAI,
    basis: body.basis ?? null,
  })
}
