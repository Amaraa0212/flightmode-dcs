/**
 * Base response type used by the pages (xmeta-admin convention).
 * Service-үүд Laravel-ийн `{ data }` / `{ message, data }`-г үүн рүү хөрвүүлнэ.
 */
export interface BaseResponse<T> {
  message: string
  body: T | null
}

/**
 * Pagination response type
 */
export interface PaginationResponse<T> {
  total: number
  items: Array<T>
}

/**
 * Common list params (mirrors useFilterParams output)
 */
export interface ListParams {
  current?: number
  pageSize?: number
  query?: string
  [key: string]: unknown
}

/** flightmode-api raw envelopes */
export interface ApiData<T> {
  data: T
}

export interface ApiAction<T> {
  message: string
  data?: T
}

/** flightmode-api error: `{ message, code?, errors? }` */
export interface ApiErrorBody {
  message: string
  code?: string
  errors?: Record<string, string[]>
}
