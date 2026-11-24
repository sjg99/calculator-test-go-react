import type { ApiErrorCode, ErrorResponse } from './types'

/**
 * An error from the API, or from talking to it. `code` is stable and safe to
 * branch on; `message` is for logs.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode | (string & {})
  readonly status: number | null

  constructor(code: ApiError['code'], message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>

export interface HttpClient {
  postJson(path: string, body: unknown, signal?: AbortSignal): Promise<unknown>
}

export interface HttpClientOptions {
  baseUrl?: string
  fetch?: FetchFn
}

/**
 * Creates a small JSON-over-HTTP client. Failures are normalised to ApiError;
 * aborts are rethrown unchanged so callers can tell them apart.
 */
export function createHttpClient({ baseUrl = '', fetch = defaultFetch }: HttpClientOptions = {}): HttpClient {
  return {
    async postJson(path, body, signal) {
      let response: Response
      try {
        response = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
          signal,
        })
      } catch (err) {
        if (signal?.aborted) throw err
        throw new ApiError('network_error', err instanceof Error ? err.message : 'network request failed')
      }

      const payload = await readJson(response)
      if (!response.ok) {
        throw toApiError(payload, response.status)
      }
      return payload
    },
  }
}

const defaultFetch: FetchFn = (input, init) => globalThis.fetch(input, init)

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function toApiError(payload: unknown, status: number): ApiError {
  if (isErrorResponse(payload)) {
    return new ApiError(payload.error.code, payload.error.message, status)
  }
  // Not our API's error shape, for example a proxy's HTML 502 page.
  const code = status === 502 || status === 503 || status === 504 ? 'network_error' : 'invalid_response'
  return new ApiError(code, `unexpected response with status ${status}`, status)
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const error = (value as { error: unknown }).error
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}
