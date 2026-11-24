package calculator

import (
	"errors"
	"math"
	"testing"
)

// The built-in operations guard against NaN before computing, so the
// Calculator's own NaN check is a safety net. This test exercises it with an
// operation that returns NaN directly.
func TestCalculate_NaNResultIsUndefined(t *testing.T) {
	nan := Operation{
		Name: "nan", MinOperands: 0, MaxOperands: 0,
		apply: func([]float64) (float64, error) { return math.NaN(), nil },
	}
	calc := &Calculator{ordered: []Operation{nan}, byName: map[Name]Operation{nan.Name: nan}}

	if _, err := calc.Calculate("nan", nil); !errors.Is(err, ErrUndefinedResult) {
		t.Errorf("error = %v, want %v", err, ErrUndefinedResult)
	}
}
