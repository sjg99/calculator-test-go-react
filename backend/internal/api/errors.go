package api

import (
	"errors"
	"net/http"

	"github.com/sjg99/sezzle-calculator/backend/internal/core/calculator"
)

// Error codes returned in error bodies. Clients rely on these, not on messages.
const (
	codeInvalidRequest  = "invalid_request"
	codePayloadTooLarge = "payload_too_large"
	codeInternal        = "internal_error"
)

// domainErrorCodes maps each domain error to its API error code. All domain
// errors are answered with 422 Unprocessable Entity.
var domainErrorCodes = []struct {
	err  error
	code string
}{
	{calculator.ErrUnsupportedOperation, "unsupported_operation"},
	{calculator.ErrInvalidOperandCount, "invalid_operand_count"},
	{calculator.ErrInvalidOperand, "invalid_operand"},
	{calculator.ErrDivisionByZero, "division_by_zero"},
	{calculator.ErrNegativeSquareRoot, "negative_square_root"},
	{calculator.ErrUndefinedResult, "undefined_result"},
	{calculator.ErrResultOverflow, "result_overflow"},
}

// apiError is an error that already knows how it is shown to clients.
type apiError struct {
	status  int
	code    string
	message string
}

func (e *apiError) Error() string { return e.message }

func badRequest(message string) *apiError {
	return &apiError{status: http.StatusBadRequest, code: codeInvalidRequest, message: message}
}

// fromDomainError converts an error from the calculator into an apiError.
// The boolean is false when the error is not a known domain error.
func fromDomainError(err error) (*apiError, bool) {
	for _, d := range domainErrorCodes {
		if errors.Is(err, d.err) {
			return &apiError{status: http.StatusUnprocessableEntity, code: d.code, message: err.Error()}, true
		}
	}
	return nil, false
}
