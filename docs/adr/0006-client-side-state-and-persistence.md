# 0006. Client-side state, persistence and history

- Status: accepted
- Date: 2026-11-24

## Context

The user should be able to close the calculator and continue later. There are no user
accounts. Options for history were client-side storage, server-side in memory, or server-side
SQLite. Options for state management were `useReducer`, Zustand, or Zustand with TanStack Query.

## Decision

- Keep all user state in the browser's `localStorage`: the entry, the pending operation and up
  to 50 history items. The backend stays stateless.
- Model the calculator as a pure reducer. Arithmetic intents become a `pendingRequest` in
  state; a `useCalculator` hook performs the request and dispatches the outcome.
- A reusable `usePersistentReducer` hook handles hydration and saving under a versioned key
  (`sezzle-calculator:v1`). Stored data is validated on load and discarded when invalid.
  Transient fields (loading, in-flight request) are not stored.
- No state or data-fetching library. Calculation results are not cached, since each request is
  a cheap, deterministic command.

## Consequences

- Persistence needs no backend, auth or database, and saved history can be viewed offline.
- History is per browser and is not shared across devices.
- The reducer can be tested without React, and the hook is tested with an injected fake API.
- A schema change means bumping the storage key version; old data is ignored rather than
  migrated, which is acceptable for a calculator.
