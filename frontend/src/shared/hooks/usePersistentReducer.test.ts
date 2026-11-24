import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePersistentReducer, type PersistenceOptions } from './usePersistentReducer'

interface Counter {
  count: number
  transient: string
}

type Action = 'increment'

const reducer = (state: Counter, action: Action): Counter =>
  action === 'increment' ? { ...state, count: state.count + 1 } : state

const initial: Counter = { count: 0, transient: 'initial' }

const options: PersistenceOptions<Counter> = {
  key: 'counter:v1',
  serialize: (state) => ({ count: state.count }),
  deserialize: (stored) =>
    typeof stored === 'object' && stored !== null && typeof (stored as { count?: unknown }).count === 'number'
      ? { count: (stored as { count: number }).count, transient: 'restored' }
      : null,
}

describe('usePersistentReducer', () => {
  it('starts from the initial state when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentReducer(reducer, initial, options))
    expect(result.current[0]).toEqual(initial)
  })

  it('saves the serialized state after each change', () => {
    const { result } = renderHook(() => usePersistentReducer(reducer, initial, options))

    act(() => result.current[1]('increment'))

    expect(result.current[0].count).toBe(1)
    expect(JSON.parse(localStorage.getItem('counter:v1')!)).toEqual({ count: 1 })
  })

  it('restores stored state on mount', () => {
    localStorage.setItem('counter:v1', JSON.stringify({ count: 41 }))

    const { result } = renderHook(() => usePersistentReducer(reducer, initial, options))

    expect(result.current[0]).toEqual({ count: 41, transient: 'restored' })
  })

  it('survives an unmount and remount, like closing and reopening the app', () => {
    const first = renderHook(() => usePersistentReducer(reducer, initial, options))
    act(() => first.result.current[1]('increment'))
    act(() => first.result.current[1]('increment'))
    first.unmount()

    const second = renderHook(() => usePersistentReducer(reducer, initial, options))
    expect(second.result.current[0].count).toBe(2)
  })

  it.each([
    ['invalid JSON', '{oops'],
    ['data that fails validation', JSON.stringify({ count: 'many' })],
  ])('falls back to the initial state for %s', (_, raw) => {
    localStorage.setItem('counter:v1', raw)
    const { result } = renderHook(() => usePersistentReducer(reducer, initial, options))
    expect(result.current[0]).toEqual(initial)
  })

  it('works without storage', () => {
    const { result } = renderHook(() => usePersistentReducer(reducer, initial, { ...options, storage: null }))

    act(() => result.current[1]('increment'))

    expect(result.current[0].count).toBe(1)
    expect(localStorage.getItem('counter:v1')).toBeNull()
  })
})
