/**
 * Log text in trace mode if VERBOSE env var is true
 */
export const traceLog = (text: string | Error, extraInfo: unknown = null) => {
  if (process.env.VERBOSE === 'true') {
    console.trace(text, extraInfo);
  }
}
