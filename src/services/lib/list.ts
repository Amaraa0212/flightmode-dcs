import type { ListParams, PaginationResponse } from '../types/shared/common.types'

/**
 * flightmode-api-ийн DCS жагсаалтууд (passengers, baggage, flights) pagination-гүй
 * бүх мөрийг буцаадаг. BaseTable-ийн хайлт / шүүлт / хуудаслалтыг энд хийнэ.
 */

function valueAt(row: unknown, path: string) {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      row
    )
}

function matchesQuery(row: unknown, query: string, keys: string[]) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return keys.some((key) => {
    const value = valueAt(row, key)
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '')
    return text.toLowerCase().includes(q)
  })
}

function matchesFilter(value: unknown, filter: unknown) {
  if (filter === undefined || filter === null || filter === '') return true
  if (Array.isArray(filter)) {
    return filter.length === 0 || filter.map(String).includes(String(value))
  }
  return String(value) === String(filter)
}

export interface ListOptions<T> {
  /** Search хийх талбарууд (nested: 'agency.name') */
  searchKeys?: string[]
  /** params-аас шүүх талбарууд: { paramKey: (row) => value } */
  filters?: Record<string, (row: T) => unknown>
}

export function filterAndPaginate<T>(
  rows: T[],
  params: ListParams = {},
  options: ListOptions<T> = {}
): PaginationResponse<T> {
  const { searchKeys = [], filters = {} } = options
  const current = params.current ?? 1
  const pageSize = params.pageSize ?? 20

  const filtered = rows.filter((row) => {
    if (params.query && !matchesQuery(row, params.query, searchKeys)) return false
    return Object.entries(filters).every(([key, getValue]) =>
      matchesFilter(getValue(row), params[key])
    )
  })

  const start = (current - 1) * pageSize
  return { total: filtered.length, items: filtered.slice(start, start + pageSize) }
}
