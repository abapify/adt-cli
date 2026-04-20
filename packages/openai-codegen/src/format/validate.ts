/**
 * ABAP identifier validation shared by all format writers.
 *
 * Rules (SAP repository object naming):
 *   - Must start with 'Z' or 'Y' (customer namespace)
 *   - Allowed characters: A-Z, 0-9, '_'
 *   - Max 30 characters
 *   - Must be uppercase
 */
export function assertValidClassName(name: string): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('className must be a non-empty string');
  }
  if (name.length > 30) {
    throw new Error(`Invalid ABAP class name '${name}': exceeds 30 characters`);
  }
  if (!/^[ZY][A-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid ABAP class name '${name}': must be uppercase, start with Z or Y, and contain only A-Z, 0-9, _`,
    );
  }
}
