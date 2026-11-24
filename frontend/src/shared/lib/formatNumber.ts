/**
 * Converts a number to the text the calculator keeps as its entry.
 * Uses the shortest round-trip representation and drops the sign of -0.
 */
export function numberToEntry(value: number): string {
  return Object.is(value, -0) ? '0' : String(value)
}

/**
 * Formats entry text for display by grouping the integer part in thousands.
 * Partial input such as "12." is preserved, and exponent notation is left as is.
 */
export function formatEntry(entry: string): string {
  if (/e/i.test(entry)) return entry

  const negative = entry.startsWith('-')
  const unsigned = negative ? entry.slice(1) : entry
  const [integer = '', fraction] = unsigned.split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`
}

/** Formats a number for display, e.g. 1234567.5 → "1,234,567.5". */
export function formatNumber(value: number): string {
  return formatEntry(numberToEntry(value))
}
