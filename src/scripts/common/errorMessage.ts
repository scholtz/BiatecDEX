/** Extracts a human-readable message from a caught value, whose static type is always `unknown`. */
export default function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
