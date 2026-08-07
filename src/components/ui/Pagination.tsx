import Link from 'next/link'
import type { PageSlice } from '@/lib/pagination'

type Props = {
  slice: Pick<PageSlice<unknown>, 'page' | 'totalPages' | 'hasPrev' | 'hasNext' | 'total'>
  hrefForPage: (page: number) => string
  label?: string
}

export function Pagination({ slice, hrefForPage, label = 'items' }: Props) {
  if (slice.totalPages <= 1) return null

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="muted pagination-meta">
        Page {slice.page} of {slice.totalPages} · {slice.total} {label}
      </p>
      <div className="pagination-actions">
        {slice.hasPrev ? (
          <Link className="btn btn-secondary" href={hrefForPage(slice.page - 1)}>
            ← Previous
          </Link>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true">
            ← Previous
          </span>
        )}
        {slice.hasNext ? (
          <Link className="btn btn-secondary" href={hrefForPage(slice.page + 1)}>
            Next →
          </Link>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true">
            Next →
          </span>
        )}
      </div>
    </nav>
  )
}
