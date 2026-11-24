# 0003. Keypad interaction and a single calculate endpoint

- Status: accepted
- Date: 2026-11-24

## Context

The assignment lists individual operations, not expressions. Two models were considered: a
keypad that sends one operation at a time, or free-form expressions parsed by the backend.
For the API, the options were one generic endpoint, one endpoint per operation, or GET with
query parameters.

## Decision

- The UI is a classic keypad. Operations are applied left to right as entered, like a phone
  calculator, and each step sends one operation to the backend.
- The API exposes `POST /api/v1/calculate` with `{"operation": "...", "operands": [...]}`.
  Operations are resolved through a registry in the domain.
- `GET /api/v1/operations` lists the supported operations, and `GET /healthz` reports liveness.
- The API is versioned in the path (`/api/v1`).

## Consequences

- The domain stays small and fully testable; there is no parser to get wrong.
- Adding an operation means adding a registry entry, with no new route or handler.
- `2 + 3 × 4` gives `20`, not `14`. This is standard for keypad calculators and is stated in
  the functional spec.
- One POST per step costs a round trip each time. For a calculator on a fast API this is
  acceptable, and the UI shows a loading state.
- POST is used because a calculation is a command with a JSON body that needs validation.
  Caching GET responses would bring no real benefit here.
