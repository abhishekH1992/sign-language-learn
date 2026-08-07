import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import type { Payload } from 'payload'

export const ALPHABET_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_SOURCE = path.resolve(dirname, 'data/nzsl-alphabet-chart.png')
const CROPS_DIR = path.resolve(dirname, 'data/alphabet')

async function ensureCrops() {
  fs.mkdirSync(CROPS_DIR, { recursive: true })

  const chartPath = process.env.ALPHABET_CHART_PATH || PROJECT_SOURCE
  if (!fs.existsSync(chartPath)) {
    throw new Error(`Alphabet chart not found at ${chartPath}`)
  }

  const meta = await sharp(chartPath).metadata()
  const width = meta.width!
  const height = meta.height!
  const cols = 7
  const rows = 4
  const cellW = width / cols
  const cellH = height / rows

  for (let i = 0; i < ALPHABET_LETTERS.length; i++) {
    const letter = ALPHABET_LETTERS[i]
    const col = i % cols
    const row = Math.floor(i / cols)
    const left = Math.round(col * cellW)
    const top = Math.round(row * cellH)
    const w = Math.round((col + 1) * cellW) - left
    const h = Math.round((row + 1) * cellH) - top
    const out = path.join(CROPS_DIR, `${letter}.png`)
    await sharp(chartPath).extract({ left, top, width: w, height: h }).png().toFile(out)
  }

  return CROPS_DIR
}

/** Crop A–Z from the chart and upsert Media docs. Returns letter → media id. */
export async function seedAlphabetMedia(
  payload: Payload,
): Promise<Record<string, number | string>> {
  const cropsDir = await ensureCrops()
  const mediaByLetter: Record<string, number | string> = {}

  for (const letter of ALPHABET_LETTERS) {
    const alt = `NZSL alphabet ${letter}`
    const existing = await payload.find({
      collection: 'media',
      where: { alt: { equals: alt } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      mediaByLetter[letter] = existing.docs[0].id
      payload.logger.info(`Alphabet media ${letter}: reuse #${existing.docs[0].id}`)
      continue
    }

    const filename = `nzsl-alphabet-${letter.toLowerCase()}.png`
    const filepath = path.join(cropsDir, `${letter}.png`)
    const data = fs.readFileSync(filepath)

    const doc = await payload.create({
      collection: 'media',
      data: { alt },
      file: {
        data,
        mimetype: 'image/png',
        name: filename,
        size: data.length,
      },
      overrideAccess: true,
    })

    mediaByLetter[letter] = doc.id
    payload.logger.info(`Alphabet media ${letter}: created #${doc.id}`)
  }

  return mediaByLetter
}
