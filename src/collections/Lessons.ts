import type { CollectionConfig } from 'payload'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'wordClass', 'published', 'sortOrder'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data?.image) return data
        data.image.source = data.image.media ? 'upload' : 'url'
        return data
      },
    ],
  },
  fields: [
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
    },
    {
      name: 'image',
      type: 'group',
      label: 'Image',
      admin: {
        description:
          'Upload a file to Media, or paste an external image link. Upload takes priority if both are set.',
      },
      fields: [
        {
          name: 'media',
          type: 'upload',
          relationTo: 'media',
          label: 'Upload',
        },
        {
          name: 'url',
          type: 'text',
          label: 'External link',
        },
        {
          name: 'source',
          type: 'select',
          defaultValue: 'url',
          options: [
            { label: 'Upload', value: 'upload' },
            { label: 'External link', value: 'url' },
          ],
          admin: {
            hidden: true,
          },
        },
      ],
    },
    {
      name: 'instructions',
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
  ],
}
