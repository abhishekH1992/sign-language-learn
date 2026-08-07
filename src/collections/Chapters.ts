import type { CollectionConfig, PayloadRequest } from 'payload'

function sectionIdsFromRows(
  rows: Array<{ section?: number | string | { id: number | string } | null }> | null | undefined,
): Array<number | string> {
  if (!rows?.length) return []
  return rows
    .map((row) => {
      const value = row.section
      if (value == null) return null
      return typeof value === 'object' ? value.id : value
    })
    .filter((id): id is number | string => id != null && id !== '')
}

function chapterIdsFromField(
  chapters: Array<number | string | { id: number | string }> | null | undefined,
): Array<number | string> {
  if (!chapters?.length) return []
  return chapters.map((item) => (typeof item === 'object' ? item.id : item))
}

async function syncSectionChapters({
  req,
  chapterId,
  nextSectionIds,
  previousSectionIds,
}: {
  req: PayloadRequest
  chapterId: number | string
  nextSectionIds: Array<number | string>
  previousSectionIds: Array<number | string>
}) {
  const next = new Set(nextSectionIds.map(String))
  const previous = new Set(previousSectionIds.map(String))

  for (const sectionId of nextSectionIds) {
    const section = await req.payload.findByID({
      collection: 'sections',
      id: sectionId,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const chapters = chapterIdsFromField(section.chapters)
    if (!chapters.some((id) => String(id) === String(chapterId))) {
      await req.payload.update({
        collection: 'sections',
        id: sectionId,
        data: { chapters: [...chapters, chapterId] },
        overrideAccess: true,
        req,
        context: { skipSectionChapterSync: true },
      })
    }
  }

  for (const sectionId of previousSectionIds) {
    if (next.has(String(sectionId))) continue
    if (!previous.has(String(sectionId))) continue

    const section = await req.payload.findByID({
      collection: 'sections',
      id: sectionId,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const chapters = chapterIdsFromField(section.chapters).filter(
      (id) => String(id) !== String(chapterId),
    )
    await req.payload.update({
      collection: 'sections',
      id: sectionId,
      data: { chapters },
      overrideAccess: true,
      req,
      context: { skipSectionChapterSync: true },
    })
  }
}

export const Chapters: CollectionConfig = {
  slug: 'chapters',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'sortOrder', 'published'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, context }) => {
        if (context?.skipSectionChapterSync) return doc

        await syncSectionChapters({
          req,
          chapterId: doc.id,
          nextSectionIds: sectionIdsFromRows(doc.sections),
          previousSectionIds: sectionIdsFromRows(previousDoc?.sections),
        })

        return doc
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'sortOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'sections',
      type: 'array',
      labels: {
        singular: 'Section',
        plural: 'Sections',
      },
      admin: {
        description: 'Note: When removing a section, remove the entire entry.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'section',
          type: 'relationship',
          relationTo: 'sections',
          required: true,
          admin: {
            allowCreate: true,
          },
        },
      ],
    },
  ],
}
