import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type ParsedLesson = {
  nzslId: number
  name: string
  secondaryName: string
  maoriName: string
  wordClass: string
  videoUrl: string
  drawingUrl: string
  signPageUrl: string
}

const EXCLUDED_IDS = new Set([5220]) // keyword false positive: defecate

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function capture(card: string, className: string): string {
  const re = new RegExp(
    `class="[^"]*${className}[^"]*"[^>]*>\\s*([\\s\\S]*?)\\s*</(?:div|a)>`,
    'i',
  )
  const match = card.match(re)
  return match ? clean(match[1].replace(/<[^>]+>/g, ' ')) : ''
}

export function parseNzslSearchHtml(html: string): ParsedLesson[] {
  const cards = html.split('search-results__card').slice(1)
  const lessons: ParsedLesson[] = []

  for (const card of cards) {
    const videoMatch = card.match(/src="(https:\/\/[^"]+\.mp4)"/)
    const drawingMatch = card.match(/src="(https:\/\/[^"]+-high_resolution\.png)"/)
    const idMatch = card.match(/data-sign-id="(\d+)"/) || card.match(/\/signs\/(\d+)/)
    if (!videoMatch || !idMatch) continue

    const nzslId = Number(idMatch[1])
    if (EXCLUDED_IDS.has(nzslId)) continue

    const name = capture(card, 'main_gloss')
    const secondaryName = capture(card, 'secondary_gloss')
    const maoriName = capture(card, 'maori-gloss')
    const wordClass = capture(card, 'word_gloss')

    lessons.push({
      nzslId,
      name: name || `sign-${nzslId}`,
      secondaryName,
      maoriName,
      wordClass,
      videoUrl: videoMatch[1],
      drawingUrl: drawingMatch?.[1] || '',
      signPageUrl: `https://www.nzsl.nz/signs/${nzslId}`,
    })
  }

  return lessons
}

function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const dumpPath = path.resolve(dirname, '../../dumps/numberblock.html')
  const outPath = path.resolve(dirname, 'data/number-chapter.json')

  const html = fs.readFileSync(dumpPath, 'utf8')
  const lessons = parseNzslSearchHtml(html)

  const payload = {
    chapter: {
      title: 'Number basics',
      slug: 'number-basics',
      description:
        'Sample lessons parsed from a dictionary search for “number”. Videos link to reference media for learning.',
      sortOrder: 1,
    },
    lessons,
    generatedAt: new Date().toISOString(),
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Parsed ${lessons.length} lessons → ${outPath}`)
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  main()
}
