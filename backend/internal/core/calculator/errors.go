package calculator

import "errors"

// Domain errors returned by [Calculator.Calculate]. They may be wrapped with
// extra context, so callers should compare them with [errors.Is].
var (
	// ErrUnsupportedOperation means the operation name is not registered.
	ErrUnsupportedOperation = errors.New("unsupported operation")
	// ErrInvalidOperandCount means the operation does not accept that many operands.
	ErrInvalidOperandCount = errors.New("invalid number of operands")
	// ErrInvalidOperand means an operand is NaN or infinite.
	ErrInvalidOperand = errors.New("operand must be a finite number")
	// ErrDivisionByZero means the operation would divide by zero.
	ErrDivisionByZero = errors.New("division by zero")
	// ErrNegativeSquareRoot means a square root of a negative number was requested.
	ErrNegativeSquareRoot = errors.New("square root of a negative number")
	// ErrUndefinedResult means the result is not a real number (NaN).
	ErrUndefinedResult = errors.New("result is undefined")
	// ErrResultOverflow means the result is too large to represent (±Inf).
	ErrResultOverflow = errors.New("result is too large to represent")
)
