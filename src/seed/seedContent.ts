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
    .filter((item) => item.name !== lesson.name)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 2)

  while (distractors.length < 2 && pool.length > distractors.length + 1) {
    const extra = pool.find(
      (item) => item.name !== lesson.name && !distractors.some((d) => d.name === item.name),
    )
    if (!extra) break
    distractors.push(extra)
  }

  const choices = [lesson.name, ...distractors.map((d) => d.name)].slice(0, 3)

  return [
    {
      prompt: `Which gloss matches the sign for “${lesson.name}”?`,
      choices: choices.map((label) => ({ label })),
      correctIndex: 0,
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
      context: { skipSectionChapterSync: true },
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
      context: { skipSectionChapterSync: true },
    })
    chapterId = created.id
  }

  const sectionSlug = `${fixture.chapter.slug}-core`
  const existingSection = await payload.find({
    collection: 'sections',
    where: { slug: { equals: sectionSlug } },
    limit: 1,
    overrideAccess: true,
  })

  let sectionId: number | string
  if (existingSection.docs[0]) {
    const updated = await payload.update({
      collection: 'sections',
      id: existingSection.docs[0].id,
      data: {
        title: 'Core signs',
        chapters: [chapterId],
        sortOrder: 1,
      },
      overrideAccess: true,
    })
    sectionId = updated.id
  } else {
    const created = await payload.create({
      collection: 'sections',
      data: {
        title: 'Core signs',
        slug: sectionSlug,
        chapters: [chapterId],
        sortOrder: 1,
      },
      overrideAccess: true,
    })
    sectionId = created.id
  }

  const lessonIds: Array<number | string> = []

  for (const [index, lesson] of fixture.lessons.entries()) {
    const existing = await payload.find({
      collection: 'lessons',
      where: { name: { equals: lesson.name } },
      limit: 1,
      overrideAccess: true,
    })

    const lessonData = {
      name: lesson.name,
      secondaryName: lesson.secondaryName || undefined,
      maoriName: lesson.maoriName || undefined,
      wordClass: lesson.wordClass || undefined,
      videoUrl: lesson.videoUrl || undefined,
      image: lesson.drawingUrl ? { url: lesson.drawingUrl, source: 'url' as const } : undefined,
      instructions: `Watch the NZSL sign for “${lesson.name}”. Notice handshape and movement, then practise and take the quiz. You can retake the quiz anytime.`,
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

    lessonIds.push(lessonId)

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

  await payload.update({
    collection: 'sections',
    id: sectionId,
    data: {
      lessons: lessonIds.map((lesson) => ({ lesson })),
    },
    overrideAccess: true,
  })

  await payload.update({
    collection: 'chapters',
    id: chapterId,
    data: {
      sections: [{ section: sectionId }],
    },
    overrideAccess: true,
  })

  payload.logger.info(
    `Seeded chapter “${fixture.chapter.title}” with 1 section and ${fixture.lessons.length} lessons (idempotent).`,
  )
}

export async function seedOnInit(payload: Payload): Promise<void> {
  try {
    await seedContent(payload)
  } catch (error) {
    payload.logger.error({ err: error }, 'Seed on init failed')
  }
}
