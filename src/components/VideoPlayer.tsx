'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from './ui/Button'
import { getYouTubeId } from '@/lib/youtube'

type Props = {
  src: string
  title: string
  onWatched?: () => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string
          playerVars?: Record<string, string | number>
          events?: {
            onReady?: (event: { target: YtPlayer }) => void
            onStateChange?: (event: { data: number; target: YtPlayer }) => void
          }
        },
      ) => YtPlayer
      PlayerState: { ENDED: number; PLAYING: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

type YtPlayer = {
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  setVolume: (volume: number) => void
  playVideo: () => void
  pauseVideo: () => void
  getPlayerState: () => number
  destroy: () => void
}

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()

  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.body.appendChild(script)
    }
  })
}

function YouTubePlayer({
  videoId,
  title,
  onWatched,
}: {
  videoId: string
  title: string
  onWatched?: () => void
}) {
  const reactId = useId().replace(/:/g, '')
  const elementId = `yt-player-${reactId}`
  const playerRef = useRef<YtPlayer | null>(null)
  const keepMutedRef = useRef<number | null>(null)
  const onWatchedRef = useRef(onWatched)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    onWatchedRef.current = onWatched
  }, [onWatched])

  useEffect(() => {
    let cancelled = false

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return

      playerRef.current = new window.YT.Player(elementId, {
        videoId,
        playerVars: {
          mute: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: ({ target }) => {
            target.mute()
            target.setVolume(0)
          },
          onStateChange: ({ data, target }) => {
            target.mute()
            target.setVolume(0)
            if (data === window.YT?.PlayerState.PLAYING) {
              setPlaying(true)
            } else if (data === window.YT?.PlayerState.ENDED) {
              setPlaying(false)
              onWatchedRef.current?.()
            } else {
              setPlaying(false)
            }
          },
        },
      })

      keepMutedRef.current = window.setInterval(() => {
        const player = playerRef.current
        if (!player) return
        try {
          if (!player.isMuted()) player.mute()
          player.setVolume(0)
        } catch {
          // Player may not be ready yet
        }
      }, 500)
    })

    return () => {
      cancelled = true
      if (keepMutedRef.current != null) {
        window.clearInterval(keepMutedRef.current)
      }
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [elementId, videoId])

  function togglePlay() {
    const player = playerRef.current
    if (!player || !window.YT) return
    const state = player.getPlayerState()
    if (state === window.YT.PlayerState.PLAYING) {
      player.pauseVideo()
      setPlaying(false)
    } else {
      player.mute()
      player.setVolume(0)
      player.playVideo()
      setPlaying(true)
    }
  }

  return (
    <div>
      <div className="video-stage">
        <div id={elementId} title={title} style={{ width: '100%', aspectRatio: '16 / 9' }} />
      </div>
      <div className="video-controls" role="group" aria-label="Playback shortcuts">
        <Button type="button" variant="secondary" onClick={togglePlay}>
          {playing ? 'Pause' : 'Play'}
        </Button>
        <span className="muted" style={{ alignSelf: 'center' }}>
          Video plays muted
        </span>
      </div>
    </div>
  )
}

function NativePlayer({ src, title, onWatched }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState(false)

  function forceMute(video: HTMLVideoElement) {
    video.muted = true
    video.volume = 0
    video.defaultMuted = true
  }

  useEffect(() => {
    const video = ref.current
    if (!video) return
    forceMute(video)
  }, [src])

  async function togglePlay() {
    const video = ref.current
    if (!video) return
    forceMute(video)
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
          muted
          playsInline
          preload="metadata"
          aria-label={title}
          onVolumeChange={(event) => forceMute(event.currentTarget)}
          onEnded={() => {
            setPlaying(false)
            onWatched?.()
          }}
          onPlay={(event) => {
            forceMute(event.currentTarget)
            setPlaying(true)
          }}
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
        <span className="muted" style={{ alignSelf: 'center' }}>
          Video plays muted
        </span>
      </div>
    </div>
  )
}

export function VideoPlayer({ src, title, onWatched }: Props) {
  const youtubeId = getYouTubeId(src)
  if (youtubeId) {
    return <YouTubePlayer videoId={youtubeId} title={title} onWatched={onWatched} />
  }
  return <NativePlayer src={src} title={title} onWatched={onWatched} />
}
