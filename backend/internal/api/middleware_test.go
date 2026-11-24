package api_test

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sjg99/calculator-test-go-react/backend/internal/api"
	"github.com/sjg99/calculator-test-go-react/backend/internal/core/calculator"
)

func TestRecoverPanics(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	h := api.NewHandler(fakeCalculator{panic: "boom"}, logger, api.Options{})

	rec := do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"add","operands":[1,2]}`)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if got := decode[errorBody](t, rec); got.Error.Code != "internal_error" {
		t.Errorf("code = %q, want internal_error", got.Error.Code)
	}
	if !strings.Contains(logs.String(), "panic=boom") {
		t.Errorf("panic not logged; logs:\n%s", logs.String())
	}
	if !strings.Contains(logs.String(), "status=500") {
		t.Errorf("request log does not show status 500; logs:\n%s", logs.String())
	}
}

func TestRecoverPanics_RepanicsOnErrAbortHandler(t *testing.T) {
	h := api.NewHandler(fakeCalculator{panic: http.ErrAbortHandler}, discardLogger, api.Options{})

	defer func() {
		if p := recover(); p != http.ErrAbortHandler {
			t.Errorf("recovered %v, want http.ErrAbortHandler", p)
		}
	}()
	do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"add","operands":[1,2]}`)
}

func TestLogRequests(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	h := api.NewHandler(calculator.New(), logger, api.Options{})

	do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"divide","operands":[1,0]}`)

	out := logs.String()
	for _, want := range []string{"msg=request", "method=POST", "path=/api/v1/calculate", "status=422", "duration="} {
		if !strings.Contains(out, want) {
			t.Errorf("log line missing %q; logs:\n%s", want, out)
		}
	}
}

func TestCORS(t *testing.T) {
	const allowed = "http://localhost:5173"
	h := api.NewHandler(calculator.New(), discardLogger, api.Options{AllowedOrigins: []string{allowed}})

	t.Run("allowed origin on a simple request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		req.Header.Set("Origin", allowed)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != allowed {
			t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, allowed)
		}
		if got := rec.Header().Get("Vary"); got != "Origin" {
			t.Errorf("Vary = %q, want Origin", got)
		}
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, want 200", rec.Code)
		}
	})

	t.Run("allowed origin preflight", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/calculate", nil)
		req.Header.Set("Origin", allowed)
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Errorf("status = %d, want 204", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, "POST") {
			t.Errorf("Access-Control-Allow-Methods = %q, want it to contain POST", got)
		}
		if got := rec.Header().Get("Access-Control-Allow-Headers"); got != "Content-Type" {
			t.Errorf("Access-Control-Allow-Headers = %q, want Content-Type", got)
		}
	})

	t.Run("other origin gets no CORS headers", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		req.Header.Set("Origin", "https://evil.example")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Access-Control-Allow-Origin = %q, want empty", got)
		}
	})

	t.Run("wildcard allows any origin", func(t *testing.T) {
		h := api.NewHandler(calculator.New(), discardLogger, api.Options{AllowedOrigins: []string{"*"}})
		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		req.Header.Set("Origin", "https://anything.example")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://anything.example" {
			t.Errorf("Access-Control-Allow-Origin = %q", got)
		}
	})

	t.Run("disabled by default", func(t *testing.T) {
		h := api.NewHandler(calculator.New(), discardLogger, api.Options{})
		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		req.Header.Set("Origin", allowed)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Access-Control-Allow-Origin = %q, want empty", got)
		}
	})
}
