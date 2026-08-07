import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Chapters } from './collections/Chapters'
import { Feedback } from './collections/Feedback'
import { Lessons } from './collections/Lessons'
import { LessonProgress } from './collections/LessonProgress'
import { Media } from './collections/Media'
import { Notifications } from './collections/Notifications'
import { Quizzes } from './collections/Quizzes'
import { Sections } from './collections/Sections'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Learn',
    },
  },
  collections: [
    Users,
    Media,
    Chapters,
    Sections,
    Lessons,
    Quizzes,
    LessonProgress,
    Notifications,
    Feedback,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    push: true,
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // Bypass Vercel serverless body size limit for admin uploads.
      clientUploads: true,
    }),
  ],
})
