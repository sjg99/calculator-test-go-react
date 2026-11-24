// Types mirroring the API contract in api/openapi.yaml.

export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'
export type UnaryOperation = 'sqrt' | 'percent'
export type OperationName = BinaryOperation | UnaryOperation

export interface CalculationRequest {
  operation: OperationName
  operands: number[]
}

export interface CalculationResponse {
  operation: OperationName
  operands: number[]
  result: number
}

/** Error codes the backend can return. */
export type ServerErrorCode =
  | 'invalid_request'
  | 'payload_too_large'
  | 'unsupported_operation'
  | 'invalid_operand_count'
  | 'invalid_operand'
  | 'division_by_zero'
  | 'negative_square_root'
  | 'undefined_result'
  | 'result_overflow'
  | 'internal_error'

/** Error codes produced by the client itself. */
export type ClientErrorCode = 'network_error' | 'invalid_response'

export type ApiErrorCode = ServerErrorCode | ClientErrorCode

export interface ErrorResponse {
  error: { code: string; message: string }
}
