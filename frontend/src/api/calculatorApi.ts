import { ApiError, createHttpClient, type HttpClient } from './client'
import type { CalculationRequest, CalculationResponse } from './types'

/** The calculator operations the UI needs. Injected so tests can fake it. */
export interface CalculatorApi {
  calculate(request: CalculationRequest, signal?: AbortSignal): Promise<CalculationResponse>
}

export function createCalculatorApi(http: HttpClient): CalculatorApi {
  return {
    async calculate(request, signal) {
      const payload = await http.postJson('/api/v1/calculate', request, signal)
      if (!isCalculationResponse(payload)) {
        throw new ApiError('invalid_response', 'calculation response has an unexpected shape')
      }
      return payload
    },
  }
}

function isCalculationResponse(value: unknown): value is CalculationResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { result?: unknown }).result === 'number' &&
    Number.isFinite((value as { result: number }).result)
  )
}

/** Default instance. VITE_API_BASE_URL is empty when the API is on the same origin. */
export const calculatorApi = createCalculatorApi(
  createHttpClient({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '' }),
)
