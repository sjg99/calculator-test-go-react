# 0001. Spec-driven development with ADRs

- Status: accepted
- Date: 2026-11-24

## Context

The assessment values correctness, clarity and maintainability, and asks for documented design
decisions. The work is done with an AI assistant, so the intent behind the code needs to be
written down where both the reviewer and the assistant can check it.

## Decision

Write the specification before the code:

- `docs/specs/functional.md`: behaviour as Given/When/Then tables, which tests follow directly.
- `docs/specs/architecture.md`: layers, modules and the dependency rule.
- `api/openapi.yaml`: the API contract shared by frontend and backend.
- `docs/adr/`: one short Architecture Decision Record per significant decision.

The specs are reviewed before implementation starts. When the implementation shows that a spec
is wrong, the spec is updated in the same commit as the code.

## Consequences

- Reviewers can read the reasoning without reading the code.
- Tests map to acceptance criteria, which makes gaps visible.
- Some time goes into documents up front, which the time box allows for a project this size.
