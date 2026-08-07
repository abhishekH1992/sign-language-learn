import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateQuizFeedback } from '@/lib/openai-feedback'
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
    quizId?: string
    answers?: Array<{ questionIndex: number; choiceIndex: number }>
  }

  if (!body.lessonId || !body.quizId || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const quiz = await payload.findByID({
    collection: 'quizzes',
    id: body.quizId,
    depth: 1,
  })

  const lesson =
    typeof quiz.lesson === 'object'
      ? quiz.lesson
      : await payload.findByID({ collection: 'lessons', id: body.lessonId })

  const questions = quiz.questions || []
  let score = 0
  const wrongTips: string[] = []

  for (const answer of body.answers) {
    const question = questions[answer.questionIndex]
    if (!question) continue
    if (answer.choiceIndex === question.correctIndex) {
      score += 1
    } else if (question.tip) {
      wrongTips.push(question.tip)
    }
  }

  const maxScore = questions.length
  const feedback = await generateQuizFeedback({
    lessonName: lesson.name,
    maoriName: lesson.maoriName,
    score,
    maxScore,
    wrongTips,
  })

  const passed = maxScore > 0 && score / maxScore >= 0.6
  await upsertLessonProgress(payload, user, lesson.id, {
    quizPassed: passed,
    bestQuizScore: score,
    status: passed ? 'completed' : 'in_progress',
    videoWatched: true,
  })

  await payload.create({
    collection: 'notifications',
    data: {
      user: user.id,
      title: `Quiz feedback ready — ${lesson.name}`,
      body: feedback.feedback,
      type: 'progress',
      read: false,
    },
    overrideAccess: true,
  })

  return NextResponse.json({
    score,
    maxScore,
    feedback: feedback.feedback,
    usedOpenAI: feedback.usedOpenAI,
  })
}
