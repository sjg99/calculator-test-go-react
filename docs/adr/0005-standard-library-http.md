# 0005. Standard library net/http

- Status: accepted
- Date: 2026-11-24

## Context

The API has three routes and a few middlewares. The options were the standard library, a
lightweight router such as chi, or a framework such as gin or echo.

## Decision

Use `net/http` with Go 1.22+ routing patterns (`mux.HandleFunc("POST /api/v1/calculate", ...)`),
`log/slog` for structured logs, and small hand-written middleware: panic recovery, request
logging, optional CORS and a request body size limit.

## Consequences

- No third-party dependencies in the backend, so there is nothing to update or audit.
- Handlers are plain `http.Handler`s, so they are easy to test with `httptest`.
- The standard mux answers 405 and 404 with plain-text bodies. That is acceptable for routes
  outside the contract.
- With many more routes or complex middleware chains, switching to chi would be cheap because
  it uses the same interfaces.
