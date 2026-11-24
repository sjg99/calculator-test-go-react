# 0002. Layered backend: core domain and API, no infrastructure layer

- Status: accepted
- Date: 2026-11-24

## Context

We want domain-driven design and clean-architecture boundaries without over-engineering a
stateless calculator. Go favours small packages named after what they provide, and
consumer-side interfaces, over deep layer hierarchies.

## Decision

- `internal/core/calculator` holds all business rules: the operations, their arity, validation
  of operands and results, rounding, and the domain errors. It imports only the standard library.
- `internal/api` holds the transport: routing, JSON encoding, validation of the request shape,
  mapping of domain errors to HTTP, and middleware. It depends on `core` through an interface
  it declares itself.
- `cmd/api` is the composition root.
- No infrastructure layer, because there is no database or external service. History lives on
  the client ([ADR 0006](0006-client-side-state-and-persistence.md)).
- Code lives under `internal/` so no other module can import it.

## Consequences

- The domain can be tested without HTTP, and the handlers can be tested with a fake domain.
- A new transport (gRPC, CLI) would reuse `core` unchanged.
- Adding persistence later means a port declared in `core` and an adapter in a new package,
  with no change to the existing layers.
- We skip a separate application-service layer: with one stateless use case it would only
  forward calls.
