/** User-facing messages per error code (functional spec §3.5). */
const MESSAGES: Record<string, string> = {
  division_by_zero: "Can't divide by zero",
  negative_square_root: 'No square root of a negative number',
  result_overflow: 'Result is too large',
  undefined_result: 'Result is undefined',
  network_error: "Can't reach the calculator service",
}

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong'

export function errorMessage(code: string): string {
  return MESSAGES[code] ?? FALLBACK_ERROR_MESSAGE
}
