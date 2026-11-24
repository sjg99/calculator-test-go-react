package api

// calculateRequest is the body of POST /api/v1/calculate.
//
// Operands are pointers so that a JSON null is detected instead of being
// silently decoded as 0.
type calculateRequest struct {
	Operation string     `json:"operation"`
	Operands  []*float64 `json:"operands"`
}

type calculateResponse struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
	Result    float64   `json:"result"`
}

type operationResponse struct {
	Name        string `json:"name"`
	Symbol      string `json:"symbol"`
	MinOperands int    `json:"minOperands"`
	MaxOperands int    `json:"maxOperands"`
}

type operationsResponse struct {
	Operations []operationResponse `json:"operations"`
}

type healthResponse struct {
	Status string `json:"status"`
}

type errorResponse struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
