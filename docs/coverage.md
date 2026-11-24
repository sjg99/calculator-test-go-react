# Test coverage report

Generated on 2026-11-24 from commit `cdc9f04` plus documentation changes. CI produces the same
reports on every push: see the job summary and the `backend-coverage` and `frontend-coverage`
artifacts of the [CI workflow](../.github/workflows/ci.yml).

## Summary

| Layer | Tests | Statements | Branches |
|-------|------:|-----------:|---------:|
| Backend (Go) | 124 test cases, including table-driven subtests | 92.9% | n/a (Go reports statements only) |
| Frontend (React) | 223 tests in 17 files | 100% | 99.6% |

## Backend

`go test ./... -coverprofile=coverage.out`

| Package | Role | Statements |
|---------|------|-----------:|
| `internal/core/calculator` | Domain: operations, rules, rounding, errors | 100% |
| `internal/config` | Environment configuration | 100% |
| `internal/api` | HTTP transport, validation, error mapping, middleware | 97.4% |
| `cmd/api` | Entry point, graceful shutdown, health check command | 71.1% |
| **Total** | | **92.9%** |

What is not covered, and why:

- `cmd/api`: `main()` itself (signal wiring and `os.Exit`). The logic lives in `run()` and
  `healthcheck()`, which are tested, including a real server start, a request and a clean
  shutdown.
- `internal/api`: the `Error()` and `Unwrap()` one-liners and the log line for a failed
  response write after the status was already sent (the client went away).

## Frontend

`npm run coverage` (Vitest with the V8 provider)

| Metric | Coverage |
|--------|---------:|
| Statements | 100% (295/295) |
| Branches | 99.58% (242/243) |
| Functions | 100% (106/106) |
| Lines | 100% (254/254) |

Every file is fully covered except one branch in `useCalculator.ts`: a successful response that
arrives after its request was aborted. The reducer ignores such stale answers by request id,
and that path is covered in the reducer tests.

## Reproducing

```bash
# Backend
cd backend
go test ./... -coverprofile=coverage.out
go tool cover -func=coverage.out        # per-function table
go tool cover -html=coverage.out        # browsable report

# Frontend
cd frontend
npm ci
npm run coverage                        # text table, plus HTML in coverage/index.html
```

`coverage/` and `coverage.out` are git-ignored; this file is the committed summary.
