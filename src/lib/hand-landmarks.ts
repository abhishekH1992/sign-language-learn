/** MediaPipe hand landmark connections (finger segments + palm). */
export const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
]

export type Landmark = { x: number; y: number; z: number }

export type HandBox = {
  x: number
  y: number
  w: number
  h: number
}

export function flattenHands(hands: Landmark[][]): number[] {
  return hands.flatMap((hand) => hand.flatMap((point) => [point.x, point.y, point.z]))
}

export function handBoundingBox(hand: Landmark[], pad = 0.04): HandBox {
  const xs = hand.map((p) => p.x)
  const ys = hand.map((p) => p.y)
  const minX = Math.max(0, Math.min(...xs) - pad)
  const maxX = Math.min(1, Math.max(...xs) + pad)
  const minY = Math.max(0, Math.min(...ys) - pad)
  const maxY = Math.min(1, Math.max(...ys) + pad)
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function combinedBoundingBox(hands: Landmark[], pad = 0.05): HandBox | null {
  if (!hands.length) return null
  const xs = hands.flatMap((hand) => hand.map((p) => p.x))
  const ys = hands.flatMap((hand) => hand.map((p) => p.y))
  const minX = Math.max(0, Math.min(...xs) - pad)
  const maxX = Math.min(1, Math.max(...xs) + pad)
  const minY = Math.max(0, Math.min(...ys) - pad)
  const maxY = Math.min(1, Math.max(...ys) + pad)
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#0b6e4f'
  if (score >= 45) return '#b7791f'
  return '#b42318'
}

export function drawHandOverlay(
  ctx: CanvasRenderingContext2D,
  hands: Landmark[],
  opts: {
    width: number
    height: number
    color: string
    label?: string
    mirror?: boolean
  },
) {
  const { width, height, color, label, mirror = true } = opts
  const mapX = (x: number) => (mirror ? 1 - x : x) * width
  const mapY = (y: number) => y * height

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  ctx.lineCap = 'round'

  for (const [a, b] of HAND_CONNECTIONS) {
    const pa = hands[a]
    const pb = hands[b]
    if (!pa || !pb) continue
    ctx.beginPath()
    ctx.moveTo(mapX(pa.x), mapY(pa.y))
    ctx.lineTo(mapX(pb.x), mapY(pb.y))
    ctx.stroke()
  }

  for (const point of hands) {
    ctx.beginPath()
    ctx.arc(mapX(point.x), mapY(point.y), 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  const box = handBoundingBox(hands)
  const left = Math.min(mapX(box.x), mapX(box.x + box.w))
  const right = Math.max(mapX(box.x), mapX(box.x + box.w))
  const top = mapY(box.y)
  const boxH = box.h * height

  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.strokeRect(left, top, right - left, boxH)

  if (label) {
    const labelY = Math.max(22, top - 8)
    ctx.font = 'bold 16px system-ui, sans-serif'
    const textW = ctx.measureText(label).width + 14
    ctx.fillStyle = color
    ctx.fillRect(left, labelY - 18, textW, 24)
    ctx.fillStyle = '#fff'
    ctx.fillText(label, left + 7, labelY)
  }
}
