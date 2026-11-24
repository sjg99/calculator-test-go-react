import { useEffect, useReducer, useState } from 'react'
import { getLocalStorage, readJson, writeJson } from '../lib/storage'

export interface PersistenceOptions<S> {
  /** Storage key. Include a version so incompatible data is never read. */
  key: string
  /** Picks what to store. Leave out transient fields. */
  serialize: (state: S) => unknown
  /** Validates stored data and rebuilds the state, or returns null to discard it. */
  deserialize: (stored: unknown) => S | null
  /** Storage to use; defaults to localStorage. Pass null to disable persistence. */
  storage?: Storage | null
}

/**
 * useReducer whose state is restored from storage on mount and saved after
 * every change. Missing, corrupt or invalid data falls back to initialState.
 * Pass module-level serialize/deserialize functions so they stay stable.
 */
export function usePersistentReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  { key, serialize, deserialize, storage: storageOption }: PersistenceOptions<S>,
) {
  const [storage] = useState(() => (storageOption === undefined ? getLocalStorage() : storageOption))

  const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
    const stored = readJson(storage, key)
    return (stored === undefined ? null : deserialize(stored)) ?? initial
  })

  useEffect(() => {
    writeJson(storage, key, serialize(state))
  }, [storage, key, serialize, state])

  return [state, dispatch] as const
}
