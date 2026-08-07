import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getLessonImageUrl } from '@/lib/lesson-image'
import { QuizForm } from './QuizForm'

type Props = { params: Promise<{ id: string }> }

export default async function QuizPage({ params }: Props) {
  const { id } = await params
  const { payload } = await requireUser()

  let lesson
  try {
    lesson = await payload.findByID({ collection: 'lessons', id, depth: 1 })
  } catch {
    notFound()
  }

  const quizzes = await payload.find({
    collection: 'quizzes',
    where: { lesson: { equals: lesson.id } },
    limit: 1,
  })
  const quiz = quizzes.docs[0]
  if (!quiz) notFound()

  const questions = (quiz.questions || []).map((question, index) => ({
    id: String(index),
    prompt: question.prompt,
    choices: (question.choices || []).map((choice) => choice.label),
  }))

  return (
    <div className="shell stack">
      <p>
        <Link href={`/learning/${lesson.id}`}>← {lesson.name}</Link>
      </p>
      <header>
        <h1 className="section-title">Quiz: {lesson.name}</h1>
        <p className="lede muted">Unlimited retries. Feedback is visual and written — never sound-only.</p>
      </header>
      <section className="panel">
        <QuizForm
          lessonId={String(lesson.id)}
          quizId={String(quiz.id)}
          questions={questions}
          imageUrl={getLessonImageUrl(lesson.image)}
          lessonName={lesson.name}
        />
      </section>
    </div>
  )
}
