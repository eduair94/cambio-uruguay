/** Shared by every saved-search kind; lives apart so the kind modules do not import each other. */
export class RentalAlertValidationError extends Error {
  readonly code: 'invalid_alert' | 'unsupported_filter'
  constructor(code: 'invalid_alert' | 'unsupported_filter') {
    super(code)
    this.code = code
  }
}
