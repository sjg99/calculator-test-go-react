package calculator

import "strconv"

// significantDigits is the precision of every result. A float64 holds about
// 15 to 17 significant digits; dropping the last few hides representation
// errors such as 0.1+0.2 = 0.30000000000000004. See ADR 0004.
const significantDigits = 12

// round rounds v to significantDigits significant digits and turns -0 into 0.
// v must be finite.
func round(v float64) float64 {
	if v == 0 {
		return 0 // also normalizes -0
	}
	// Formatting and parsing back is exact decimal rounding. Parsing cannot
	// fail: the text is a valid float, and rounding a finite float64 to 12
	// digits never exceeds the float64 range.
	r, _ := strconv.ParseFloat(strconv.FormatFloat(v, 'g', significantDigits, 64), 64)
	return r
}
