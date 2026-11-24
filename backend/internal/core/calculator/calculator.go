// Package calculator is the core domain: the supported operations, their
// rules and the domain errors. It has no knowledge of transport or storage.
package calculator

import (
	"fmt"
	"math"
	"slices"
)

// Result is the outcome of a successful calculation.
type Result struct {
	Operation Name
	Operands  []float64
	Value     float64
}

// Calculator is the domain service that validates and performs operations.
// It is stateless and safe for concurrent use.
type Calculator struct {
	ordered []Operation
	byName  map[Name]Operation
}

// New returns a Calculator with the built-in operations registered.
func New() *Calculator {
	ops := defaultOperations()
	byName := make(map[Name]Operation, len(ops))
	for _, op := range ops {
		byName[op.Name] = op
	}
	return &Calculator{ordered: ops, byName: byName}
}

// Operations returns the supported operations in display order.
func (c *Calculator) Operations() []Operation {
	return slices.Clone(c.ordered)
}

// Calculate applies the named operation to the operands. It returns one of
// the package's sentinel errors (possibly wrapped) when the operation is
// unknown, the input is invalid, or the result is not a finite number.
// The result is rounded to 12 significant digits.
func (c *Calculator) Calculate(name Name, operands []float64) (Result, error) {
	op, ok := c.byName[name]
	if !ok {
		return Result{}, fmt.Errorf("%w: %q", ErrUnsupportedOperation, name)
	}
	if !op.acceptsOperandCount(len(operands)) {
		return Result{}, fmt.Errorf("%w: %s takes %s, got %d",
			ErrInvalidOperandCount, name, describeArity(op), len(operands))
	}
	for i, v := range operands {
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return Result{}, fmt.Errorf("%w: operand %d is %v", ErrInvalidOperand, i, v)
		}
	}

	value, err := op.apply(operands)
	if err != nil {
		return Result{}, err
	}
	switch {
	case math.IsNaN(value):
		return Result{}, ErrUndefinedResult
	case math.IsInf(value, 0):
		return Result{}, ErrResultOverflow
	}

	return Result{
		Operation: name,
		Operands:  slices.Clone(operands),
		Value:     round(value),
	}, nil
}

func describeArity(op Operation) string {
	if op.MinOperands == op.MaxOperands {
		return plural(op.MinOperands)
	}
	return fmt.Sprintf("%d to %d operands", op.MinOperands, op.MaxOperands)
}

func plural(n int) string {
	if n == 1 {
		return "1 operand"
	}
	return fmt.Sprintf("%d operands", n)
}
