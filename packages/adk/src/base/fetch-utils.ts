/**
 * Utility for handling v2 client fetch responses.
 *
 * The v2 ADT client's `fetch()` returns parsed data directly (a string for
 * text/plain content), not a standard `Response` object. This helper
 * normalises both cases so ADK objects work with both client versions.
 */

/**
 * Convert a fetch result to a text string.
 *
 * - If the result is already a string (v2 client), return it as-is.
 * - If the result is a Response-like object (v1 / standard fetch), call `.text()`.
 */
export async function toText(result: unknown): Promise<string> {
  if (typeof result === 'string') return result;
  if (
    result &&
    typeof result === 'object' &&
    'text' in result &&
    typeof (result as any).text === 'function'
  ) {
    return (result as Response).text();
  }
  return String(result ?? '');
}
