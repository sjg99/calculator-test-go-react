import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CalculatorApi } from '../../../api/calculatorApi'
import { ApiError } from '../../../api/client'
import type { CalculationRequest, CalculationResponse } from '../../../api/types'
import { STORAGE_KEY } from '../state/persistence'
import { fakeServer } from '../state/testing'
import { useCalculator } from './useCalculator'

/** An API backed by the fake server, answering asynchronously. */
function fakeApi(): CalculatorApi & { calculate: ReturnType<typeof vi.fn> } {
  return {
    calculate: vi.fn(async (request: CalculationRequest): Promise<CalculationResponse> => {
      const reply = fakeServer(request)
      if ('error' in reply) throw new ApiError(reply.error, reply.error, 422)
      return { ...request, result: reply.result }
    }),
  }
}

/** An API whose requests stay open until the test settles them. */
function controllableApi() {
  const calls: { request: CalculationRequest; signal?: AbortSignal; resolve: (r: number) => void; reject: (e: unknown) => void }[] = []
  const api: CalculatorApi = {
    calculate: (request, signal) =>
      new Promise((resolve, reject) => {
        calls.push({ request, signal, resolve: (result) => resolve({ ...request, result }), reject })
      }),
  }
  return { api, calls }
}

describe('useCalculator', () => {
  it('sends the calculation to the API and shows the result', async () => {
    const api = fakeApi()
    const { result } = renderHook(() => useCalculator(api))

    act(() => {
      result.current.actions.inputDigit('1')
      result.current.actions.inputDigit('2')
      result.current.actions.chooseOperator('multiply')
      result.current.actions.inputDigit('3')
      result.current.actions.equals()
    })

    expect(result.current.isBusy).toBe(true)
    await waitFor(() => expect(result.current.state.entry).toBe('36'))
    expect(result.current.isBusy).toBe(false)
    expect(api.calculate).toHaveBeenCalledWith({ operation: 'multiply', operands: [12, 3] }, expect.any(AbortSignal))
  })

  it('exposes every action', async () => {
    const api = fakeApi()
    const { result } = renderHook(() => useCalculator(api))
    const run = async (fn: () => void) => {
      act(fn)
      await waitFor(() => expect(result.current.isBusy).toBe(false))
    }

    await run(() => result.current.actions.inputDigit('9'))
    await run(() => result.current.actions.squareRoot())
    expect(result.current.state.entry).toBe('3')

    await run(() => result.current.actions.percent())
    expect(result.current.state.entry).toBe('0.03')

    await run(() => {
      result.current.actions.inputDigit('5')
      result.current.actions.inputDecimal()
      result.current.actions.inputDigit('5')
      result.current.actions.backspace()
      result.current.actions.toggleSign()
    })
    expect(result.current.state.entry).toBe('-5.')

    const [first] = result.current.state.history
    await run(() => result.current.actions.recallHistoryEntry(first!.id))
    expect(result.current.state.entry).toBe(String(first!.result))

    await run(() => result.current.actions.clearHistory())
    expect(result.current.state.history).toEqual([])

    await run(() => result.current.actions.clear())
    expect(result.current.state.entry).toBe('0')
  })

  it('maps API errors to the state error code', async () => {
    const { result } = renderHook(() => useCalculator(fakeApi()))

    act(() => {
      result.current.actions.inputDigit('1')
      result.current.actions.chooseOperator('divide')
      result.current.actions.inputDigit('0')
      result.current.actions.equals()
    })

    await waitFor(() => expect(result.current.state.error).toBe('division_by_zero'))
  })

  it('reports unexpected failures as unknown_error', async () => {
    const api: CalculatorApi = { calculate: () => Promise.reject(new Error('bug')) }
    const { result } = renderHook(() => useCalculator(api))

    act(() => {
      result.current.actions.inputDigit('4')
      result.current.actions.squareRoot()
    })

    await waitFor(() => expect(result.current.state.error).toBe('unknown_error'))
  })

  it('aborts the request and ignores its outcome when AC is pressed', async () => {
    const { api, calls } = controllableApi()
    const { result } = renderHook(() => useCalculator(api))

    act(() => {
      result.current.actions.inputDigit('4')
      result.current.actions.squareRoot()
    })
    expect(calls).toHaveLength(1)

    act(() => result.current.actions.clear())
    expect(calls[0]!.signal?.aborted).toBe(true)

    await act(async () => calls[0]!.resolve(2))
    expect(result.current.state).toMatchObject({ entry: '0', history: [] })

    await act(async () => calls[0]!.reject(new ApiError('network_error', 'x')))
    expect(result.current.state.error).toBeNull()
  })

  it('aborts the request on unmount', () => {
    const { api, calls } = controllableApi()
    const { result, unmount } = renderHook(() => useCalculator(api))

    act(() => {
      result.current.actions.inputDigit('4')
      result.current.actions.squareRoot()
    })
    unmount()

    expect(calls[0]!.signal?.aborted).toBe(true)
  })

  it('persists state and history across sessions (spec P1)', async () => {
    const first = renderHook(() => useCalculator(fakeApi()))
    act(() => {
      first.result.current.actions.inputDigit('7')
      first.result.current.actions.chooseOperator('add')
      first.result.current.actions.inputDigit('3')
      first.result.current.actions.equals()
    })
    await waitFor(() => expect(first.result.current.state.entry).toBe('10'))
    act(() => {
      first.result.current.actions.chooseOperator('multiply')
      first.result.current.actions.inputDigit('2')
    })
    first.unmount()

    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()

    const second = renderHook(() => useCalculator(fakeApi()))
    expect(second.result.current.state).toMatchObject({
      entry: '2',
      accumulator: 10,
      pendingOperator: 'multiply',
      expression: '10 ×',
    })
    expect(second.result.current.state.history.map((h) => h.expression)).toEqual(['7 + 3'])
  })

  it('does not resume a request that was in flight when the session ended (spec P2)', () => {
    const { api, calls } = controllableApi()
    const first = renderHook(() => useCalculator(api))
    act(() => {
      first.result.current.actions.inputDigit('9')
      first.result.current.actions.squareRoot()
    })
    first.unmount()

    const second = renderHook(() => useCalculator(api))
    expect(second.result.current.isBusy).toBe(false)
    expect(second.result.current.state.entry).toBe('9')
    expect(calls).toHaveLength(1)
  })
})
