export const PAGE_SIZE = 10

export type PageSlice<T> = {
  items: T[]
  page: number
  totalPages: number
  total: number
  hasPrev: boolean
  hasNext: boolean
}

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number.parseInt(raw || '1', 10)
  if (!Number.isFinite(page) || page < 1) return 1
  return page
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): PageSlice<T> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    total,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  }
}
