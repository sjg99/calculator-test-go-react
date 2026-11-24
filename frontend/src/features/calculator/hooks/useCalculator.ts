import { useEffect, useMemo } from 'react'
import { calculatorApi as defaultApi, type CalculatorApi } from '../../../api/calculatorApi'
import { ApiError } from '../../../api/client'
import type { BinaryOperation } from '../../../api/types'
import { usePersistentReducer } from '../../../shared/hooks/usePersistentReducer'
import { calculatorReducer, initialState } from '../state/calculatorReducer'
import { calculatorPersistence } from '../state/persistence'
import type { Digit } from '../state/types'

export interface CalculatorActions {
  inputDigit(digit: Digit): void
  inputDecimal(): void
  backspace(): void
  toggleSign(): void
  clear(): void
  chooseOperator(operator: BinaryOperation): void
  equals(): void
  squareRoot(): void
  percent(): void
  recallHistoryEntry(id: number): void
  clearHistory(): void
}

/**
 * Connects the pure calculator state machine to the API and to storage.
 * The reducer decides what to calculate; this hook sends the request,
 * cancels it if it becomes stale, and reports the outcome back.
 */
export function useCalculator(api: CalculatorApi = defaultApi) {
  const [state, dispatch] = usePersistentReducer(calculatorReducer, initialState, calculatorPersistence)
  const { pendingRequest } = state

  useEffect(() => {
    if (!pendingRequest) return

    const controller = new AbortController()
    const { id } = pendingRequest
    api.calculate(pendingRequest.request, controller.signal).then(
      (response) => {
        if (!controller.signal.aborted) dispatch({ type: 'requestSucceeded', requestId: id, result: response.result })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) dispatch({ type: 'requestFailed', requestId: id, error: errorCode(error) })
      },
    )
    return () => controller.abort()
  }, [api, pendingRequest, dispatch])

  const actions = useMemo<CalculatorActions>(
    () => ({
      inputDigit: (digit) => dispatch({ type: 'digit', digit }),
      inputDecimal: () => dispatch({ type: 'decimal' }),
      backspace: () => dispatch({ type: 'backspace' }),
      toggleSign: () => dispatch({ type: 'toggleSign' }),
      clear: () => dispatch({ type: 'clear' }),
      chooseOperator: (operator) => dispatch({ type: 'operator', operator }),
      equals: () => dispatch({ type: 'equals' }),
      squareRoot: () => dispatch({ type: 'sqrt' }),
      percent: () => dispatch({ type: 'percent' }),
      recallHistoryEntry: (id) => dispatch({ type: 'recallHistoryEntry', id }),
      clearHistory: () => dispatch({ type: 'clearHistory' }),
    }),
    [dispatch],
  )

  return { state, actions, isBusy: pendingRequest !== null }
}

function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : 'unknown_error'
}
