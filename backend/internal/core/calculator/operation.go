package calculator

import "math"

// Name identifies an operation, for example "add" or "sqrt".
type Name string

// Supported operation names.
const (
	Add      Name = "add"
	Subtract Name = "subtract"
	Multiply Name = "multiply"
	Divide   Name = "divide"
	Power    Name = "power"
	Sqrt     Name = "sqrt"
	Percent  Name = "percent"
)

// Operation is a value object describing one arithmetic operation: its name,
// display symbol, the number of operands it accepts and the rule it applies.
type Operation struct {
	Name        Name
	Symbol      string
	MinOperands int
	MaxOperands int

	// apply computes the raw result. It can assume the operand count is valid
	// and every operand is finite; the Calculator checks both beforehand.
	apply func(operands []float64) (float64, error)
}

func (o Operation) acceptsOperandCount(n int) bool {
	return n >= o.MinOperands && n <= o.MaxOperands
}

// defaultOperations returns the built-in operations in display order.
func defaultOperations() []Operation {
	return []Operation{
		{Name: Add, Symbol: "+", MinOperands: 2, MaxOperands: 2, apply: add},
		{Name: Subtract, Symbol: "−", MinOperands: 2, MaxOperands: 2, apply: subtract},
		{Name: Multiply, Symbol: "×", MinOperands: 2, MaxOperands: 2, apply: multiply},
		{Name: Divide, Symbol: "÷", MinOperands: 2, MaxOperands: 2, apply: divide},
		{Name: Power, Symbol: "^", MinOperands: 2, MaxOperands: 2, apply: power},
		{Name: Sqrt, Symbol: "√", MinOperands: 1, MaxOperands: 1, apply: sqrt},
		{Name: Percent, Symbol: "%", MinOperands: 1, MaxOperands: 2, apply: percent},
	}
}

func add(o []float64) (float64, error)      { return o[0] + o[1], nil }
func subtract(o []float64) (float64, error) { return o[0] - o[1], nil }
func multiply(o []float64) (float64, error) { return o[0] * o[1], nil }

func divide(o []float64) (float64, error) {
	if o[1] == 0 {
		return 0, ErrDivisionByZero
	}
	return o[0] / o[1], nil
}

func power(o []float64) (float64, error) {
	base, exponent := o[0], o[1]
	switch {
	case base == 0 && exponent < 0:
		// 0^-n is 1/0^n.
		return 0, ErrDivisionByZero
	case base < 0 && exponent != math.Trunc(exponent):
		// A negative base with a fractional exponent has no real result.
		return 0, ErrUndefinedResult
	}
	return math.Pow(base, exponent), nil
}

func sqrt(o []float64) (float64, error) {
	if o[0] < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return math.Sqrt(o[0]), nil
}

// percent returns value/100, or base*value/100 when a base is given
// ("10% of 200" is percent(10, 200) = 20). See ADR 0007.
func percent(o []float64) (float64, error) {
	if len(o) == 1 {
		return o[0] / 100, nil
	}
	return o[1] * o[0] / 100, nil
}
