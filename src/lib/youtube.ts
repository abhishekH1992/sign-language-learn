/** Extract a YouTube video id from common watch/embed/short URLs. */
export function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'v') {
        return parts[1] || null
      }
    }
  } catch {
    return null
  }

  return null
}
