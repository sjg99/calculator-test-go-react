import { describe, expect, it, vi } from 'vitest'
import { calculatorApi, createCalculatorApi } from './calculatorApi'
import type { HttpClient } from './client'

function fakeHttp(response: unknown): HttpClient & { postJson: ReturnType<typeof vi.fn> } {
  return { postJson: vi.fn().mockResolvedValue(response) }
}

describe('createCalculatorApi().calculate', () => {
  it('posts the request to the calculate endpoint and returns the response', async () => {
    const response = { operation: 'divide', operands: [10, 4], result: 2.5 }
    const http = fakeHttp(response)
    const signal = new AbortController().signal

    const result = await createCalculatorApi(http).calculate({ operation: 'divide', operands: [10, 4] }, signal)

    expect(result).toEqual(response)
    expect(http.postJson).toHaveBeenCalledWith('/api/v1/calculate', { operation: 'divide', operands: [10, 4] }, signal)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['missing result', { operation: 'add' }],
    ['string result', { result: '5' }],
    ['non-finite result', { result: Number.POSITIVE_INFINITY }],
  ])('rejects a malformed response (%s)', async (_, payload) => {
    await expect(
      createCalculatorApi(fakeHttp(payload)).calculate({ operation: 'add', operands: [1, 2] }),
    ).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('exposes a default instance', () => {
    expect(typeof calculatorApi.calculate).toBe('function')
  })
})
