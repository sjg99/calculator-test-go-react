package calculator_test

import (
	"errors"
	"math"
	"testing"

	"github.com/sjg99/calculator-test-go-react/backend/internal/core/calculator"
)

func TestCalculate_Success(t *testing.T) {
	tests := []struct {
		name     string
		op       calculator.Name
		operands []float64
		want     float64
	}{
		{"add integers", calculator.Add, []float64{2, 3}, 5},
		{"add negatives", calculator.Add, []float64{-2.5, -0.5}, -3},
		{"add hides float error", calculator.Add, []float64{0.1, 0.2}, 0.3},
		{"subtract", calculator.Subtract, []float64{10, 4}, 6},
		{"subtract to negative", calculator.Subtract, []float64{4, 10}, -6},
		{"subtract hides float error", calculator.Subtract, []float64{0.3, 0.1}, 0.2},
		{"multiply", calculator.Multiply, []float64{12, 3}, 36},
		{"multiply by zero", calculator.Multiply, []float64{12, 0}, 0},
		{"multiply negative by zero gives 0 not -0", calculator.Multiply, []float64{-5, 0}, 0},
		{"multiply decimals", calculator.Multiply, []float64{1.1, 1.1}, 1.21},
		{"divide", calculator.Divide, []float64{10, 4}, 2.5},
		{"divide zero by number", calculator.Divide, []float64{0, 5}, 0},
		{"divide rounds repeating decimal", calculator.Divide, []float64{1, 3}, 0.333333333333},
		{"divide rounds to 12 significant digits", calculator.Divide, []float64{2, 3}, 0.666666666667},
		{"power", calculator.Power, []float64{2, 10}, 1024},
		{"power with negative exponent", calculator.Power, []float64{2, -2}, 0.25},
		{"power with fractional exponent", calculator.Power, []float64{9, 0.5}, 3},
		{"power of negative base with integer exponent", calculator.Power, []float64{-2, 3}, -8},
		{"power zero to zero", calculator.Power, []float64{0, 0}, 1},
		{"power zero to positive", calculator.Power, []float64{0, 3}, 0},
		{"sqrt", calculator.Sqrt, []float64{16}, 4},
		{"sqrt zero", calculator.Sqrt, []float64{0}, 0},
		{"sqrt irrational", calculator.Sqrt, []float64{2}, 1.41421356237},
		{"percent of value", calculator.Percent, []float64{50}, 0.5},
		{"percent of base", calculator.Percent, []float64{10, 200}, 20},
		{"percent of negative base", calculator.Percent, []float64{25, -80}, -20},
		{"percent with decimals", calculator.Percent, []float64{12.5, 80}, 10},
		{"large but finite", calculator.Multiply, []float64{1e154, 1e154}, 1e308},
		{"tiny but finite", calculator.Multiply, []float64{1e-200, 1e-200}, 0},
	}

	calc := calculator.New()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calc.Calculate(tt.op, tt.operands)
			if err != nil {
				t.Fatalf("Calculate(%s, %v) returned error: %v", tt.op, tt.operands, err)
			}
			if got.Value != tt.want {
				t.Errorf("Calculate(%s, %v) = %v, want %v", tt.op, tt.operands, got.Value, tt.want)
			}
			if math.Signbit(got.Value) && got.Value == 0 {
				t.Errorf("Calculate(%s, %v) returned -0", tt.op, tt.operands)
			}
			if got.Operation != tt.op {
				t.Errorf("Result.Operation = %q, want %q", got.Operation, tt.op)
			}
		})
	}
}

func TestCalculate_Errors(t *testing.T) {
	inf := math.Inf(1)
	tests := []struct {
		name     string
		op       calculator.Name
		operands []float64
		wantErr  error
	}{
		{"unknown operation", "modulo", []float64{5, 2}, calculator.ErrUnsupportedOperation},
		{"empty operation name", "", []float64{5, 2}, calculator.ErrUnsupportedOperation},
		{"operation name is case-sensitive", "ADD", []float64{5, 2}, calculator.ErrUnsupportedOperation},
		{"binary with one operand", calculator.Add, []float64{1}, calculator.ErrInvalidOperandCount},
		{"binary with three operands", calculator.Multiply, []float64{1, 2, 3}, calculator.ErrInvalidOperandCount},
		{"binary with no operands", calculator.Subtract, nil, calculator.ErrInvalidOperandCount},
		{"unary with two operands", calculator.Sqrt, []float64{4, 9}, calculator.ErrInvalidOperandCount},
		{"percent with three operands", calculator.Percent, []float64{1, 2, 3}, calculator.ErrInvalidOperandCount},
		{"percent with no operands", calculator.Percent, []float64{}, calculator.ErrInvalidOperandCount},
		{"NaN operand", calculator.Add, []float64{math.NaN(), 1}, calculator.ErrInvalidOperand},
		{"infinite operand", calculator.Add, []float64{1, inf}, calculator.ErrInvalidOperand},
		{"negative infinite operand", calculator.Sqrt, []float64{math.Inf(-1)}, calculator.ErrInvalidOperand},
		{"divide by zero", calculator.Divide, []float64{10, 0}, calculator.ErrDivisionByZero},
		{"divide zero by zero", calculator.Divide, []float64{0, 0}, calculator.ErrDivisionByZero},
		{"divide by negative zero", calculator.Divide, []float64{1, math.Copysign(0, -1)}, calculator.ErrDivisionByZero},
		{"zero to negative power", calculator.Power, []float64{0, -1}, calculator.ErrDivisionByZero},
		{"negative base fractional exponent", calculator.Power, []float64{-8, 0.5}, calculator.ErrUndefinedResult},
		{"sqrt of negative", calculator.Sqrt, []float64{-9}, calculator.ErrNegativeSquareRoot},
		{"add overflow", calculator.Add, []float64{math.MaxFloat64, math.MaxFloat64}, calculator.ErrResultOverflow},
		{"subtract overflow", calculator.Subtract, []float64{-math.MaxFloat64, math.MaxFloat64}, calculator.ErrResultOverflow},
		{"multiply overflow", calculator.Multiply, []float64{1e308, 10}, calculator.ErrResultOverflow},
		{"divide overflow", calculator.Divide, []float64{1e308, 1e-10}, calculator.ErrResultOverflow},
		{"power overflow", calculator.Power, []float64{10, 400}, calculator.ErrResultOverflow},
		{"percent overflow", calculator.Percent, []float64{1e308, 1e308}, calculator.ErrResultOverflow},
	}

	calc := calculator.New()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := calc.Calculate(tt.op, tt.operands)
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("Calculate(%s, %v) error = %v, want %v", tt.op, tt.operands, err, tt.wantErr)
			}
		})
	}
}

func TestCalculate_ErrorMessagesHaveContext(t *testing.T) {
	calc := calculator.New()
	tests := []struct {
		op       calculator.Name
		operands []float64
		want     string
	}{
		{"modulo", []float64{1, 2}, `unsupported operation: "modulo"`},
		{calculator.Add, []float64{1}, "invalid number of operands: add takes 2 operands, got 1"},
		{calculator.Sqrt, []float64{1, 2}, "invalid number of operands: sqrt takes 1 operand, got 2"},
		{calculator.Percent, nil, "invalid number of operands: percent takes 1 to 2 operands, got 0"},
		{calculator.Add, []float64{1, math.Inf(1)}, "operand must be a finite number: operand 1 is +Inf"},
	}
	for _, tt := range tests {
		_, err := calc.Calculate(tt.op, tt.operands)
		if err == nil || err.Error() != tt.want {
			t.Errorf("Calculate(%s, %v) error = %v, want %q", tt.op, tt.operands, err, tt.want)
		}
	}
}

func TestCalculate_ResultDoesNotAliasOperands(t *testing.T) {
	operands := []float64{2, 3}
	got, err := calculator.New().Calculate(calculator.Add, operands)
	if err != nil {
		t.Fatal(err)
	}
	operands[0] = 100
	if got.Operands[0] != 2 {
		t.Errorf("Result.Operands changed when the input slice was modified: %v", got.Operands)
	}
}

func TestOperations(t *testing.T) {
	calc := calculator.New()
	ops := calc.Operations()

	want := []struct {
		name     calculator.Name
		symbol   string
		min, max int
	}{
		{calculator.Add, "+", 2, 2},
		{calculator.Subtract, "−", 2, 2},
		{calculator.Multiply, "×", 2, 2},
		{calculator.Divide, "÷", 2, 2},
		{calculator.Power, "^", 2, 2},
		{calculator.Sqrt, "√", 1, 1},
		{calculator.Percent, "%", 1, 2},
	}
	if len(ops) != len(want) {
		t.Fatalf("Operations() returned %d operations, want %d", len(ops), len(want))
	}
	for i, w := range want {
		op := ops[i]
		if op.Name != w.name || op.Symbol != w.symbol || op.MinOperands != w.min || op.MaxOperands != w.max {
			t.Errorf("Operations()[%d] = {%s %s %d %d}, want {%s %s %d %d}",
				i, op.Name, op.Symbol, op.MinOperands, op.MaxOperands, w.name, w.symbol, w.min, w.max)
		}
	}

	// Callers must not be able to change the registry.
	ops[0].Name = "hacked"
	if calc.Operations()[0].Name != calculator.Add {
		t.Error("modifying the returned slice changed the calculator's operations")
	}
}
