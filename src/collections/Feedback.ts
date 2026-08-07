import type { CollectionConfig } from 'payload'

export const Feedback: CollectionConfig = {
  slug: 'feedback',
  admin: {
    useAsTitle: 'feedback',
    defaultColumns: ['user', 'lesson', 'chapter', 'section', 'createdAt'],
    description: 'Community and learner feedback (general or lesson-specific).',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { user: { equals: req.user.id } }
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'Learner who submitted the feedback.',
      },
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      index: true,
      admin: {
        description: 'Optional — set when feedback is about a specific lesson.',
      },
    },
    {
      name: 'section',
      type: 'relationship',
      relationTo: 'sections',
      index: true,
      admin: {
        description: 'Optional — section context for the lesson.',
      },
    },
    {
      name: 'chapter',
      type: 'relationship',
      relationTo: 'chapters',
      index: true,
      admin: {
        description: 'Optional — chapter context for the lesson.',
      },
    },
    {
      name: 'feedback',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Feedback text from the learner or community.',
      },
    },
  ],
  timestamps: true,
}
