package api_test

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sjg99/sezzle-calculator/backend/internal/api"
	"github.com/sjg99/sezzle-calculator/backend/internal/core/calculator"
)

var discardLogger = slog.New(slog.NewTextHandler(io.Discard, nil))

func newServer(calc api.Calculator, opts api.Options) http.Handler {
	return api.NewHandler(calc, discardLogger, opts)
}

func do(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

type errorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	var v T
	if err := json.NewDecoder(rec.Body).Decode(&v); err != nil {
		t.Fatalf("decoding response body: %v", err)
	}
	return v
}

func TestCalculate_Success(t *testing.T) {
	h := newServer(calculator.New(), api.Options{})
	tests := []struct {
		name string
		body string
		want float64
	}{
		{"divide", `{"operation":"divide","operands":[10,4]}`, 2.5},
		{"add rounds float error", `{"operation":"add","operands":[0.1,0.2]}`, 0.3},
		{"sqrt", `{"operation":"sqrt","operands":[16]}`, 4},
		{"percent of base", `{"operation":"percent","operands":[10,200]}`, 20},
		{"percent alone", `{"operation":"percent","operands":[50]}`, 0.5},
		{"power", `{"operation":"power","operands":[2,10]}`, 1024},
		{"exponent notation", `{"operation":"multiply","operands":[1e3,2E-1]}`, 200},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, "/api/v1/calculate", tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
			}
			got := decode[struct {
				Operation string    `json:"operation"`
				Operands  []float64 `json:"operands"`
				Result    float64   `json:"result"`
			}](t, rec)
			if got.Result != tt.want {
				t.Errorf("result = %v, want %v", got.Result, tt.want)
			}
		})
	}
}

func TestCalculate_ResponseShape(t *testing.T) {
	h := newServer(calculator.New(), api.Options{})
	rec := do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"divide","operands":[10,4]}`)

	want := `{"operation":"divide","operands":[10,4],"result":2.5}` + "\n"
	if rec.Body.String() != want {
		t.Errorf("body = %s, want %s", rec.Body, want)
	}
}

func TestCalculate_DomainErrors(t *testing.T) {
	h := newServer(calculator.New(), api.Options{})
	tests := []struct {
		name     string
		body     string
		wantCode string
	}{
		{"division by zero", `{"operation":"divide","operands":[10,0]}`, "division_by_zero"},
		{"zero to negative power", `{"operation":"power","operands":[0,-1]}`, "division_by_zero"},
		{"negative square root", `{"operation":"sqrt","operands":[-9]}`, "negative_square_root"},
		{"overflow", `{"operation":"multiply","operands":[1e308,10]}`, "result_overflow"},
		{"undefined", `{"operation":"power","operands":[-8,0.5]}`, "undefined_result"},
		{"unknown operation", `{"operation":"modulo","operands":[5,2]}`, "unsupported_operation"},
		{"too few operands", `{"operation":"add","operands":[1]}`, "invalid_operand_count"},
		{"too many operands", `{"operation":"sqrt","operands":[1,2]}`, "invalid_operand_count"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, "/api/v1/calculate", tt.body)
			if rec.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status = %d, want 422; body: %s", rec.Code, rec.Body)
			}
			got := decode[errorBody](t, rec)
			if got.Error.Code != tt.wantCode {
				t.Errorf("code = %q, want %q", got.Error.Code, tt.wantCode)
			}
			if got.Error.Message == "" {
				t.Error("message is empty")
			}
		})
	}
}

func TestCalculate_InvalidRequests(t *testing.T) {
	h := newServer(calculator.New(), api.Options{})
	tests := []struct {
		name        string
		body        string
		wantMessage string
	}{
		{"empty body", ``, "request body is required"},
		{"malformed JSON", `{"operation":`, "request body is not valid JSON"},
		{"syntax error", `{"operation" "add"}`, "request body is not valid JSON"},
		{"not an object", `[1,2]`, "request body must be a JSON object"},
		{"unknown field", `{"operation":"add","operands":[1,2],"extra":true}`, `json: unknown field "extra"`},
		{"trailing data", `{"operation":"add","operands":[1,2]}{}`, "request body must contain a single JSON object"},
		{"missing operation", `{"operands":[1,2]}`, "operation is required"},
		{"empty operation", `{"operation":"","operands":[1,2]}`, "operation is required"},
		{"missing operands", `{"operation":"add"}`, "operands must be a non-empty array of numbers"},
		{"empty operands", `{"operation":"add","operands":[]}`, "operands must be a non-empty array of numbers"},
		{"null operand", `{"operation":"add","operands":[1,null]}`, "operands.1 must be a number, got null"},
		{"string operand", `{"operation":"add","operands":[1,"2"]}`, "operands.1: cannot use string as float64"},
		{"operation not a string", `{"operation":1,"operands":[1,2]}`, "operation: cannot use number as string"},
		{"number out of range", `{"operation":"add","operands":[1e400,1]}`, "operands.0: cannot use number 1e400 as float64"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, "/api/v1/calculate", tt.body)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400; body: %s", rec.Code, rec.Body)
			}
			got := decode[errorBody](t, rec)
			if got.Error.Code != "invalid_request" {
				t.Errorf("code = %q, want invalid_request", got.Error.Code)
			}
			if got.Error.Message != tt.wantMessage {
				t.Errorf("message = %q, want %q", got.Error.Message, tt.wantMessage)
			}
		})
	}
}

func TestCalculate_PayloadTooLarge(t *testing.T) {
	h := newServer(calculator.New(), api.Options{})
	body := `{"operation":"add","operands":[1,2],"pad":"` + strings.Repeat("x", 1<<20) + `"}`

	rec := do(t, h, http.MethodPost, "/api/v1/calculate", body)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want 413", rec.Code)
	}
	if got := decode[errorBody](t, rec); got.Error.Code != "payload_too_large" {
		t.Errorf("code = %q, want payload_too_large", got.Error.Code)
	}
}

// fakeCalculator lets tests control what the domain returns.
type fakeCalculator struct {
	err   error
	panic any
}

func (f fakeCalculator) Calculate(calculator.Name, []float64) (calculator.Result, error) {
	if f.panic != nil {
		panic(f.panic)
	}
	return calculator.Result{}, f.err
}

func (f fakeCalculator) Operations() []calculator.Operation { return nil }

func TestCalculate_WrappedDomainErrorIsMapped(t *testing.T) {
	wrapped := errors.Join(errors.New("context"), calculator.ErrDivisionByZero)
	h := newServer(fakeCalculator{err: wrapped}, api.Options{})

	rec := do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"divide","operands":[1,0]}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rec.Code)
	}
	if got := decode[errorBody](t, rec); got.Error.Code != "division_by_zero" {
		t.Errorf("code = %q, want division_by_zero", got.Error.Code)
	}
}

func TestCalculate_UnexpectedErrorIsInternal(t *testing.T) {
	h := newServer(fakeCalculator{err: errors.New("database is on fire")}, api.Options{})

	rec := do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"add","operands":[1,2]}`)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	got := decode[errorBody](t, rec)
	if got.Error.Code != "internal_error" {
		t.Errorf("code = %q, want internal_error", got.Error.Code)
	}
	if strings.Contains(got.Error.Message, "fire") {
		t.Error("internal error details leaked to the client")
	}
}

func TestListOperations(t *testing.T) {
	h := newServer(calculator.New(), api.Options{})
	rec := do(t, h, http.MethodGet, "/api/v1/operations", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	got := decode[struct {
		Operations []struct {
			Name        string `json:"name"`
			Symbol      string `json:"symbol"`
			MinOperands int    `json:"minOperands"`
			MaxOperands int    `json:"maxOperands"`
		} `json:"operations"`
	}](t, rec)

	if len(got.Operations) != 7 {
		t.Fatalf("got %d operations, want 7", len(got.Operations))
	}
	pct := got.Operations[6]
	if pct.Name != "percent" || pct.Symbol != "%" || pct.MinOperands != 1 || pct.MaxOperands != 2 {
		t.Errorf("percent operation = %+v", pct)
	}
}

func TestListOperations_EmptyIsArrayNotNull(t *testing.T) {
	h := newServer(fakeCalculator{}, api.Options{})
	rec := do(t, h, http.MethodGet, "/api/v1/operations", "")
	if body := rec.Body.String(); body != `{"operations":[]}`+"\n" {
		t.Errorf("body = %s", body)
	}
}

func TestHealth(t *testing.T) {
	h := newServer(calculator.New(), api.Options{})
	rec := do(t, h, http.MethodGet, "/healthz", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := decode[struct{ Status string }](t, rec); got.Status != "ok" {
		t.Errorf("status = %q, want ok", got.Status)
	}
}

func TestRouting(t *testing.T) {
	h := newServer(calculator.New(), api.Options{})
	tests := []struct {
		method, path string
		want         int
	}{
		{http.MethodGet, "/api/v1/calculate", http.StatusMethodNotAllowed},
		{http.MethodPost, "/api/v1/operations", http.StatusMethodNotAllowed},
		{http.MethodGet, "/api/v1/unknown", http.StatusNotFound},
		{http.MethodGet, "/", http.StatusNotFound},
	}
	for _, tt := range tests {
		if rec := do(t, h, tt.method, tt.path, ""); rec.Code != tt.want {
			t.Errorf("%s %s status = %d, want %d", tt.method, tt.path, rec.Code, tt.want)
		}
	}
}
