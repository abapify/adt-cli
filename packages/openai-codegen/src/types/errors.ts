export class CyclicTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CyclicTypeError';
  }
}

export class CollisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CollisionError';
  }
}

export class UnsupportedSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedSchemaError';
  }
}
