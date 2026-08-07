import type { Lesson, Media } from '@/payload-types'

type LessonImage = NonNullable<Lesson['image']>

/** Prefer uploaded Media when present; otherwise use URL (e.g. `/alphabet/A.png`). */
export function getLessonImageUrl(
  image: LessonImage | null | undefined,
  fallback = '',
): string {
  if (!image) return fallback

  if (image.source !== 'url' && typeof image.media === 'object' && image.media !== null) {
    const media = image.media as Media
    if (media.url) return media.url
  }

  if (image.url) return image.url

  if (typeof image.media === 'object' && image.media !== null) {
    const media = image.media as Media
    if (media.url) return media.url
  }

  return fallback
}
