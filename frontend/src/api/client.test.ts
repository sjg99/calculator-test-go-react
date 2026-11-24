import { describe, expect, it, vi } from 'vitest'
import { ApiError, createHttpClient, type FetchFn } from './client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createHttpClient().postJson', () => {
  it('posts JSON to baseUrl + path and returns the parsed body', async () => {
    const fetch = vi.fn<FetchFn>().mockResolvedValue(jsonResponse({ ok: true }))
    const client = createHttpClient({ baseUrl: 'http://api.test', fetch })

    await expect(client.postJson('/things', { a: 1 })).resolves.toEqual({ ok: true })

    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe('http://api.test/things')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"a":1}')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  })

  it('passes the abort signal to fetch', async () => {
    const fetch = vi.fn<FetchFn>().mockResolvedValue(jsonResponse({}))
    const controller = new AbortController()

    await createHttpClient({ fetch }).postJson('/x', {}, controller.signal)

    expect(fetch.mock.calls[0]![1]?.signal).toBe(controller.signal)
  })

  it('turns an API error body into ApiError with its code and status', async () => {
    const fetch = vi.fn<FetchFn>().mockResolvedValue(
      jsonResponse({ error: { code: 'division_by_zero', message: 'division by zero' } }, 422),
    )

    const error = await createHttpClient({ fetch }).postJson('/x', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'division_by_zero', message: 'division by zero', status: 422 })
  })

  it('treats a gateway error without an API body as a network error', async () => {
    const fetch = vi.fn<FetchFn>().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))

    await expect(createHttpClient({ fetch }).postJson('/x', {})).rejects.toMatchObject({
      code: 'network_error',
      status: 502,
    })
  })

  it('treats any other unexpected error body as an invalid response', async () => {
    const fetch = vi.fn<FetchFn>().mockResolvedValue(jsonResponse({ nope: true }, 500))

    await expect(createHttpClient({ fetch }).postJson('/x', {})).rejects.toMatchObject({
      code: 'invalid_response',
      status: 500,
    })
  })

  it('returns undefined for a successful response that is not JSON', async () => {
    const fetch = vi.fn<FetchFn>().mockResolvedValue(new Response('plain text', { status: 200 }))

    await expect(createHttpClient({ fetch }).postJson('/x', {})).resolves.toBeUndefined()
  })

  it('wraps a failed fetch in a network_error ApiError', async () => {
    const fetch = vi.fn<FetchFn>().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(createHttpClient({ fetch }).postJson('/x', {})).rejects.toMatchObject({
      name: 'ApiError',
      code: 'network_error',
      message: 'Failed to fetch',
      status: null,
    })
  })

  it('wraps a non-Error rejection in a network_error ApiError', async () => {
    const fetch = vi.fn<FetchFn>().mockRejectedValue('offline')

    await expect(createHttpClient({ fetch }).postJson('/x', {})).rejects.toMatchObject({
      code: 'network_error',
      message: 'network request failed',
    })
  })

  it('rethrows the abort error unchanged when the request was aborted', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('aborted', 'AbortError')
    const fetch = vi.fn<FetchFn>().mockImplementation(() => {
      controller.abort()
      return Promise.reject(abortError)
    })

    await expect(createHttpClient({ fetch }).postJson('/x', {}, controller.signal)).rejects.toBe(abortError)
  })

  it('uses the global fetch by default', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: 1 }))

    await expect(createHttpClient().postJson('/x', {})).resolves.toEqual({ ok: 1 })
    expect(spy).toHaveBeenCalledWith('/x', expect.objectContaining({ method: 'POST' }))
  })
})
