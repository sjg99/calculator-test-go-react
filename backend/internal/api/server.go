// Package api is the HTTP transport for the calculator. It decodes and
// validates requests, calls the core domain and maps domain errors to HTTP
// responses. It holds no business rules.
package api

import (
	"log/slog"
	"net/http"

	"github.com/sjg99/sezzle-calculator/backend/internal/core/calculator"
)

// Calculator is the domain behaviour the API needs. It is declared here, on
// the consumer side, so handlers can be tested with a fake.
type Calculator interface {
	Calculate(name calculator.Name, operands []float64) (calculator.Result, error)
	Operations() []calculator.Operation
}

// Options configures the handler.
type Options struct {
	// AllowedOrigins lists origins allowed to call the API from a browser.
	// Empty disables CORS, which is the normal setup behind a proxy.
	// "*" allows any origin.
	AllowedOrigins []string
}

// maxBodyBytes caps the size of request bodies.
const maxBodyBytes = 1 << 20 // 1 MB

// NewHandler returns the API's root handler with all routes and middleware.
func NewHandler(calc Calculator, logger *slog.Logger, opts Options) http.Handler {
	h := &handlers{calc: calc, logger: logger}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", h.calculate)
	mux.HandleFunc("GET /api/v1/operations", h.listOperations)
	mux.HandleFunc("GET /healthz", h.health)

	var handler http.Handler = mux
	handler = limitBody(handler, maxBodyBytes)
	handler = cors(handler, opts.AllowedOrigins)
	handler = recoverPanics(handler, logger)
	handler = logRequests(handler, logger)
	return handler
}
