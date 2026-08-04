'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusBanner } from '@/components/ui/StatusBanner'

type Question = {
  id: string
  prompt: string
  choices: string[]
}

type Props = {
  lessonId: string
  quizId: string
  questions: Question[]
  drawingUrl: string
  lessonName: string
}

type Result = {
  score: number
  maxScore: number
  feedback: string
  usedOpenAI: boolean
}

export function QuizForm({ lessonId, quizId, questions, drawingUrl, lessonName }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const current = questions[step]
  const progressLabel = useMemo(
    () => `${Math.min(step + 1, questions.length)} / ${questions.length}`,
    [step, questions.length],
  )

  async function submitAll(finalAnswers: Record<string, number>) {
    setPending(true)
    setError('')
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          quizId,
          answers: questions.map((question) => ({
            questionIndex: Number(question.id),
            choiceIndex: finalAnswers[question.id] ?? -1,
          })),
        }),
      })
      const data = (await res.json()) as Result & { error?: string }
      if (!res.ok) {
        setError(data.error || 'Could not submit quiz.')
        setPending(false)
        return
      }
      setResult(data)
    } catch {
      setError('Could not submit quiz.')
    } finally {
      setPending(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (answers[current.id] === undefined) {
      setError('Choose an answer to continue.')
      return
    }
    setError('')
    if (step < questions.length - 1) {
      setStep((value) => value + 1)
      return
    }
    void submitAll(answers)
  }

  if (result) {
    const tone = result.score === result.maxScore ? 'ok' : result.score === 0 ? 'error' : 'warn'
    return (
      <div className="stack">
        <StatusBanner
          tone={tone}
          title={`Score ${result.score}/${result.maxScore} on “${lessonName}”`}
        >
          {result.feedback}
          <div style={{ marginTop: '0.5rem' }}>
            Source: {result.usedOpenAI ? 'OpenAI feedback' : 'Local fallback tip'}
          </div>
        </StatusBanner>
        <div className="btn-row">
          <Button
            type="button"
            onClick={() => {
              setResult(null)
              setAnswers({})
              setStep(0)
            }}
          >
            Retry quiz
          </Button>
          <Button href={`/learning/${lessonId}`} variant="secondary">
            Back to lesson
          </Button>
          <Button href="/learning" variant="secondary">
            Back to chapter
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="progress-meta">
        <strong>Question</strong>
        <span>{progressLabel}</span>
      </div>
      {drawingUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={drawingUrl}
          alt={`Drawing for ${lessonName}`}
          width={220}
          height={160}
          style={{ borderRadius: 12, border: '1px solid var(--line)', background: '#fff' }}
        />
      ) : null}
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: '0.75rem' }}>{current.prompt}</legend>
        <div className="stack" style={{ gap: '0.75rem' }}>
          {current.choices.map((choice, index) => (
            <label className="choice" key={`${current.id}-${index}`}>
              <input
                type="radio"
                name={`q-${current.id}`}
                value={index}
                checked={answers[current.id] === index}
                onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: index }))}
              />
              <span>{choice}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {step < questions.length - 1 ? 'Next' : pending ? 'Checking…' : 'Check answers'}
      </Button>
    </form>
  )
}
