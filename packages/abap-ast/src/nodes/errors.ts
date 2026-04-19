export class AbapAstError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AbapAstError';
  }
}

export function requireField<T>(
  value: T | undefined | null,
  field: string,
  nodeKind: string,
): T {
  if (value === undefined || value === null || value === '') {
    throw new AbapAstError(`${nodeKind}: required field "${field}" is missing`);
  }
  return value;
}
