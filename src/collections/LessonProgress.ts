import type { CollectionConfig } from 'payload'

export const LessonProgress: CollectionConfig = {
  slug: 'lesson-progress',
  admin: {
    hidden: true,
    useAsTitle: 'id',
    defaultColumns: ['user', 'lesson', 'status', 'bestQuizScore'],
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { user: { equals: req.user.id } }
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { user: { equals: req.user.id } }
    },
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'not_started',
      options: [
        { label: 'Not started', value: 'not_started' },
        { label: 'In progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'videoWatched',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'practiceDone',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'quizPassed',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'bestQuizScore',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'bestPracticeScore',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Best practice camera score (0–100) for this lesson.',
      },
    },
    {
      name: 'lastActivityAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}
