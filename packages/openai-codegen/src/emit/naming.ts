/**
 * Central name derivation for the v2 openai-codegen emitter pipeline.
 *
 * Each OpenAPI spec emits four global ABAP artifacts:
 *   1. Types interface       (ZIF_<BASE>_TYPES)
 *   2. Operations interface  (ZIF_<BASE>)
 *   3. Exception class       (ZCX_<BASE>_ERROR)
 *   4. Implementation class  (ZCL_<BASE>)
 *
 * Plus a handful of local helper classes bundled inside the implementation
 * class (lcl_http, lcl_response, json, lcl_json_parser).
 *
 * All names are overridable individually; the simplest path is to provide a
 * single `base` name from which the four global names are derived.
 */

export interface NamesConfig {
  /** Logical base name — defaults become ZCL_<upper>, ZIF_<upper>, etc. */
  base?: string;
  /** Override each individually (takes precedence over base-derived). */
  typesInterface?: string;
  operationsInterface?: string;
  implementationClass?: string;
  exceptionClass?: string;
  /** Local class names bundled inside zcl_<name>. */
  localHttpClass?: string;
  localResponseClass?: string;
  localJsonClass?: string;
  localJsonParserClass?: string;
}

export interface ResolvedNames {
  typesInterface: string;
  operationsInterface: string;
  implementationClass: string;
  exceptionClass: string;
  localHttpClass: string;
  localResponseClass: string;
  localJsonClass: string;
  localJsonParserClass: string;
}

export class NamesConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NamesConfigError';
  }
}

const GLOBAL_NAME_RE = /^[ZY][A-Z0-9_]*$/;
const LOCAL_NAME_RE = /^[a-z][a-z0-9_]*$/;
const MAX_LEN = 30;

const DEFAULT_LOCAL_HTTP = 'lcl_http';
const DEFAULT_LOCAL_RESPONSE = 'lcl_response';
const DEFAULT_LOCAL_JSON = 'json';
const DEFAULT_LOCAL_JSON_PARSER = 'lcl_json_parser';

function validateGlobal(field: keyof ResolvedNames, value: string): void {
  if (value.length === 0) {
    throw new NamesConfigError(
      `Invalid ABAP global name for "${field}": value is empty.`,
    );
  }
  if (value.length > MAX_LEN) {
    throw new NamesConfigError(
      `Invalid ABAP global name for "${field}": "${value}" exceeds ${MAX_LEN} characters.`,
    );
  }
  if (!GLOBAL_NAME_RE.test(value)) {
    throw new NamesConfigError(
      `Invalid ABAP global name for "${field}": "${value}" must start with Z or Y and contain only uppercase letters, digits, and underscores.`,
    );
  }
}

function validateLocal(field: keyof ResolvedNames, value: string): void {
  if (value.length === 0) {
    throw new NamesConfigError(
      `Invalid ABAP local class name for "${field}": value is empty.`,
    );
  }
  if (value.length > MAX_LEN) {
    throw new NamesConfigError(
      `Invalid ABAP local class name for "${field}": "${value}" exceeds ${MAX_LEN} characters.`,
    );
  }
  if (!LOCAL_NAME_RE.test(value)) {
    throw new NamesConfigError(
      `Invalid ABAP local class name for "${field}": "${value}" must start with a lowercase letter and contain only lowercase letters, digits, and underscores.`,
    );
  }
}

function deriveFromBase(base: string): {
  typesInterface: string;
  operationsInterface: string;
  implementationClass: string;
  exceptionClass: string;
} {
  const trimmed = base.trim();
  if (trimmed.length === 0) {
    throw new NamesConfigError(
      'Invalid "base" name: value is empty or whitespace.',
    );
  }
  // Permit letters/digits/underscore in the base; we'll uppercase it.
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(trimmed)) {
    throw new NamesConfigError(
      `Invalid "base" name: "${base}" must start with a letter and contain only letters, digits, and underscores.`,
    );
  }
  const upper = trimmed.toUpperCase();
  return {
    typesInterface: `ZIF_${upper}_TYPES`,
    operationsInterface: `ZIF_${upper}`,
    implementationClass: `ZCL_${upper}`,
    exceptionClass: `ZCX_${upper}_ERROR`,
  };
}

export function resolveNames(config?: NamesConfig): ResolvedNames {
  const cfg = config ?? {};

  const hasBase = typeof cfg.base === 'string' && cfg.base.trim().length > 0;
  const hasAnyGlobalOverride =
    cfg.typesInterface !== undefined ||
    cfg.operationsInterface !== undefined ||
    cfg.implementationClass !== undefined ||
    cfg.exceptionClass !== undefined;

  if (!hasBase && !hasAnyGlobalOverride) {
    throw new NamesConfigError(
      'Names configuration requires at least "base" or one of the individual overrides ' +
        '(typesInterface, operationsInterface, implementationClass, exceptionClass).',
    );
  }

  const derived = hasBase
    ? deriveFromBase(cfg.base as string)
    : {
        typesInterface: '',
        operationsInterface: '',
        implementationClass: '',
        exceptionClass: '',
      };

  const typesInterface = (cfg.typesInterface ?? derived.typesInterface).trim();
  const operationsInterface = (
    cfg.operationsInterface ?? derived.operationsInterface
  ).trim();
  const implementationClass = (
    cfg.implementationClass ?? derived.implementationClass
  ).trim();
  const exceptionClass = (cfg.exceptionClass ?? derived.exceptionClass).trim();

  if (!typesInterface) {
    throw new NamesConfigError(
      'Cannot resolve "typesInterface": provide --base or --types-interface.',
    );
  }
  if (!operationsInterface) {
    throw new NamesConfigError(
      'Cannot resolve "operationsInterface": provide --base or --operations-interface.',
    );
  }
  if (!implementationClass) {
    throw new NamesConfigError(
      'Cannot resolve "implementationClass": provide --base or --class-name.',
    );
  }
  if (!exceptionClass) {
    throw new NamesConfigError(
      'Cannot resolve "exceptionClass": provide --base or --exception-class.',
    );
  }

  const localHttpClass = cfg.localHttpClass ?? DEFAULT_LOCAL_HTTP;
  const localResponseClass = cfg.localResponseClass ?? DEFAULT_LOCAL_RESPONSE;
  const localJsonClass = cfg.localJsonClass ?? DEFAULT_LOCAL_JSON;
  const localJsonParserClass =
    cfg.localJsonParserClass ?? DEFAULT_LOCAL_JSON_PARSER;

  const resolved: ResolvedNames = {
    typesInterface,
    operationsInterface,
    implementationClass,
    exceptionClass,
    localHttpClass,
    localResponseClass,
    localJsonClass,
    localJsonParserClass,
  };

  validateGlobal('typesInterface', resolved.typesInterface);
  validateGlobal('operationsInterface', resolved.operationsInterface);
  validateGlobal('implementationClass', resolved.implementationClass);
  validateGlobal('exceptionClass', resolved.exceptionClass);
  validateLocal('localHttpClass', resolved.localHttpClass);
  validateLocal('localResponseClass', resolved.localResponseClass);
  validateLocal('localJsonClass', resolved.localJsonClass);
  validateLocal('localJsonParserClass', resolved.localJsonParserClass);

  return resolved;
}
