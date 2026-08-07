import type { CollectionConfig } from 'payload'

export const Sections: CollectionConfig = {
  slug: 'sections',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'chapters', 'sortOrder'],
  },
  access: {
    read: () => true,
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
    },
    {
      name: 'chapters',
      type: 'relationship',
      relationTo: 'chapters',
      hasMany: true,
      required: true,
      admin: {
        description: 'A section can belong to multiple chapters.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'lessons',
      type: 'array',
      labels: {
        singular: 'Lesson',
        plural: 'Lessons',
      },
      admin: {
        description: 'Note: When removing a lesson, remove the entire entry.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'lesson',
          type: 'relationship',
          relationTo: 'lessons',
          required: true,
          admin: {
            allowCreate: true,
          },
        },
      ],
    },
  ],
}
