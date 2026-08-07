'use client'

import { VideoPlayer } from '@/components/VideoPlayer'

type Props = {
  lessonId: string
  videoUrl?: string | null
  title: string
}

export function LessonActions({ lessonId, videoUrl, title }: Props) {
  async function markWatched() {
    await fetch('/api/progress/video', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    })
  }

  if (!videoUrl) {
    return <p className="muted">No video has been added for this lesson yet.</p>
  }

  return <VideoPlayer src={videoUrl} title={title} onWatched={markWatched} />
}
