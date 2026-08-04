import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Payload } from 'payload'

import { parseNzslSearchHtml } from './parse-html'

type SeedFixture = {
  chapter: {
    title: string
    slug: string
    description: string
    sortOrder: number
  }
  lessons: Array<{
    nzslId: number
    name: string
    secondaryName: string
    maoriName: string
    wordClass: string
    videoUrl: string
    drawingUrl: string
  }>
}

function loadFixture(): SeedFixture {
  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const jsonPath = path.resolve(dirname, 'data/number-chapter.json')
  const dumpPath = path.resolve(dirname, '../../dumps/numberblock.html')

  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as SeedFixture
  }

  const html = fs.readFileSync(dumpPath, 'utf8')
  const lessons = parseNzslSearchHtml(html)
  return {
    chapter: {
      title: 'Number basics',
      slug: 'number-basics',
      description:
        'Sample NZSL lessons parsed from the official dictionary search for “number”.',
      sortOrder: 1,
    },
    lessons,
  }
}

function buildQuizQuestions(lesson: SeedFixture['lessons'][number], pool: SeedFixture['lessons']) {
  const distractors = pool
    .filter((item) => item.nzslId !== lesson.nzslId)
    .sort((a, b) => a.nzslId - b.nzslId)
    .slice(0, 2)

  while (distractors.length < 2 && pool.length > distractors.length + 1) {
    const extra = pool.find(
      (item) => item.nzslId !== lesson.nzslId && !distractors.some((d) => d.nzslId === item.nzslId),
    )
    if (!extra) break
    distractors.push(extra)
  }

  const choices = [lesson.name, ...distractors.map((d) => d.name)].slice(0, 3)
  const correctIndex = 0

  return [
    {
      prompt: `Which gloss matches the sign for “${lesson.name}”?`,
      choices: choices.map((label) => ({ label })),
      correctIndex,
      tip: `Remember: ${lesson.name}${lesson.maoriName ? ` (${lesson.maoriName})` : ''} is a ${lesson.wordClass || 'sign'}.`,
    },
    {
      prompt: `What is a Māori gloss for “${lesson.name}”?`,
      choices: [
        { label: lesson.maoriName || lesson.name },
        ...distractors.map((d) => ({ label: d.maoriName || d.name })),
      ].slice(0, 3),
      correctIndex: 0,
      tip: lesson.maoriName
        ? `Māori: ${lesson.maoriName}`
        : 'Review the lesson glosses and try again.',
    },
  ]
}

export async function seedContent(payload: Payload): Promise<void> {
  const fixture = loadFixture()

  const existingChapter = await payload.find({
    collection: 'chapters',
    where: { slug: { equals: fixture.chapter.slug } },
    limit: 1,
    overrideAccess: true,
  })

  let chapterId: number | string
  if (existingChapter.docs[0]) {
    const updated = await payload.update({
      collection: 'chapters',
      id: existingChapter.docs[0].id,
      data: {
        title: fixture.chapter.title,
        description: fixture.chapter.description,
        sortOrder: fixture.chapter.sortOrder,
        published: true,
      },
      overrideAccess: true,
    })
    chapterId = updated.id
  } else {
    const created = await payload.create({
      collection: 'chapters',
      data: {
        ...fixture.chapter,
        published: true,
      },
      overrideAccess: true,
    })
    chapterId = created.id
  }

  for (const [index, lesson] of fixture.lessons.entries()) {
    const existing = await payload.find({
      collection: 'lessons',
      where: { nzslId: { equals: lesson.nzslId } },
      limit: 1,
      overrideAccess: true,
    })

    const lessonData = {
      nzslId: lesson.nzslId,
      name: lesson.name,
      secondaryName: lesson.secondaryName || undefined,
      maoriName: lesson.maoriName || undefined,
      wordClass: lesson.wordClass || undefined,
      videoUrl: lesson.videoUrl,
      drawingUrl: lesson.drawingUrl || undefined,
      instructions: `Watch the NZSL sign for “${lesson.name}”. Notice handshape and movement, then practise and take the quiz. You can retake the quiz anytime.`,
      chapter: chapterId,
      sortOrder: index + 1,
      published: true,
    }

    let lessonId: number | string
    if (existing.docs[0]) {
      const updated = await payload.update({
        collection: 'lessons',
        id: existing.docs[0].id,
        data: lessonData,
        overrideAccess: true,
      })
      lessonId = updated.id
    } else {
      const created = await payload.create({
        collection: 'lessons',
        data: lessonData,
        overrideAccess: true,
      })
      lessonId = created.id
    }

    const existingQuiz = await payload.find({
      collection: 'quizzes',
      where: { lesson: { equals: lessonId } },
      limit: 1,
      overrideAccess: true,
    })

    const quizData = {
      lesson: lessonId,
      allowRetakes: true,
      questions: buildQuizQuestions(lesson, fixture.lessons),
    }

    if (existingQuiz.docs[0]) {
      await payload.update({
        collection: 'quizzes',
        id: existingQuiz.docs[0].id,
        data: quizData,
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'quizzes',
        data: quizData,
        overrideAccess: true,
      })
    }
  }

  payload.logger.info(
    `Seeded chapter “${fixture.chapter.title}” with ${fixture.lessons.length} lessons (idempotent).`,
  )
}

export async function seedOnInit(payload: Payload): Promise<void> {
  try {
    await seedContent(payload)
  } catch (error) {
    payload.logger.error({ err: error }, 'Seed on init failed')
  }
}
