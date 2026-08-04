import type { CollectionConfig } from 'payload'

export const Quizzes: CollectionConfig = {
  slug: 'quizzes',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['lesson', 'allowRetakes'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      required: true,
      unique: true,
    },
    {
      name: 'allowRetakes',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'questions',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'prompt',
          type: 'text',
          required: true,
        },
        {
          name: 'choices',
          type: 'array',
          required: true,
          minRows: 2,
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
            },
          ],
        },
        {
          name: 'correctIndex',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'tip',
          type: 'text',
        },
      ],
    },
  ],
}
