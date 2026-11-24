package calculator

import (
	"math"
	"testing"
)

func TestRound(t *testing.T) {
	tests := []struct {
		in, want float64
	}{
		{0.30000000000000004, 0.3},
		{0.1 * 3, 0.3},
		{1.0000000000001, 1},
		{123456789012.4, 123456789012},
		{123456789012.6, 123456789013},
		{123456789012.5, 123456789012}, // exact halves round to even
		{1234567890123456, 1234567890120000},
		{-2.0000000000004, -2},
		{1e-20 / 3, 3.33333333333e-21},
		{math.MaxFloat64, 1.79769313486e308},
		{math.SmallestNonzeroFloat64, 4.94065645841e-324},
		{math.Copysign(0, -1), 0},
	}
	for _, tt := range tests {
		got := round(tt.in)
		if got != tt.want {
			t.Errorf("round(%v) = %v, want %v", tt.in, got, tt.want)
		}
		if got == 0 && math.Signbit(got) {
			t.Errorf("round(%v) returned -0", tt.in)
		}
	}
}
