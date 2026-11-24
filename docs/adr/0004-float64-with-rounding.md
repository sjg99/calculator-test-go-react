# 0004. float64 arithmetic with result rounding

- Status: accepted
- Date: 2026-11-24

## Context

Binary floating point cannot represent most decimal fractions, so `0.1 + 0.2` is
`0.30000000000000004`. An arbitrary-precision decimal library fixes this for the four basic
operations but not for square root or fractional powers, and it adds a dependency.

## Decision

- Use `float64` in the domain and JSON numbers in the API.
- Round every result to 12 significant digits before returning it, and turn `-0` into `0`.
  Rounding away the last digits of a double hides the usual representation errors.
- Reject non-finite values: NaN results return `undefined_result`, ±Inf results return
  `result_overflow`, and non-finite operands return `invalid_operand`.

## Consequences

- No dependencies, and the code is simple and well understood.
- `0.1 + 0.2` returns `0.3`. Results are exact to 12 significant digits, which is more than a
  calculator display shows.
- Not suitable for money ledgers, where exact decimal arithmetic matters. Those would need a
  decimal type, and the operation registry keeps that change contained.
- Values beyond about ±1.8e308 cannot be represented and are reported as overflow.
