package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/sjg99/sezzle-calculator/backend/internal/core/calculator"
)

type handlers struct {
	calc   Calculator
	logger *slog.Logger
}

func (h *handlers) calculate(w http.ResponseWriter, r *http.Request) {
	var req calculateRequest
	if err := decodeJSON(r, &req); err != nil {
		h.writeError(w, r, err)
		return
	}
	operands, err := validateCalculateRequest(req)
	if err != nil {
		h.writeError(w, r, err)
		return
	}

	result, err := h.calc.Calculate(calculator.Name(req.Operation), operands)
	if err != nil {
		h.writeError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, calculateResponse{
		Operation: string(result.Operation),
		Operands:  result.Operands,
		Result:    result.Value,
	})
}

func (h *handlers) listOperations(w http.ResponseWriter, _ *http.Request) {
	ops := h.calc.Operations()
	resp := operationsResponse{Operations: make([]operationResponse, 0, len(ops))}
	for _, op := range ops {
		resp.Operations = append(resp.Operations, operationResponse{
			Name:        string(op.Name),
			Symbol:      op.Symbol,
			MinOperands: op.MinOperands,
			MaxOperands: op.MaxOperands,
		})
	}
	h.writeJSON(w, http.StatusOK, resp)
}

func (h *handlers) health(w http.ResponseWriter, _ *http.Request) {
	h.writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}

// validateCalculateRequest checks the request shape and returns the operands.
// Rules about the operation itself (arity, values) belong to the domain.
func validateCalculateRequest(req calculateRequest) ([]float64, error) {
	if req.Operation == "" {
		return nil, badRequest("operation is required")
	}
	if len(req.Operands) == 0 {
		return nil, badRequest("operands must be a non-empty array of numbers")
	}
	operands := make([]float64, len(req.Operands))
	for i, v := range req.Operands {
		if v == nil {
			return nil, badRequest(fmt.Sprintf("operands.%d must be a number, got null", i))
		}
		operands[i] = *v
	}
	return operands, nil
}

// decodeJSON decodes a single JSON object from the body into dst, rejecting
// unknown fields and trailing data.
func decodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		var maxErr *http.MaxBytesError
		var typeErr *json.UnmarshalTypeError
		var syntaxErr *json.SyntaxError
		switch {
		case errors.As(err, &maxErr):
			return &apiError{
				status:  http.StatusRequestEntityTooLarge,
				code:    codePayloadTooLarge,
				message: fmt.Sprintf("request body must not exceed %d bytes", maxErr.Limit),
			}
		case errors.Is(err, io.EOF):
			return badRequest("request body is required")
		case errors.As(err, &syntaxErr), errors.Is(err, io.ErrUnexpectedEOF):
			return badRequest("request body is not valid JSON")
		case errors.As(err, &typeErr):
			if typeErr.Field == "" {
				return badRequest("request body must be a JSON object")
			}
			// Also covers numbers outside the float64 range, such as 1e400.
			return badRequest(fmt.Sprintf("%s: cannot use %s as %s", typeErr.Field, typeErr.Value, typeErr.Type))
		default:
			// Unknown fields and numbers out of float64 range land here.
			return badRequest(err.Error())
		}
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return badRequest("request body must contain a single JSON object")
	}
	return nil
}

func (h *handlers) writeError(w http.ResponseWriter, r *http.Request, err error) {
	var apiErr *apiError
	if !errors.As(err, &apiErr) {
		var ok bool
		if apiErr, ok = fromDomainError(err); !ok {
			h.logger.ErrorContext(r.Context(), "unexpected error", "error", err, "path", r.URL.Path)
			apiErr = &apiError{status: http.StatusInternalServerError, code: codeInternal, message: "internal server error"}
		}
	}
	h.writeJSON(w, apiErr.status, errorResponse{Error: errorDetail{Code: apiErr.code, Message: apiErr.message}})
}

func (h *handlers) writeJSON(w http.ResponseWriter, status int, body any) {
	writeJSON(w, status, body, h.logger)
}

func writeJSON(w http.ResponseWriter, status int, body any, logger *slog.Logger) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		// The status is already sent; the client most likely went away.
		logger.Warn("writing response failed", "error", err)
	}
}
