/** Rejects with `message` when `promise` has not settled within `ms`; clears its timer either way. */
export const withTimeout = <T>(promise: Promise<T>, ms: number, message?: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message ?? `Timed out after ${ms} ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      // `unknown`: a rejected promise carries an untyped reason; it is passed on unchanged.
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })

export default withTimeout
