'use client'

import { useEffect, useRef, useState } from 'react'
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

const MEDIAPIPE_VERSION = '0.10.35'
const SCORE_INTERVAL_MS = 350
const NO_HAND_HOLD_MS = 280
const PEAK_WINDOW_MS = 2000

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
  const lastHandSeenAt = useRef(0)
  const liveScoreRef = useRef(0)
  const peakRef = useRef<{ score: number; signals: string[]; basis: ScoreBasis | null; at: number }>({
    score: 0,
    signals: ['waiting_for_hand'],
    basis: null,
    at: 0,
  })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [liveScore, setLiveScore] = useState(0)
  const [peakScore, setPeakScore] = useState(0)
  const [signals, setSignals] = useState<string[]>(['waiting_for_hand'])
  const [basis, setBasis] = useState<ScoreBasis | null>(null)
  const [scoreSource, setScoreSource] = useState<'cv-service' | 'browser-fallback' | 'none'>('none')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [pending, setPending] = useState(false)
  const [cameraInfo, setCameraInfo] = useState('')
  const [handCount, setHandCount] = useState(0)

  useEffect(() => {
    liveScoreRef.current = liveScore
  }, [liveScore])

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
        logPractice('mediapipe_ready', {
          lessonName,
          model: 'hand_landmarker float16',
          numHands: 2,
          mediapipeVersion: MEDIAPIPE_VERSION,
          feedbackBasis:
            '21 landmarks × up to 2 hands → finger-curl features vs lesson letter template → signal codes → text feedback',
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

              void scoreFrame(flattenHands(hands))
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

    const now = Date.now()
    if (score >= peakRef.current.score || now - peakRef.current.at > PEAK_WINDOW_MS) {
      peakRef.current = { score, signals: signalCodes, basis: nextBasis, at: now }
      setPeakScore(score)
    } else if (now - peakRef.current.at <= PEAK_WINDOW_MS) {
      setPeakScore(peakRef.current.score)
    }

    const key = `${score}:${signalCodes.join(',')}`
    if (lastLoggedSignals.current !== key) {
      lastLoggedSignals.current = key
      logPractice('live_score', {
        lessonName,
        score,
        signalCodes,
        source,
        handCount,
        basis: nextBasis,
      })
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

  async function saveAttempt() {
    setPending(true)
    const now = Date.now()
    const usePeak = now - peakRef.current.at <= PEAK_WINDOW_MS && peakRef.current.score > liveScore
    const saveScore = usePeak ? peakRef.current.score : liveScore
    const saveSignals = usePeak ? peakRef.current.signals : signals
    const saveBasis = usePeak ? peakRef.current.basis : basis

    logPractice('saving_attempt', {
      lessonId,
      lessonName,
      score: saveScore,
      peakScore: peakRef.current.score,
      usedPeak: usePeak,
      signalCodes: saveSignals,
      scoreSource,
      basis: saveBasis,
      feedbackPipeline:
        'local/CV handshape score + signalCodes → /api/practice/submit → OpenAI (or fallback text)',
    })
    try {
      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          score: saveScore,
          signalCodes: saveSignals,
          basis: saveBasis,
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
        basis: data.basis || saveBasis,
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

      {cameraInfo ? (
        <p className="muted" role="status">
          {cameraInfo}. Hands detected: {handCount}. Peak (2s): {peakScore}%. Open DevTools Console for
          `[NZSL practice]` logs.
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
            We track up to two hands with MediaPipe, draw boxes/skeleton for guidance, and score finger-curl
            features against the lesson letter template when available.
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
            {JSON.stringify(
              { score: liveScore, peakScore, signalCodes: signals, scoreSource, handCount, basis },
              null,
              2,
            )}
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
