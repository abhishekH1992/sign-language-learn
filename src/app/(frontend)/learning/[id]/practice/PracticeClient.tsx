'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { Button } from '@/components/ui/Button'
import { StatusBanner } from '@/components/ui/StatusBanner'
import {
  combinedBoundingBox,
  drawHandOverlay,
  flattenHands,
  scoreColor,
  type Landmark,
} from '@/lib/hand-landmarks'
import { scoreHandLandmarks } from '@/lib/hand-score'
import { basicScoreReason } from '@/lib/openai-feedback'

type Props = {
  lessonId: string
  lessonName: string
  maoriName: string
  imageUrl: string
  lessonsListHref: string
  nextLessonHref?: string | null
  pastScore?: number | null
}

type ScoreBasis = Record<string, unknown>

type ScoreResult = {
  score: number
  signalCodes: string[]
  feedback: string
  usedOpenAI: boolean
  basis?: ScoreBasis
}

const MEDIAPIPE_VERSION = '0.10.35'
const SCORE_INTERVAL_MS = 350
const NO_HAND_HOLD_MS = 280

export function PracticeClient({
  lessonId,
  lessonName,
  maoriName,
  imageUrl,
  lessonsListHref,
  nextLessonHref = null,
  pastScore = null,
}: Props) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastScoreAt = useRef(0)
  const lastHandSeenAt = useRef(0)
  const liveScoreRef = useRef(0)
  const highScoreValueRef = useRef(0)
  const scoreFrameRef = useRef<(landmarks: number[]) => Promise<void>>(async () => {})
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [liveScore, setLiveScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [highSignals, setHighSignals] = useState<string[]>(['waiting_for_hand'])
  const [highBasis, setHighBasis] = useState<ScoreBasis | null>(null)
  const [highScoreSource, setHighScoreSource] = useState<
    'cv-service' | 'browser-fallback' | 'none'
  >('none')
  const [signals, setSignals] = useState<string[]>(['waiting_for_hand'])
  const [basis, setBasis] = useState<ScoreBasis | null>(null)
  const [scoreSource, setScoreSource] = useState<'cv-service' | 'browser-fallback' | 'none'>('none')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [markedDone, setMarkedDone] = useState(false)
  const [pending, setPending] = useState(false)
  const [cameraInfo, setCameraInfo] = useState('')
  const [handCount, setHandCount] = useState(0)

  useEffect(() => {
    liveScoreRef.current = liveScore
  }, [liveScore])

  function applyScore(
    score: number,
    signalCodes: string[],
    nextBasis: ScoreBasis | null,
    source: 'cv-service' | 'browser-fallback',
  ) {
    setLiveScore(score)
    setSignals(signalCodes)
    setBasis(nextBasis)
    setScoreSource(source)

    if (score >= highScoreValueRef.current) {
      highScoreValueRef.current = score
      setHighScore(score)
      setHighSignals(signalCodes)
      setHighBasis(nextBasis)
      setHighScoreSource(source)
    }
  }

  async function scoreFrame(landmarks: number[]) {
    const now = Date.now()
    if (now - lastScoreAt.current < SCORE_INTERVAL_MS) return
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
      applyScore(data.score, data.signalCodes, data.basis || null, 'cv-service')
    } catch {
      const local = scoreHandLandmarks(landmarks, lessonName, 'browser_handshape_score')
      applyScore(local.score, local.signalCodes, local.basis, 'browser-fallback')
    }
  }

  scoreFrameRef.current = scoreFrame

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        })
        if (!videoRef.current || cancelled) return

        const track = stream.getVideoTracks()[0]
        const settings = track?.getSettings()
        // setCameraInfo(
        //   `Camera open: ${track?.label || 'default'} · ${settings?.width || '?'}×${settings?.height || '?'}`,
        // )

        videoRef.current.srcObject = stream
        await videoRef.current.play()

        const vision = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`,
        )
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        })
        landmarkerRef.current = landmarker
        setReady(true)

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

            // Mirror selfie preview for natural UX
            ctx.save()
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            ctx.restore()

            const hands = (detection.landmarks || []) as Landmark[][]
            const color = scoreColor(liveScoreRef.current)

            if (hands.length) {
              lastHandSeenAt.current = Date.now()
              setHandCount(hands.length)

              hands.forEach((hand, index) => {
                drawHandOverlay(ctx, hand, {
                  width: canvas.width,
                  height: canvas.height,
                  color,
                  label:
                    index === 0
                      ? `${lessonName} · ${Math.round(liveScoreRef.current)}%`
                      : `Hand ${index + 1}`,
                  mirror: true,
                })
              })

              if (hands.length >= 2) {
                const combined = combinedBoundingBox(hands)
                if (combined) {
                  const x = (1 - (combined.x + combined.w)) * canvas.width
                  const y = combined.y * canvas.height
                  const w = combined.w * canvas.width
                  const h = combined.h * canvas.height
                  ctx.strokeStyle = color
                  ctx.setLineDash([8, 6])
                  ctx.lineWidth = 2
                  ctx.strokeRect(x, y, w, h)
                  ctx.setLineDash([])
                }
              }

              void scoreFrameRef.current(flattenHands(hands))
            } else {
              const held = Date.now() - lastHandSeenAt.current < NO_HAND_HOLD_MS
              if (!held) {
                setHandCount(0)
                const noHandBasis = {
                  method: 'mediapipe_hand_landmarks',
                  rule: 'no_hand_detected',
                  reason: 'MediaPipe did not detect a hand in this frame',
                }
                setSignals(['hand_not_in_frame'])
                setLiveScore(0)
                setBasis(noHandBasis)
                setScoreSource('browser-fallback')
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
        setError(message)
      }
    }

    void start()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach((track) => track.stop())
      landmarkerRef.current?.close()
    }
  }, [lessonId, lessonName])

  async function saveAttempt() {
    setPending(true)

    try {
      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          score: highScore,
          signalCodes: highSignals,
          basis: highBasis,
          scoreSource: highScoreSource === 'none' ? scoreSource : highScoreSource,
        }),
      })
      const data = (await res.json()) as ScoreResult & { error?: string }
      if (!res.ok) {
        setError(data.error || 'Could not mark this lesson as done.')
        setPending(false)
        return
      }
      setResult(data)
      setMarkedDone(true)
      router.push(nextLessonHref || lessonsListHref)
      router.refresh()
    } catch {
      setError('Could not mark this lesson as done.')
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

      <div className="practice-stage">
        <div className="practice-stage-video">
          <div className="video-stage">
            <video
              ref={videoRef}
              className="camera-view"
              playsInline
              muted
              aria-label="Camera preview"
              style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
            />
            <canvas
              ref={canvasRef}
              aria-label="Camera preview with hand tracking overlay"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
          </div>
        </div>

        <aside className="practice-stage-aside" aria-live="polite">
          <div className="score-card">
            <span className="score-card-label">Live score</span>
            <strong className="score-card-value">{ready ? `${liveScore}%` : '—'}</strong>
            <p className="score-reason-text">
              {basicScoreReason(
                signals,
                typeof basis?.reason === 'string' ? basis.reason : null,
              )}
            </p>
          </div>
          <div className="score-card">
            <span className="score-card-label">High score</span>
            <strong className="score-card-value">{highScore}%</strong>
            <p className="score-reason-text">
              {basicScoreReason(
                highSignals,
                typeof highBasis?.reason === 'string' ? highBasis.reason : null,
              )}
            </p>
          </div>
          {pastScore != null ? (
            <div className="score-card">
              <span className="score-card-label">Past score</span>
              <strong className="score-card-value">{Number(pastScore.toFixed(1))}%</strong>
              <p className="score-reason-text">Your best saved score for this lesson.</p>
            </div>
          ) : null}
        </aside>
      </div>

      {cameraInfo ? (
        <p className="muted practice-camera-meta" role="status">
          {cameraInfo}. Hands detected: {handCount}.
        </p>
      ) : null}

      {error ? (
        <StatusBanner tone="error" title="Camera or practice issue">
          {error}
        </StatusBanner>
      ) : null}

      {/* Practice feedback temporarily disabled (no OpenAI coaching UI).
      {result ? (
        <StatusBanner tone={result.score >= 70 ? 'ok' : 'warn'} title="Practice feedback">
          {result.feedback}
          <div style={{ marginTop: '0.5rem' }}>
            Source: {result.usedOpenAI ? 'OpenAI feedback' : 'Local fallback tip'}
          </div>
        </StatusBanner>
      ) : null}
      */}

      <div className="btn-row">
        <Button type="button" onClick={saveAttempt} disabled={!ready || pending || markedDone}>
          {pending ? 'Saving…' : 'Mark as done'}
        </Button>
        <Button href={lessonsListHref} variant="secondary">
          Back to lessons
        </Button>
      </div>
    </div>
  )
}
