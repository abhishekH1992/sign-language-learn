import type { Payload } from 'payload'

import { ALPHABET_LETTERS, seedAlphabetMedia } from './seedAlphabetMedia'

const ALPHABET_VIDEO_URL = 'https://www.youtube.com/watch?v=TH-xNQ7WE0E'

export async function seedContent(payload: Payload): Promise<void> {
  const mediaByLetter = await seedAlphabetMedia(payload)

  const existingChapter = await payload.find({
    collection: 'chapters',
    where: { slug: { equals: 'basics' } },
    limit: 1,
    overrideAccess: true,
  })

  let chapterId: number | string
  if (existingChapter.docs[0]) {
    const updated = await payload.update({
      collection: 'chapters',
      id: existingChapter.docs[0].id,
      data: {
        title: 'Basics',
        description: 'Foundational skills, starting with the manual alphabet.',
        sortOrder: 1,
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
        title: 'Basics',
        slug: 'basics',
        description: 'Foundational skills, starting with the manual alphabet.',
        sortOrder: 1,
        published: true,
      },
      overrideAccess: true,
      context: { skipSectionChapterSync: true },
    })
    chapterId = created.id
  }

  const existingSection = await payload.find({
    collection: 'sections',
    where: { slug: { equals: 'alphabets' } },
    limit: 1,
    overrideAccess: true,
  })

  let sectionId: number | string
  if (existingSection.docs[0]) {
    const updated = await payload.update({
      collection: 'sections',
      id: existingSection.docs[0].id,
      data: {
        title: 'Alphabets',
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
        title: 'Alphabets',
        slug: 'alphabets',
        chapters: [chapterId],
        sortOrder: 1,
      },
      overrideAccess: true,
    })
    sectionId = created.id
  }

  const lessonIds: Array<number | string> = []

  for (const [index, letter] of ALPHABET_LETTERS.entries()) {
    const name = letter
    const mediaId = mediaByLetter[letter]

    const existing = await payload.find({
      collection: 'lessons',
      where: { name: { equals: name } },
      limit: 1,
      overrideAccess: true,
    })

    const lessonData = {
      name,
      wordClass: 'letter',
      videoUrl: ALPHABET_VIDEO_URL,
      image: {
        source: 'upload' as const,
        media: mediaId,
      },
      instructions: `Learn the handshape for the letter “${letter}”. Watch the video, then practise it.`,
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
    `Seeded chapter “Basics” → section “Alphabets” with ${lessonIds.length} letter lessons.`,
  )
}

export async function seedOnInit(payload: Payload): Promise<void> {
  try {
    await seedContent(payload)
  } catch (error) {
    payload.logger.error({ err: error }, 'Seed on init failed')
  }
}
