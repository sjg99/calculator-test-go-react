# 0007. Contextual percentage

- Status: accepted
- Date: 2026-11-24

## Context

A plain `x ÷ 100` makes `200 + 10%` evaluate to `200.1`, which surprises users. Phone
calculators treat percent differently depending on the pending operator.

## Decision

- The backend `percent` operation accepts `[value]` (returns value ÷ 100) or `[value, base]`
  (returns base × value ÷ 100). The domain stays context-free.
- The frontend chooses the form:
  - pending `+` or `−`: send `[entry, accumulator]`, so `200 + 10%` → `200 + 20` → `220`;
  - pending `×`, `÷` or `^`, or nothing pending: send `[entry]`, so `200 × 10%` → `200 × 0.1` → `20`.

## Consequences

- Behaviour matches what users expect from phone calculators.
- The percentage arithmetic is in the domain. The choice of base is an interaction concern, so
  it lives in a frontend selector, where it is unit-tested.
