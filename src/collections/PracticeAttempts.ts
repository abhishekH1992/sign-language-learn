import type { CollectionConfig } from 'payload'

export const PracticeAttempts: CollectionConfig = {
  slug: 'practice-attempts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'lesson', 'score', 'completedAt'],
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
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      required: true,
      index: true,
    },
    {
      name: 'score',
      type: 'number',
      required: true,
    },
    {
      name: 'signalCodes',
      type: 'json',
      required: true,
    },
    {
      name: 'aiFeedback',
      type: 'textarea',
    },
    {
      name: 'completedAt',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}
