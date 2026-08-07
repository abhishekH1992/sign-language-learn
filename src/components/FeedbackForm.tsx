'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusBanner } from '@/components/ui/StatusBanner'

type Props = {
  lessonId?: string | null
  lessonName?: string | null
  cancelHref?: string
}

export function FeedbackForm({ lessonId = null, lessonName = null, cancelHref }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const feedback = String(form.get('feedback') || '').trim()

    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback,
          lessonId: lessonId || null,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Could not send feedback.')
        setPending(false)
        return
      }
      setDone(true)
      event.currentTarget.reset()
    } catch {
      setError('Could not send feedback.')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="stack">
        <StatusBanner tone="ok" title="Thank you">
          Your feedback was sent. It helps us improve this experience with the community.
        </StatusBanner>
        <div className="btn-row">
          <Button type="button" variant="secondary" onClick={() => setDone(false)}>
            Send more feedback
          </Button>
          {cancelHref ? (
            <Button href={cancelHref} variant="secondary">
              Back
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {lessonName ? (
        <p className="muted" style={{ margin: 0 }}>
          Feedback about lesson: <strong>{lessonName}</strong>
        </p>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          General feedback about the app or your learning experience.
        </p>
      )}

      {error ? (
        <StatusBanner tone="error" title="Could not send">
          {error}
        </StatusBanner>
      ) : null}

      <div className="field">
        <label htmlFor="feedback">Your feedback</label>
        <textarea
          id="feedback"
          name="feedback"
          required
          rows={8}
          maxLength={10000}
          placeholder="What worked well? What should we change or add?"
        />
      </div>

      <div className="btn-row">
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send feedback'}
        </Button>
        {cancelHref ? (
          <Button href={cancelHref} variant="secondary">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
