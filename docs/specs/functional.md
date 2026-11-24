# Functional specification

Status: draft for review · Owner: candidate · Related: [architecture](architecture.md), [API contract](../../api/openapi.yaml)

## 1. Scope

A web calculator with a keypad. The React frontend collects input and shows results. Every
arithmetic operation is performed by a Go REST service. The frontend never computes results
itself, it only edits the text of the number being typed.

In scope: add, subtract, multiply, divide, power, square root, percentage, chaining, error
handling, keyboard input, history, session persistence, responsive layout.

Out of scope: expression parsing with operator precedence, memory keys (M+, MR), user
accounts, server-side history, themes.

## 2. Operations (backend)

All operands and results are IEEE-754 double precision numbers. Results are rounded to 12
significant digits, and `-0` is returned as `0` (see [ADR 0004](../adr/0004-float64-with-rounding.md)).

| Operation  | Symbol | Operands | Result | Domain errors |
|------------|:------:|:--------:|--------|---------------|
| `add`      | +      | 2 | a + b | `result_overflow` |
| `subtract` | −      | 2 | a − b | `result_overflow` |
| `multiply` | ×      | 2 | a × b | `result_overflow` |
| `divide`   | ÷      | 2 | a ÷ b | `division_by_zero` when b = 0; `result_overflow` |
| `power`    | xʸ     | 2 | aᵇ    | `division_by_zero` when a = 0 and b < 0; `undefined_result` when a < 0 and b is not an integer; `result_overflow` |
| `sqrt`     | √      | 1 | √a    | `negative_square_root` when a < 0 |
| `percent`  | %      | 1 or 2 | `[v]` → v ÷ 100; `[v, base]` → base × v ÷ 100 | `result_overflow` |

Errors common to every operation:

| Code | When |
|------|------|
| `unsupported_operation` | The operation name is not in the table above |
| `invalid_operand_count` | The number of operands is outside the allowed range |
| `invalid_operand` | An operand is NaN or ±Infinity (defensive; JSON cannot encode these) |
| `undefined_result` | The result would be NaN |
| `result_overflow` | The result would be ±Infinity |

### Acceptance criteria (API)

- **Given** `{"operation":"add","operands":[0.1,0.2]}` **then** 200 with `"result": 0.3`.
- **Given** `{"operation":"divide","operands":[10,0]}` **then** 422 with code `division_by_zero`.
- **Given** `{"operation":"sqrt","operands":[-9]}` **then** 422 with code `negative_square_root`.
- **Given** `{"operation":"percent","operands":[10,200]}` **then** 200 with `"result": 20`.
- **Given** `{"operation":"multiply","operands":[1e308,10]}` **then** 422 with code `result_overflow`.
- **Given** `{"operation":"modulo","operands":[5,2]}` **then** 422 with code `unsupported_operation`.
- **Given** `{"operation":"add","operands":[1]}` **then** 422 with code `invalid_operand_count`.
- **Given** a body that is not valid JSON, has unknown fields, misses `operation` or `operands`,
  or has a non-numeric operand **then** 400 with code `invalid_request`.
- **Given** a body larger than 1 MB **then** 413 with code `payload_too_large`.
- `GET /api/v1/operations` lists every operation with its symbol and operand range.
- `GET /healthz` returns 200 `{"status":"ok"}`.

## 3. Calculator behaviour (frontend)

The calculator works like a phone calculator. Operations are applied left to right as they are
entered; there is no operator precedence (`2 + 3 × 4 =` gives `20`). This is the standard
behaviour of keypad calculators and is decided in [ADR 0003](../adr/0003-keypad-interaction-and-single-endpoint.md).

### 3.1 Terms

- **Entry**: the number currently shown on the main display, as text.
- **Accumulator**: the left operand stored when a binary operator is pressed.
- **Pending operator**: the binary operator waiting for its right operand.
- **Expression line**: the smaller line above the entry, for example `12 ×` or `12 × 3 =`.

### 3.2 Number entry

| # | Given | When | Then |
|---|-------|------|------|
| E1 | Entry is `0` | press `7` | Entry is `7` (the leading zero is replaced) |
| E2 | Entry is `12` | press `3` | Entry is `123` |
| E3 | Entry is `12` | press `.` twice | Entry is `12.` (only one decimal point) |
| E4 | Entry is `0` | press `.` | Entry is `0.` |
| E5 | Entry has 16 digits | press a digit | Nothing changes |
| E6 | Entry is a result just computed | press a digit | Entry starts over with that digit |
| E7 | Entry is `123` | press backspace | Entry is `12`; on a single digit it becomes `0` |
| E8 | Entry is a result just computed | press backspace | Nothing changes |
| E9 | Entry is `5` | press `±` | Entry is `-5`; pressing again gives `5`; `0` stays `0` |

### 3.3 Binary operations and chaining

| # | Given | When | Then |
|---|-------|------|------|
| B1 | Entry `12` | press `×` | Accumulator `12`, pending `×`, expression line `12 ×` |
| B2 | Pending `12 ×`, no new digits typed | press `+` | Pending operator is replaced with `+` (no request) |
| B3 | Pending `12 ×`, entry `3` | press `=` | Request `multiply [12, 3]`; entry `36`; expression line `12 × 3 =` |
| B4 | Pending `2 +`, entry `3` | press `×` | Request `add [2, 3]`; accumulator `5`, pending `×` (chaining) |
| B5 | Pending `5 +`, no new digits typed | press `=` | Uses the entry as the right operand: `add [5, 5]` → `10` |
| B6 | No pending operator | press `=` | Nothing changes |
| B7 | A result was just shown | press an operator | The result becomes the accumulator |

### 3.4 Unary operations

| # | Given | When | Then |
|---|-------|------|------|
| U1 | Entry `16` | press `√` | Request `sqrt [16]`; entry `4`; pending operator is kept |
| U2 | Pending `9 +`, entry `16` | press `√`, then `=` | Entry `4`, then `add [9, 4]` → `13` |
| U3 | Entry `50`, no pending operator | press `%` | Request `percent [50]` → `0.5` |
| U4 | Pending `200 +` or `200 −`, entry `10` | press `%` | Request `percent [10, 200]` → entry `20`; `=` then gives `220` or `180` |
| U5 | Pending `200 ×`, `200 ÷` or `200 ^`, entry `10` | press `%` | Request `percent [10]` → entry `0.1`; `=` then gives `20` for `×` |

Percentage rules follow [ADR 0007](../adr/0007-contextual-percentage.md).

### 3.5 Errors and loading

| # | Given | When | Then |
|---|-------|------|------|
| R1 | Pending `10 ÷`, entry `0` | press `=` | Display shows "Can't divide by zero"; accumulator and pending operator are cleared |
| R2 | Display shows an error | press an operator, `=`, `%`, `√`, `±` or backspace | Nothing changes |
| R3 | Display shows an error | press a digit or `.` | The error is cleared and a new entry starts |
| R4 | Any state | press `AC` | Entry `0`, accumulator, pending operator and error cleared; history is kept |
| R5 | The service cannot be reached | any request | Display shows "Can't reach the calculator service" |
| R6 | A request is in flight | press any key | The key is ignored; keys look disabled |

Message per error code: `division_by_zero` "Can't divide by zero", `negative_square_root`
"No square root of a negative number", `result_overflow` "Result is too large",
`undefined_result` "Result is undefined", any other error "Something went wrong".

### 3.6 History

| # | Given | When | Then |
|---|-------|------|------|
| H1 | Any successful request | it completes | An entry is added at the top, e.g. `12 × 3 = 36`, `√16 = 4`, `10% of 200 = 20` |
| H2 | History has 50 entries | a new entry is added | The oldest entry is dropped |
| H3 | History has entries | click an entry | Its result becomes the entry, as if just computed (pending operator kept) |
| H4 | History has entries | press "Clear history" | History is empty |
| H5 | A request fails | it completes | Nothing is added to history |

### 3.7 Persistence

| # | Given | When | Then |
|---|-------|------|------|
| P1 | Entry, pending operation and history exist | the tab is closed and reopened | All of them are restored |
| P2 | A request was in flight | the tab is closed and reopened | The state before the request is restored, not loading |
| P3 | Stored data is corrupt or has an older schema version | the app loads | The app starts from the initial state without crashing |
| P4 | Storage is unavailable (private mode, quota) | the app runs | The app works; state is not persisted |

### 3.8 Keyboard

| Key | Action |
|-----|--------|
| `0`–`9` | digit |
| `.` or `,` | decimal point |
| `+` `-` `*` `/` `^` | add, subtract, multiply, divide, power |
| `Enter` or `=` | equals |
| `Backspace` | backspace |
| `Escape` or `Delete` | AC |
| `%` | percent |
| `r` | square root |
| `n` | ± (negate) |

Keyboard shortcuts are ignored while focus is in a text field and when Ctrl, Meta or Alt is held.

### 3.9 Layout

- Usable from 320 px wide. Keys are at least 44 × 44 px touch targets.
- Narrow screens: the keypad fills the width; history opens as a panel under the keypad.
- Wide screens (≥ 768 px): history is shown beside the keypad.
- Every key has an accessible name (e.g. "divide", "square root"); results are announced
  through an `aria-live` region.
