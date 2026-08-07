'use client'

import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { Button } from '@/components/ui/Button'
import { StatusBanner } from '@/components/ui/StatusBanner'

type Props = {
  lessonId: string
  lessonName: string
  maoriName: string
  imageUrl: string
}

type ScoreBasis = Record<string, unknown>

type ScoreResult = {
  score: number
  signalCodes: string[]
  feedback: string
  usedOpenAI: boolean
  basis?: ScoreBasis
}

function flattenLandmarks(landmarks: Array<{ x: number; y: number; z: number }>) {
  return landmarks.flatMap((point) => [point.x, point.y, point.z])
}

function logPractice(event: string, details?: Record<string, unknown>) {
  console.info(`[NZSL practice] ${event}`, details ?? {})
}

export function PracticeClient({ lessonId, lessonName, maoriName, imageUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastScoreAt = useRef(0)
  const lastLoggedSignals = useRef('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [liveScore, setLiveScore] = useState(0)
  const [signals, setSignals] = useState<string[]>(['waiting_for_hand'])
  const [basis, setBasis] = useState<ScoreBasis | null>(null)
  const [scoreSource, setScoreSource] = useState<'cv-service' | 'browser-fallback' | 'none'>('none')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [pending, setPending] = useState(false)
  const [cameraInfo, setCameraInfo] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      try {
        logPractice('requesting_camera', {
          lessonId,
          lessonName,
          constraints: { facingMode: 'user', width: 640, height: 480, audio: false },
        })

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        })
        if (!videoRef.current || cancelled) return

        const track = stream.getVideoTracks()[0]
        const settings = track?.getSettings()
        const info = `Camera open: ${track?.label || 'default'} · ${settings?.width || '?'}×${settings?.height || '?'}`
        setCameraInfo(info)
        logPractice('camera_open', {
          lessonId,
          lessonName,
          label: track?.label,
          settings,
          trackReadyState: track?.readyState,
        })

        videoRef.current.srcObject = stream
        await videoRef.current.play()
        logPractice('camera_preview_playing', { lessonName })

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm',
        )
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        })
        landmarkerRef.current = landmarker
        setReady(true)
        logPractice('mediapipe_ready', {
          lessonName,
          model: 'hand_landmarker float16',
          feedbackBasis:
            '21 hand landmarks → in-frame check + hand-span openness heuristic → signal codes → text feedback (OpenAI or local fallback)',
        })

        const loop = () => {
          const video = videoRef.current
          const canvas = canvasRef.current
          const lm = landmarkerRef.current
          if (!video || !canvas || !lm || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop)
            return
          }

          const detection = lm.detectForVideo(video, performance.now())
          const ctx = canvas.getContext('2d')
          if (ctx) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const hand = detection.landmarks[0]
            if (hand) {
              ctx.fillStyle = '#0b6e4f'
              for (const point of hand) {
                ctx.beginPath()
                ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2)
                ctx.fill()
              }
              void scoreFrame(flattenLandmarks(hand))
            } else {
              const noHandBasis = {
                method: 'mediapipe_hand_landmarks',
                rule: 'no_hand_detected',
                reason: 'MediaPipe did not detect a hand in this frame',
              }
              setSignals(['hand_not_in_frame'])
              setLiveScore(0)
              setBasis(noHandBasis)
              setScoreSource('browser-fallback')
              const key = 'hand_not_in_frame'
              if (lastLoggedSignals.current !== key) {
                lastLoggedSignals.current = key
                logPractice('live_score', {
                  lessonName,
                  score: 0,
                  signalCodes: ['hand_not_in_frame'],
                  source: 'browser',
                  basis: noHandBasis,
                })
              }
            }
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Camera permission is required for practice. You can still take the quiz.'
        logPractice('camera_error', { lessonName, message, error: String(err) })
        setError(message)
      }
    }

    void start()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach((track) => track.stop())
      landmarkerRef.current?.close()
      logPractice('camera_closed', { lessonId, lessonName })
    }
  }, [lessonId, lessonName])

  async function scoreFrame(landmarks: number[]) {
    const now = Date.now()
    if (now - lastScoreAt.current < 400) return
    lastScoreAt.current = now
    try {
      const cvUrl = process.env.NEXT_PUBLIC_CV_SERVICE_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${cvUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarks, lessonName }),
      })
      if (!res.ok) throw new Error('cv unavailable')
      const data = (await res.json()) as {
        score: number
        signalCodes: string[]
        basis?: ScoreBasis
      }
      setLiveScore(data.score)
      setSignals(data.signalCodes)
      setBasis(data.basis || null)
      setScoreSource('cv-service')
      const key = `${data.score}:${data.signalCodes.join(',')}`
      if (lastLoggedSignals.current !== key) {
        lastLoggedSignals.current = key
        logPractice('live_score', {
          lessonName,
          score: data.score,
          signalCodes: data.signalCodes,
          source: 'cv-service',
          basis: data.basis,
        })
      }
    } catch {
      // Local heuristic if CV service is offline
      const xs = landmarks.filter((_, index) => index % 3 === 0)
      const ys = landmarks.filter((_, index) => index % 3 === 1)
      const inFrame = xs.every((x) => x > 0.05 && x < 0.95) && ys.every((y) => y > 0.05 && y < 0.95)
      if (!inFrame) {
        const localBasis = {
          method: 'browser_fallback_heuristic',
          rule: 'in_frame_margin_5pct',
          reason: 'CV service offline; hand landmarks outside frame margin',
        }
        setLiveScore(20)
        setSignals(['hand_not_in_frame'])
        setBasis(localBasis)
        setScoreSource('browser-fallback')
        logPractice('live_score', {
          lessonName,
          score: 20,
          signalCodes: ['hand_not_in_frame'],
          source: 'browser-fallback',
          basis: localBasis,
        })
        return
      }
      const spread = Math.max(...xs) - Math.min(...xs)
      const score = Math.max(35, Math.min(92, Math.round(spread * 180)))
      const signalCodes = score < 60 ? ['low_confidence', 'shape_mismatch'] : ['stable_hand']
      const localBasis = {
        method: 'browser_fallback_heuristic',
        rule: 'hand_span_openness_heuristic',
        formula: 'score = clamp(spread * 180, 35, 92)',
        spread: Number(spread.toFixed(4)),
        reason:
          'CV service offline; feedback based on hand width span from MediaPipe landmarks (not full NZSL sign matching).',
      }
      setLiveScore(score)
      setSignals(signalCodes)
      setBasis(localBasis)
      setScoreSource('browser-fallback')
      const key = `${score}:${signalCodes.join(',')}`
      if (lastLoggedSignals.current !== key) {
        lastLoggedSignals.current = key
        logPractice('live_score', {
          lessonName,
          score,
          signalCodes,
          source: 'browser-fallback',
          basis: localBasis,
        })
      }
    }
  }

  async function saveAttempt() {
    setPending(true)
    logPractice('saving_attempt', {
      lessonId,
      lessonName,
      score: liveScore,
      signalCodes: signals,
      scoreSource,
      basis,
      feedbackPipeline:
        'local score + signalCodes → /api/practice/submit → OpenAI (or fallback text) from those structured signals',
    })
    try {
      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          score: liveScore,
          signalCodes: signals,
          basis,
          scoreSource,
        }),
      })
      const data = (await res.json()) as ScoreResult & { error?: string }
      if (!res.ok) {
        setError(data.error || 'Could not save practice attempt.')
        setPending(false)
        return
      }
      logPractice('feedback_received', {
        lessonName,
        score: data.score,
        signalCodes: data.signalCodes,
        usedOpenAI: data.usedOpenAI,
        feedback: data.feedback,
        basis: data.basis || basis,
      })
      setResult(data)
    } catch {
      setError('Could not save practice attempt.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="stack">
      <div className="btn-row">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Reference image for ${lessonName}`}
            width={160}
            height={120}
            style={{ borderRadius: 12, border: '1px solid var(--line)' }}
          />
        ) : null}
        <div>
          <strong>{lessonName}</strong>
          <div className="muted">{maoriName || 'Practise the handshape from the lesson video.'}</div>
        </div>
      </div>

      <div className="video-stage" style={{ position: 'relative' }}>
        <video ref={videoRef} className="camera-view" playsInline muted aria-label="Camera preview" />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>

      {cameraInfo ? (
        <p className="muted" role="status">
          {cameraInfo}. Open browser DevTools Console for `[NZSL practice]` logs.
        </p>
      ) : null}

      {error ? (
        <StatusBanner tone="error" title="Camera or practice issue">
          {error}
        </StatusBanner>
      ) : (
        <StatusBanner
          tone={liveScore >= 70 ? 'ok' : 'warn'}
          title={ready ? `Live score ${liveScore}%` : 'Starting camera…'}
        >
          Signals: {signals.join(', ').replaceAll('_', ' ')} · Source: {scoreSource}
        </StatusBanner>
      )}

      {basis ? (
        <section className="panel" aria-labelledby="feedback-basis-heading">
          <h2 id="feedback-basis-heading" className="section-title" style={{ fontSize: '1.2rem' }}>
            Feedback basis
          </h2>
          <p className="muted">
            We score MediaPipe hand landmarks (in-frame + hand span). Text feedback is written from those
            signal codes — not from recognizing the full NZSL sign yet.
          </p>
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.9rem',
              background: '#f0f4f2',
              padding: '0.75rem',
              borderRadius: 12,
            }}
          >
            {JSON.stringify({ score: liveScore, signalCodes: signals, scoreSource, basis }, null, 2)}
          </pre>
        </section>
      ) : null}

      {result ? (
        <StatusBanner tone={result.score >= 70 ? 'ok' : 'warn'} title="Practice feedback">
          {result.feedback}
          <div style={{ marginTop: '0.5rem' }}>
            Source: {result.usedOpenAI ? 'OpenAI feedback' : 'Local fallback tip'}
          </div>
        </StatusBanner>
      ) : null}

      <div className="btn-row">
        <Button type="button" onClick={saveAttempt} disabled={!ready || pending}>
          {pending ? 'Saving…' : 'Save attempt & get feedback'}
        </Button>
        <Button href={`/learning/${lessonId}/quiz`} variant="secondary">
          Continue to quiz
        </Button>
        <Button href={`/learning/${lessonId}`} variant="secondary">
          Back to lesson
        </Button>
      </div>
    </div>
  )
}
