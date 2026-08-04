import type { CollectionConfig } from 'payload'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'nzslId', 'chapter', 'wordClass', 'published'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'nzslId',
      type: 'number',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'secondaryName',
      type: 'text',
    },
    {
      name: 'maoriName',
      type: 'text',
    },
    {
      name: 'wordClass',
      type: 'text',
      admin: {
        description: 'e.g. noun, verb, adjective',
      },
    },
    {
      name: 'videoUrl',
      type: 'text',
      required: true,
    },
    {
      name: 'drawingUrl',
      type: 'text',
    },
    {
      name: 'instructions',
      type: 'textarea',
    },
    {
      name: 'chapter',
      type: 'relationship',
      relationTo: 'chapters',
      required: true,
    },
    {
      name: 'section',
      type: 'relationship',
      relationTo: 'sections',
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
  ],
}
