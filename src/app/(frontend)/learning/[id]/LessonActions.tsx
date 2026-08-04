'use client'

import { VideoPlayer } from '@/components/VideoPlayer'

type Props = {
  lessonId: string
  videoUrl: string
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

  return <VideoPlayer src={videoUrl} title={title} onWatched={markWatched} />
}
