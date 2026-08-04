'use client'

import { useRef, useState } from 'react'
import { Button } from './ui/Button'

type Props = {
  src: string
  title: string
  onWatched?: () => void
}

export function VideoPlayer({ src, title, onWatched }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState(false)

  async function togglePlay() {
    const video = ref.current
    if (!video) return
    if (video.paused) {
      await video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  function toggleSlow() {
    const video = ref.current
    if (!video) return
    const next = !slow
    video.playbackRate = next ? 0.5 : 1
    setSlow(next)
  }

  return (
    <div>
      <div className="video-stage">
        <video
          ref={ref}
          src={src}
          controls
          playsInline
          preload="metadata"
          aria-label={title}
          onEnded={() => {
            setPlaying(false)
            onWatched?.()
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      </div>
      <div className="video-controls" role="group" aria-label="Playback shortcuts">
        <Button type="button" variant="secondary" onClick={togglePlay}>
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button type="button" variant="secondary" onClick={toggleSlow} aria-pressed={slow}>
          {slow ? 'Normal speed' : 'Slow motion'}
        </Button>
      </div>
    </div>
  )
}
