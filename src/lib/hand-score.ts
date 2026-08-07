import type { Landmark } from './hand-landmarks'

export type HandScoreResult = {
  score: number
  signalCodes: string[]
  basis: Record<string, unknown>
}

type LetterTemplate = {
  /** Curl targets for base/open-style hand then active/point-style hand (order-invariant). */
  curls: number[]
  dist: number
  requireTwo: boolean
  /** Optional contact: [handARole tipIndex, handBRole tipIndex] roles are 0=base, 1=active */
  contact?: { baseTip: number; activeTip: number; maxDist: number }
}

/**
 * NZSL two-hand fingerspelling curl targets (0=extended, 1=curled).
 * Ordered as [baseHand x5, activeHand x5] — matching tries both assignments.
 */
const LETTER_TEMPLATES: Record<string, LetterTemplate> = {
  // A: open flat hand + index pointing to thumb tip
  A: {
    curls: [0.25, 0.12, 0.12, 0.12, 0.12, 0.7, 0.12, 0.85, 0.85, 0.85],
    dist: 0.16,
    requireTwo: true,
    contact: { baseTip: 4, activeTip: 8, maxDist: 0.12 },
  },
  B: { curls: [0.7, 0.12, 0.12, 0.12, 0.12, 0.7, 0.2, 0.85, 0.85, 0.85], dist: 0.18, requireTwo: true },
  C: { curls: [0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35], dist: 0.14, requireTwo: true },
  D: { curls: [0.25, 0.12, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.16, requireTwo: true },
  E: { curls: [0.75, 0.75, 0.75, 0.75, 0.75, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.14, requireTwo: true },
  F: { curls: [0.2, 0.15, 0.75, 0.75, 0.75, 0.2, 0.15, 0.8, 0.8, 0.8], dist: 0.16, requireTwo: true },
  G: { curls: [0.7, 0.75, 0.75, 0.75, 0.75, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.12, requireTwo: true },
  H: { curls: [0.25, 0.15, 0.15, 0.8, 0.8, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.16, requireTwo: true },
  I: { curls: [0.7, 0.8, 0.8, 0.8, 0.15, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.16, requireTwo: true },
  J: { curls: [0.7, 0.8, 0.8, 0.8, 0.15, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.18, requireTwo: true },
  K: { curls: [0.2, 0.15, 0.15, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.16, requireTwo: true },
  L: { curls: [0.15, 0.12, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.16, requireTwo: true },
  M: { curls: [0.7, 0.2, 0.2, 0.2, 0.8, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.14, requireTwo: true },
  N: { curls: [0.7, 0.2, 0.2, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.14, requireTwo: true },
  O: { curls: [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4], dist: 0.12, requireTwo: true },
  P: { curls: [0.2, 0.15, 0.15, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.16, requireTwo: true },
  Q: { curls: [0.2, 0.15, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.16, requireTwo: true },
  R: { curls: [0.25, 0.2, 0.2, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.14, requireTwo: true },
  S: { curls: [0.8, 0.8, 0.8, 0.8, 0.8, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.14, requireTwo: true },
  T: { curls: [0.25, 0.8, 0.8, 0.8, 0.8, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.14, requireTwo: true },
  U: { curls: [0.7, 0.12, 0.12, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.14, requireTwo: true },
  V: { curls: [0.7, 0.12, 0.12, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.15, requireTwo: true },
  W: { curls: [0.7, 0.12, 0.12, 0.12, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.15, requireTwo: true },
  X: { curls: [0.25, 0.4, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.14, requireTwo: true },
  Y: { curls: [0.15, 0.85, 0.85, 0.85, 0.15, 0.7, 0.75, 0.75, 0.75, 0.75], dist: 0.16, requireTwo: true },
  Z: {
    curls: [0.25, 0.12, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75],
    dist: 0.15,
    requireTwo: true,
    contact: { baseTip: 4, activeTip: 8, maxDist: 0.14 },
  },
}

function dist(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Curl via tip–PIP distance vs finger length (more stable than wrist-only). */
function fingerCurl(hand: Landmark[], tip: number, pip: number, mcp: number) {
  const tipToMcp = dist(hand[tip], hand[mcp])
  const pipToMcp = Math.max(dist(hand[pip], hand[mcp]), 1e-6)
  const extension = tipToMcp / (pipToMcp * 2.2)
  const curl = 1 - Math.min(1, Math.max(0, extension))
  return Number(curl.toFixed(3))
}

function handCurls(hand: Landmark[]) {
  return [
    fingerCurl(hand, 4, 3, 2),
    fingerCurl(hand, 8, 6, 5),
    fingerCurl(hand, 12, 10, 9),
    fingerCurl(hand, 16, 14, 13),
    fingerCurl(hand, 20, 18, 17),
  ]
}

function parseHands(landmarks: number[]): Landmark[][] {
  const hands: Landmark[][] = []
  const pointCount = Math.floor(landmarks.length / 3)
  const handCount = Math.floor(pointCount / 21)
  for (let h = 0; h < handCount; h++) {
    const hand: Landmark[] = []
    for (let i = 0; i < 21; i++) {
      const base = (h * 21 + i) * 3
      hand.push({
        x: landmarks[base],
        y: landmarks[base + 1],
        z: landmarks[base + 2] ?? 0,
      })
    }
    hands.push(hand)
  }
  return hands
}

function meanAbsError(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length)
  if (!n) return 1
  let sum = 0
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i])
  return sum / n
}

function openness(hand: Landmark[]) {
  const xs = hand.map((p) => p.x)
  const ys = hand.map((p) => p.y)
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

/** Score letter by trying both hand role assignments; softer curve + optional contact. */
function scoreAgainstTemplate(
  hands: Landmark[][],
  template: LetterTemplate,
): { score: number; curls: number[]; interDist: number; contactScore: number | null; order: string } {
  const curlsA = handCurls(hands[0])
  const curlsB = handCurls(hands[1])
  const interDist = dist(hands[0][0], hands[1][0])

  const candidates = [
    { curls: [...curlsA, ...curlsB], base: hands[0], active: hands[1], order: '0=base,1=active' },
    { curls: [...curlsB, ...curlsA], base: hands[1], active: hands[0], order: '1=base,0=active' },
  ]

  let best = {
    score: 0,
    curls: candidates[0].curls,
    contactScore: null as number | null,
    order: candidates[0].order,
  }

  for (const candidate of candidates) {
    const curlErr = meanAbsError(candidate.curls, template.curls)
    const distErr = Math.min(1, Math.abs(interDist - template.dist) / 0.4)
    // Soft curve so a correct-ish pose is not crushed by template noise
    let similarity = Math.exp(-1.5 * curlErr) * Math.exp(-0.6 * distErr)

    let contactScore: number | null = null
    if (template.contact) {
      const baseTip = candidate.base[template.contact.baseTip]
      const activeTip = candidate.active[template.contact.activeTip]
      const d = dist(baseTip, activeTip)
      contactScore = Math.max(0, 1 - d / template.contact.maxDist)
      // Contact is a strong cue for letters like A (index on thumb)
      similarity = similarity * 0.55 + contactScore * 0.45
    }

    // Open-hand bonus when base should be open (mean curl of base fingers low in template)
    const templateBaseOpen = 1 - template.curls.slice(0, 5).reduce((s, v) => s + v, 0) / 5
    if (templateBaseOpen > 0.55) {
      const baseOpen = 1 - candidate.curls.slice(0, 5).reduce((s, v) => s + v, 0) / 5
      similarity = similarity * 0.8 + Math.max(0, baseOpen) * 0.2
    }

    // Pointing-hand bonus: index extended, other fingers curled
    const templateActiveIndex = template.curls[6]
    if (templateActiveIndex < 0.35) {
      const indexExt = 1 - candidate.curls[6]
      const otherCurl =
        (candidate.curls[7] + candidate.curls[8] + candidate.curls[9]) / 3
      const pointQuality = indexExt * 0.6 + otherCurl * 0.4
      similarity = similarity * 0.85 + pointQuality * 0.15
    }

    const score = Math.round(Math.max(0, Math.min(100, similarity * 100)))
    if (score >= best.score) {
      best = { score, curls: candidate.curls, contactScore, order: candidate.order }
    }
  }

  return { score: best.score, curls: best.curls, interDist, contactScore: best.contactScore, order: best.order }
}

function signalsForScore(score: number): string[] {
  if (score >= 70) return ['stable_hand', 'shape_close']
  if (score >= 45) return ['shape_close', 'low_confidence']
  return ['shape_mismatch', 'low_confidence']
}

export function scoreHandLandmarks(
  landmarks: number[],
  lessonName = '',
  method = 'browser_handshape_score',
): HandScoreResult {
  const hands = parseHands(landmarks)
  if (!hands.length) {
    return {
      score: 0,
      signalCodes: ['hand_not_in_frame'],
      basis: {
        method,
        rule: 'no_hand_detected',
        reason: 'No hand landmarks received',
      },
    }
  }

  const letter = lessonName.trim().toUpperCase()
  const template = LETTER_TEMPLATES[letter]

  if (template?.requireTwo && hands.length < 2) {
    const presence = Math.min(40, 20 + hands.length * 15)
    return {
      score: presence,
      signalCodes: ['need_both_hands'],
      basis: {
        method,
        rule: 'alphabet_requires_two_hands',
        handCount: hands.length,
        lesson: letter,
        reason: 'NZSL fingerspelling uses two hands. Keep both hands in frame.',
      },
    }
  }

  if (template && hands.length >= 2) {
    const matched = scoreAgainstTemplate(hands, template)
    return {
      score: matched.score,
      signalCodes: signalsForScore(matched.score),
      basis: {
        method,
        rule: 'letter_template_similarity_order_invariant',
        lesson: letter,
        handCount: hands.length,
        curls: matched.curls,
        interHandDistance: Number(matched.interDist.toFixed(4)),
        contactScore: matched.contactScore,
        handRoleOrder: matched.order,
        template: {
          curls: template.curls,
          dist: template.dist,
          requireTwo: template.requireTwo,
          contact: template.contact ?? null,
        },
        reason:
          'Score compares finger curls (both hand role assignments) and tip contact to the NZSL letter template.',
      },
    }
  }

  const curls = [
    ...handCurls(hands[0]),
    ...(hands[1] ? handCurls(hands[1]) : [0.5, 0.5, 0.5, 0.5, 0.5]),
  ]
  const open = Math.max(...hands.map(openness))
  const curlVariance = curls.reduce((sum, c) => sum + Math.abs(c - 0.5), 0) / curls.length
  const score = Math.round(Math.max(25, Math.min(92, open * 140 + curlVariance * 40)))

  return {
    score,
    signalCodes: score >= 60 ? ['stable_hand'] : ['low_confidence', 'shape_mismatch'],
    basis: {
      method,
      rule: 'generic_hand_pose_stability',
      lesson: letter || null,
      handCount: hands.length,
      curls,
      reason: 'Score uses hand visibility and finger articulation stability (not full NZSL sign ID).',
    },
  }
}
