import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
  },
  auth: true,
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create') {
          const isAdmin = (req.user as { role?: string } | null)?.role === 'admin'
          if (!isAdmin) {
            return { ...data, role: 'learner' }
          }
        }
        return data
      },
    ],
  },
  access: {
    create: () => true,
    read: ({ req }) => {
      if (!req.user) return false
      if ((req.user as { role?: string }).role === 'admin') return true
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      if ((req.user as { role?: string }).role === 'admin') return true
      return { id: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Learner',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'learner',
      options: [
        { label: 'Learner', value: 'learner' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        update: ({ req }) => (req.user as { role?: string } | null)?.role === 'admin',
      },
    },
    {
      name: 'avatarUrl',
      type: 'text',
      admin: {
        description: 'Optional avatar image URL',
      },
    },
  ],
}
