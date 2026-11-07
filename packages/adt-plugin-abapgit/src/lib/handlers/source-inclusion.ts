/**
 * Shared source-inclusion rule for abapGit object handlers.
 *
 * A source is included when it is defined and either supplied by the caller
 * or non-empty on the object.
 */
export function shouldIncludeSource(
  source: string | undefined,
  suppliedSource: string | undefined,
): source is string {
  if (source === undefined) return false;
  return suppliedSource !== undefined || source !== '';
}
