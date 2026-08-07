import type { Lesson, Media } from '@/payload-types'

type LessonImage = NonNullable<Lesson['image']>

/** Prefer uploaded Media; fall back to external URL. */
export function getLessonImageUrl(
  image: LessonImage | null | undefined,
  fallback = '',
): string {
  if (!image) return fallback

  if (typeof image.media === 'object' && image.media !== null) {
    const media = image.media as Media
    if (media.url) return media.url
  }

  if (image.url) return image.url

  return fallback
}
