interface HttpErrorLike {
  // `unknown`: the shape of a thrown error is not typed; the fields are narrowed below.
  response?: { status?: unknown }
  // `unknown`: same as above.
  status?: unknown
}

/**
 * HTTP status of a failed request: algosdk errors carry `response.status`
 * (`URLTokenBaseHTTPError`), some clients a top-level `status`. Undefined when there is none
 * (network failure, proxy page), so callers never mistake those for a definite answer.
 */
// `unknown`: whatever a rejected request throws is not typed; it is narrowed right here.
export const httpStatusOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined
  const http = error as HttpErrorLike
  const status = http.response?.status ?? http.status
  return typeof status === 'number' ? status : undefined
}
