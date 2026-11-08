/**
 * Verification for ADT-issued MCP invocation credentials.
 *
 * This module is deliberately transport-independent: callers pass the
 * complete Authorization header and receive either immutable, trusted claims
 * or `undefined`. It does not log or throw token-validation failures, so a
 * bearer credential or its decoded payload can never leak through an error.
 */
import type { KeyObject } from 'node:crypto';
import { jwtVerify, type CryptoKey, type JWTPayload } from 'jose';

const INVOCATION_VERSION = 1;
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_COMPONENT_IDENTIFIER_LENGTH = 512;
const MAX_JSON_DEPTH = 8;
const MAX_TOKEN_LIFETIME_SECONDS = 5 * 60;
const MAX_FROZEN_SOURCES = 500;
const MAX_SOURCE_REFERENCE_LENGTH = 8 * 1024;
const MAX_FROZEN_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_SCOPED_OBJECT_KEYS = 100;
const MAX_SCOPED_TOOL_CALLS = 12;
const MAX_SAFE_EXECUTE_GRANT_BYTES = 16 * 1024;
const destinationKeyPattern = /^[a-z][a-z0-9-]{1,62}$/u;
const canonicalKeyPattern = /^[A-Z0-9_]+:.+$/u;
const scopedCanonicalObjectKeyPattern =
  /^[A-Z0-9_]{2,30}:[A-Z0-9_/$-]{1,128}$/u;
const compactJwsPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const trustedAgentIds = new Set([
  'ai-review',
  'system-assistant',
  'autonomous-review-agent',
  'adt-execution',
  'delegated-assistant',
]);
const trustedOperationClasses = new Set(['server', 'read', 'safe_execute']);
const scopedReadTools = new Set(['get_object', 'get_object_structure']);

export type McpTrustedOperationClass = 'server' | 'read' | 'safe_execute';

interface McpInvocationJsonObject {
  readonly [key: string]: McpInvocationJsonValue;
}

export type McpInvocationJsonValue =
  | boolean
  | number
  | string
  | null
  | readonly McpInvocationJsonValue[]
  | McpInvocationJsonObject;

/** Claims proved by a verified, ADT-issued invocation credential. */
export interface TrustedMcpInvocationClaims {
  readonly tokenId: string;
  readonly principal: string;
  readonly agentId:
    | 'ai-review'
    | 'system-assistant'
    | 'autonomous-review-agent'
    | 'adt-execution'
    | 'delegated-assistant';
  readonly classes: readonly McpTrustedOperationClass[];
  readonly destinationKeys: readonly string[];
  readonly correlationId: string;
  readonly constraint: McpInvocationJsonObject;
  readonly limits: McpInvocationJsonObject;
}

/**
 * Fully enforced narrowing policy for an AI Review source read. `sourceRef`
 * remains opaque to MCP clients and models; only ADT's private broker can
 * redeem it after this policy has selected the exact canonical object and
 * source component.
 */
export interface AiReviewFrozenSourcePolicy {
  readonly reviewId: string;
  readonly runId: string;
  readonly systemSid: string;
  readonly sources: readonly {
    readonly canonicalKey: string;
    readonly componentId: string;
    readonly sourceRef: string;
  }[];
  readonly maxSourceBytes: number;
}

export type SafeExecutePolicy =
  | {
      readonly operationId: 'atc_run';
      readonly check: 'atc';
      readonly maxDurationMs: number;
      readonly maxResultBytes: number;
      readonly maxFindings: number;
      readonly maxObjects: number;
      readonly maxPackages: number;
      readonly maxVariants: number;
    }
  | {
      readonly operationId: 'run_unit_tests';
      readonly check: 'aunit';
      readonly effectiveWithCoverage: false;
      readonly effectiveCoverageFormat: null;
      readonly maxDurationMs: number;
      readonly maxResultBytes: number;
      readonly maxFindings: number;
      readonly maxObjects: number;
      readonly maxTestClasses: number;
      readonly maxTestMethods: number;
    }
  | {
      readonly operationId: 'run_unit_tests';
      readonly check: 'coverage';
      readonly effectiveWithCoverage: true;
      readonly effectiveCoverageFormat: 'jacoco' | 'sonar-generic';
      readonly maxDurationMs: number;
      readonly maxResultBytes: number;
      readonly maxFindings: number;
      readonly maxObjects: number;
      readonly maxPrograms: number;
      readonly maxMeasurements: number;
    };

export interface ScopedAdtInvocationPolicy {
  readonly scopeId: string;
  readonly executionId: string;
  readonly systemSid: string;
  readonly resourceKeys: readonly string[];
  readonly toolNames: readonly string[];
  readonly operationClass: 'read' | 'safe_execute';
  readonly maxToolCalls: number;
  readonly safeExecutePolicy?: SafeExecutePolicy;
  /** Server-owned opaque grant material; never exposed in a tool schema. */
  readonly authorizationId?: string;
  readonly authorizationToken?: string;
}

export interface DelegatedAssistantReadPolicy {
  readonly threadId: string;
  readonly executionId: string;
  readonly systemSid: string;
}

export interface McpInvocationVerifierOptions {
  /** ES256 public key mounted at ADT Server; it cannot issue credentials. */
  publicKey: CryptoKey | KeyObject;
  /** The exact key id required in both JWS header and JWT payload. */
  keyId: string;
  /** The exact ADT API issuer expected in `iss`. */
  issuer: string;
  /** The exact audience expected in `aud`. */
  audience: string;
  /** Test-only clock injection. Production defaults to the current time. */
  now?: () => Date | number;
}

export interface McpInvocationVerifier {
  /**
   * Verify a complete `Authorization: Bearer <JWS>` header. Validation
   * failures are intentionally indistinguishable and return `undefined`.
   */
  verify(
    authorizationHeader: string | string[] | undefined,
  ): Promise<TrustedMcpInvocationClaims | undefined>;
}

/**
 * Reports whether this sidecar version can enforce every narrowing claim for
 * an invocation. Unsupported policies deliberately receive no MCP tool
 * access; accepting a syntactically valid policy without enforcing it would
 * widen the signed credential.
 *
 * Every admitted policy has an exact parser. Structurally incomplete or
 * unknown policies fail closed.
 */
function isSystemAssistantPolicySupported(
  claims: TrustedMcpInvocationClaims,
): boolean {
  if (
    !hasServerReadClasses(claims) ||
    Object.keys(claims.limits).length !== 0
  ) {
    return false;
  }
  const constraintKeys = Object.keys(claims.constraint);
  return (
    constraintKeys.length === 1 &&
    constraintKeys[0] === 'systemSid' &&
    requiredIdentifier(claims.constraint.systemSid) !== undefined
  );
}

function hasServerReadClasses(claims: TrustedMcpInvocationClaims): boolean {
  return (
    claims.classes.length === 2 &&
    claims.classes.includes('server') &&
    claims.classes.includes('read')
  );
}

export function parseDelegatedAssistantReadPolicy(
  claims: TrustedMcpInvocationClaims,
): DelegatedAssistantReadPolicy | undefined {
  if (
    claims.agentId !== 'delegated-assistant' ||
    claims.destinationKeys.length !== 1 ||
    !hasServerReadClasses(claims) ||
    Object.keys(claims.limits).length !== 0 ||
    !hasExactSortedKeys(claims.constraint, [
      'kind',
      'threadId',
      'executionId',
      'systemSid',
    ]) ||
    claims.constraint.kind !== 'delegated-assistant-read-v1'
  ) {
    return undefined;
  }

  const threadId = requiredUuid(claims.constraint.threadId);
  const executionId = requiredUuid(claims.constraint.executionId);
  const systemSid = requiredSystemSid(claims.constraint.systemSid);
  if (!threadId || !executionId || !systemSid) return undefined;

  return Object.freeze({ threadId, executionId, systemSid });
}

export function isMcpInvocationDispatchPolicySupported(
  claims: TrustedMcpInvocationClaims,
): boolean {
  if (claims.agentId === 'system-assistant') {
    return isSystemAssistantPolicySupported(claims);
  }
  if (claims.agentId === 'autonomous-review-agent') {
    return (
      hasServerReadClasses(claims) &&
      claims.destinationKeys.length === 1 &&
      parseAutonomousReviewAgentPolicy(claims) !== undefined
    );
  }
  if (claims.agentId === 'adt-execution') {
    return parseScopedAdtInvocationPolicy(claims) !== undefined;
  }
  if (claims.agentId === 'delegated-assistant') {
    return parseDelegatedAssistantReadPolicy(claims) !== undefined;
  }
  if (claims.agentId === 'ai-review') {
    return (
      hasServerReadClasses(claims) &&
      claims.destinationKeys.length === 1 &&
      parseAiReviewFrozenSourcePolicy(claims) !== undefined
    );
  }
  return false;
}

/**
 * The autonomous agent may inspect exactly one System through exactly one
 * Destination. Its execution id binds every ADT activity to ADT's durable
 * Agent Execution, while the sidecar's ordinary scope catalogue continues to
 * deny write tools. No ambient limits or additional constraints are accepted.
 */
export function parseAutonomousReviewAgentPolicy(
  claims: TrustedMcpInvocationClaims,
): { readonly executionId: string; readonly systemSid: string } | undefined {
  if (claims.agentId !== 'autonomous-review-agent') return undefined;
  if (Object.keys(claims.limits).length !== 0) return undefined;
  const constraintKeys = Object.keys(claims.constraint).sort((a, b) =>
    a.localeCompare(b),
  );
  if (constraintKeys.length !== 2) return undefined;
  if (constraintKeys[0] !== 'executionId') return undefined;
  if (constraintKeys[1] !== 'systemSid') return undefined;
  const executionId = requiredUuid(claims.constraint.executionId);
  const systemSid = requiredSystemSid(claims.constraint.systemSid);
  if (!executionId || !systemSid) return undefined;
  return Object.freeze({ executionId, systemSid });
}

function requiredUuid(value: unknown): string | undefined {
  return typeof value === 'string' && uuidPattern.test(value)
    ? value
    : undefined;
}

function requiredSourceReference(value: unknown): string | undefined {
  return requiredString(value, { maxLength: MAX_SOURCE_REFERENCE_LENGTH });
}

function hasExactSortedKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort((left, right) =>
    left.localeCompare(right),
  );
  const sortedExpected = [...expected].sort((left, right) =>
    left.localeCompare(right),
  );
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function positiveSafeInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) > 0
    ? (value as number)
    : undefined;
}

function parseSafeExecuteCommon(
  value: Readonly<Record<string, McpInvocationJsonValue>>,
):
  | {
      maxDurationMs: number;
      maxResultBytes: number;
      maxFindings: number;
      maxObjects: number;
    }
  | undefined {
  const maxDurationMs = positiveSafeInteger(value.maxDurationMs);
  const maxResultBytes = positiveSafeInteger(value.maxResultBytes);
  const maxFindings = positiveSafeInteger(value.maxFindings);
  const maxObjects = positiveSafeInteger(value.maxObjects);
  if (
    maxDurationMs === undefined ||
    maxResultBytes === undefined ||
    maxFindings === undefined ||
    maxObjects === undefined
  ) {
    return undefined;
  }
  return { maxDurationMs, maxResultBytes, maxFindings, maxObjects };
}

const safeExecuteCommonKeys = [
  'operationId',
  'check',
  'maxDurationMs',
  'maxResultBytes',
  'maxFindings',
  'maxObjects',
] as const;

function parseAtcSafeExecutePolicy(
  cloned: Record<string, McpInvocationJsonValue>,
  common: ReturnType<typeof parseSafeExecuteCommon>,
): SafeExecutePolicy | undefined {
  if (!common) return undefined;
  if (
    cloned.operationId !== 'atc_run' ||
    cloned.check !== 'atc' ||
    !hasExactSortedKeys(cloned, [
      ...safeExecuteCommonKeys,
      'maxPackages',
      'maxVariants',
    ])
  ) {
    return undefined;
  }
  const maxPackages = positiveSafeInteger(cloned.maxPackages);
  const maxVariants = positiveSafeInteger(cloned.maxVariants);
  if (maxPackages === undefined || maxVariants === undefined) {
    return undefined;
  }
  return Object.freeze({
    operationId: 'atc_run',
    check: 'atc',
    ...common,
    maxPackages,
    maxVariants,
  });
}

function parseAunitSafeExecutePolicy(
  cloned: Record<string, McpInvocationJsonValue>,
  common: ReturnType<typeof parseSafeExecuteCommon>,
): SafeExecutePolicy | undefined {
  if (!common) return undefined;
  if (
    cloned.operationId !== 'run_unit_tests' ||
    cloned.check !== 'aunit' ||
    cloned.effectiveWithCoverage !== false ||
    cloned.effectiveCoverageFormat !== null ||
    !hasExactSortedKeys(cloned, [
      ...safeExecuteCommonKeys,
      'effectiveWithCoverage',
      'effectiveCoverageFormat',
      'maxTestClasses',
      'maxTestMethods',
    ])
  ) {
    return undefined;
  }
  const maxTestClasses = positiveSafeInteger(cloned.maxTestClasses);
  const maxTestMethods = positiveSafeInteger(cloned.maxTestMethods);
  if (maxTestClasses === undefined || maxTestMethods === undefined) {
    return undefined;
  }
  return Object.freeze({
    operationId: 'run_unit_tests',
    check: 'aunit',
    effectiveWithCoverage: false,
    effectiveCoverageFormat: null,
    ...common,
    maxTestClasses,
    maxTestMethods,
  });
}

function parseCoverageSafeExecutePolicy(
  cloned: Record<string, McpInvocationJsonValue>,
  common: ReturnType<typeof parseSafeExecuteCommon>,
): SafeExecutePolicy | undefined {
  if (!common) return undefined;
  const format = cloned.effectiveCoverageFormat;
  if (
    cloned.operationId !== 'run_unit_tests' ||
    cloned.check !== 'coverage' ||
    cloned.effectiveWithCoverage !== true ||
    (format !== 'jacoco' && format !== 'sonar-generic') ||
    !hasExactSortedKeys(cloned, [
      ...safeExecuteCommonKeys,
      'effectiveWithCoverage',
      'effectiveCoverageFormat',
      'maxPrograms',
      'maxMeasurements',
    ])
  ) {
    return undefined;
  }
  const maxPrograms = positiveSafeInteger(cloned.maxPrograms);
  const maxMeasurements = positiveSafeInteger(cloned.maxMeasurements);
  if (maxPrograms === undefined || maxMeasurements === undefined) {
    return undefined;
  }
  return Object.freeze({
    operationId: 'run_unit_tests',
    check: 'coverage',
    effectiveWithCoverage: true,
    effectiveCoverageFormat: format,
    ...common,
    maxPrograms,
    maxMeasurements,
  });
}

export function parseSafeExecutePolicy(
  value: unknown,
): SafeExecutePolicy | undefined {
  if (!isPlainObject(value)) return undefined;
  const cloned = cloneJsonRecord(value);
  if (!cloned) return undefined;
  const common = parseSafeExecuteCommon(cloned);

  return (
    parseAtcSafeExecutePolicy(cloned, common) ??
    parseAunitSafeExecutePolicy(cloned, common) ??
    parseCoverageSafeExecutePolicy(cloned, common)
  );
}

function parseSortedUniqueStrings(
  value: unknown,
  options: {
    maxItems: number;
    minItems: number;
    matches: (item: string) => boolean;
  },
): readonly string[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length < options.minItems ||
    value.length > options.maxItems
  ) {
    return undefined;
  }
  const parsed: string[] = [];
  for (const item of value) {
    if (
      typeof item !== 'string' ||
      !options.matches(item) ||
      parsed.includes(item)
    ) {
      return undefined;
    }
    parsed.push(item);
  }
  const sorted = [...parsed].sort((left, right) => left.localeCompare(right));
  if (!parsed.every((item, index) => item === sorted[index])) return undefined;
  return Object.freeze(parsed);
}

function parseScopedObjectKeys(value: unknown): readonly string[] | undefined {
  return parseSortedUniqueStrings(value, {
    maxItems: MAX_SCOPED_OBJECT_KEYS,
    minItems: 1,
    matches: (item) => scopedCanonicalObjectKeyPattern.test(item),
  });
}

function parseScopedToolNames(
  value: unknown,
  operationClass: 'read' | 'safe_execute',
  safeExecutePolicy: SafeExecutePolicy | undefined,
): readonly string[] | undefined {
  const toolNames = parseSortedUniqueStrings(value, {
    maxItems: operationClass === 'read' ? scopedReadTools.size : 1,
    minItems: 1,
    matches: (item) =>
      operationClass === 'read'
        ? scopedReadTools.has(item)
        : item === 'atc_run' || item === 'run_unit_tests',
  });
  if (!toolNames) return undefined;
  if (operationClass === 'read') {
    return safeExecutePolicy === undefined ? toolNames : undefined;
  }
  return toolNames[0] === safeExecutePolicy?.operationId
    ? toolNames
    : undefined;
}

function parseExecutionAuthorizationToken(value: unknown): string | undefined {
  return typeof value === 'string' &&
    value.length <= MAX_SAFE_EXECUTE_GRANT_BYTES &&
    compactJwsPattern.test(value)
    ? value
    : undefined;
}

export function parseScopedAdtInvocationPolicy(
  claims: TrustedMcpInvocationClaims,
): ScopedAdtInvocationPolicy | undefined {
  if (
    claims.agentId !== 'adt-execution' ||
    claims.destinationKeys.length !== 1
  ) {
    return undefined;
  }
  if (
    claims.classes.length !== 2 ||
    claims.classes[0] !== 'server' ||
    (claims.classes[1] !== 'read' && claims.classes[1] !== 'safe_execute')
  ) {
    return undefined;
  }
  const operationClass = claims.classes[1];
  const safeExecute = operationClass === 'safe_execute';
  const expectedConstraintKeys = [
    'kind',
    'scopeId',
    'executionId',
    'systemSid',
    'resourceKeys',
    'toolNames',
    ...(safeExecute
      ? ['safeExecutePolicy', 'authorizationId', 'authorizationToken']
      : []),
  ];
  if (!hasExactSortedKeys(claims.constraint, expectedConstraintKeys)) {
    return undefined;
  }
  if (
    claims.constraint.kind !== 'adt-execution-v1' ||
    !hasExactSortedKeys(claims.limits, ['maxToolCalls'])
  ) {
    return undefined;
  }

  const scopeId = requiredUuid(claims.constraint.scopeId);
  const executionId = requiredUuid(claims.constraint.executionId);
  const systemSid = requiredSystemSid(claims.constraint.systemSid);
  const resourceKeys = parseScopedObjectKeys(claims.constraint.resourceKeys);
  const maxToolCalls = positiveSafeInteger(claims.limits.maxToolCalls);
  if (
    !scopeId ||
    !executionId ||
    !systemSid ||
    !resourceKeys ||
    maxToolCalls === undefined ||
    maxToolCalls > MAX_SCOPED_TOOL_CALLS
  ) {
    return undefined;
  }

  const safeExecutePolicy = safeExecute
    ? parseSafeExecutePolicy(claims.constraint.safeExecutePolicy)
    : undefined;
  const toolNames = parseScopedToolNames(
    claims.constraint.toolNames,
    operationClass,
    safeExecutePolicy,
  );
  if (!toolNames) return undefined;

  if (!safeExecute) {
    return Object.freeze({
      scopeId,
      executionId,
      systemSid,
      resourceKeys,
      toolNames,
      operationClass,
      maxToolCalls,
    });
  }

  const authorizationId = requiredUuid(claims.constraint.authorizationId);
  const authorizationToken = parseExecutionAuthorizationToken(
    claims.constraint.authorizationToken,
  );
  if (!safeExecutePolicy || !authorizationId || !authorizationToken) {
    return undefined;
  }
  return Object.freeze({
    scopeId,
    executionId,
    systemSid,
    resourceKeys,
    toolNames,
    operationClass,
    maxToolCalls,
    safeExecutePolicy,
    authorizationId,
    authorizationToken,
  });
}

export function parseFrozenSource(
  source: unknown,
  sourceKeys: Set<string>,
  sourceRefs: Set<string>,
):
  | {
      readonly canonicalKey: string;
      readonly componentId: string;
      readonly sourceRef: string;
    }
  | undefined {
  if (!isPlainObject(source)) return undefined;
  const canonicalKey = source.canonicalKey;
  const componentId = requiredComponentIdentifier(source.componentId);
  const sourceRef = requiredSourceReference(source.sourceRef);
  if (typeof canonicalKey !== 'string') return undefined;
  if (!canonicalKeyPattern.test(canonicalKey)) return undefined;
  if (!componentId || !sourceRef) return undefined;
  const key = `${canonicalKey}\u0000${componentId}`;
  if (sourceKeys.has(key) || sourceRefs.has(sourceRef)) return undefined;
  sourceKeys.add(key);
  sourceRefs.add(sourceRef);
  return Object.freeze({ canonicalKey, componentId, sourceRef });
}

/**
 * Parse the only AI Review policy currently safe to dispatch. Every property
 * is deliberately exact: accepting a valid JWS with one ignored narrowing
 * field would widen the Review beyond its frozen materialisation.
 */
const expectedAiReviewConstraintKeys = [
  'frozenSources',
  'kind',
  'reviewId',
  'runId',
  'systemSid',
];

function isSortedKeysEqual(
  keys: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function parseAiReviewSources(rawSources: unknown):
  | {
      readonly canonicalKey: string;
      readonly componentId: string;
      readonly sourceRef: string;
    }[]
  | undefined {
  if (!Array.isArray(rawSources)) return undefined;
  if (rawSources.length === 0 || rawSources.length > MAX_FROZEN_SOURCES) {
    return undefined;
  }
  const sourceKeys = new Set<string>();
  const sourceRefs = new Set<string>();
  const sources: {
    canonicalKey: string;
    componentId: string;
    sourceRef: string;
  }[] = [];
  for (const rawSource of rawSources) {
    if (!isPlainObject(rawSource)) return undefined;
    const rawSourceKeys = Object.keys(rawSource).sort((a, b) =>
      a.localeCompare(b),
    );
    if (rawSourceKeys.length !== 3) return undefined;
    if (rawSourceKeys[0] !== 'canonicalKey') return undefined;
    if (rawSourceKeys[1] !== 'componentId') return undefined;
    if (rawSourceKeys[2] !== 'sourceRef') return undefined;
    const parsed = parseFrozenSource(rawSource, sourceKeys, sourceRefs);
    if (!parsed) return undefined;
    sources.push(parsed);
  }
  return sources;
}

function parseMaxSourceBytes(
  limits: Readonly<Record<string, McpInvocationJsonValue>>,
): number | undefined {
  const limitKeys = Object.keys(limits);
  if (limitKeys.length !== 1) return undefined;
  if (limitKeys[0] !== 'maxSourceBytes') return undefined;
  const maxSourceBytes = limits.maxSourceBytes;
  if (typeof maxSourceBytes !== 'number') return undefined;
  if (!Number.isSafeInteger(maxSourceBytes)) return undefined;
  if (maxSourceBytes < 1) return undefined;
  if (maxSourceBytes > MAX_FROZEN_SOURCE_BYTES) return undefined;
  return maxSourceBytes;
}

function parseAiReviewIdentity(
  constraint: Readonly<Record<string, McpInvocationJsonValue>>,
):
  | {
      readonly reviewId: string;
      readonly runId: string;
      readonly systemSid: string;
    }
  | undefined {
  const reviewId = requiredUuid(constraint.reviewId);
  const runId = requiredUuid(constraint.runId);
  const systemSid = requiredIdentifier(constraint.systemSid);
  if (!reviewId) return undefined;
  if (!runId) return undefined;
  if (!systemSid) return undefined;
  if (systemSid.length > 16) return undefined;
  return Object.freeze({ reviewId, runId, systemSid });
}

export function parseAiReviewFrozenSourcePolicy(
  claims: TrustedMcpInvocationClaims,
): AiReviewFrozenSourcePolicy | undefined {
  if (claims.agentId !== 'ai-review') return undefined;
  const constraint = claims.constraint;
  const constraintKeys = Object.keys(constraint).sort((a, b) =>
    a.localeCompare(b),
  );
  if (!isSortedKeysEqual(constraintKeys, expectedAiReviewConstraintKeys)) {
    return undefined;
  }
  if (constraint.kind !== 'ai-review-frozen-v1') return undefined;

  const identity = parseAiReviewIdentity(constraint);
  if (!identity) return undefined;

  const sources = parseAiReviewSources(constraint.frozenSources);
  if (!sources) return undefined;

  const maxSourceBytes = parseMaxSourceBytes(claims.limits);
  if (maxSourceBytes === undefined) return undefined;

  return Object.freeze({
    reviewId: identity.reviewId,
    runId: identity.runId,
    systemSid: identity.systemSid,
    sources: Object.freeze(sources),
    maxSourceBytes,
  });
}

function requiredString(
  value: unknown,
  options: {
    readonly maxLength: number;
    readonly trim?: boolean;
    readonly allowControlChars?: boolean;
  },
): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value.length === 0 || value.length > options.maxLength) return undefined;
  if (options.trim && value.trim().length === 0) return undefined;
  if (
    !options.allowControlChars &&
    // eslint-disable-next-line no-control-regex
    /[\s\u0000-\u0008\u000e-\u001f\u007f]/u.test(value)
  ) {
    return undefined;
  }
  return value;
}

function requiredIdentifier(value: unknown): string | undefined {
  return requiredString(value, {
    maxLength: MAX_IDENTIFIER_LENGTH,
    trim: true,
    allowControlChars: true,
  });
}

function requiredSystemSid(value: unknown): string | undefined {
  const systemSid = requiredIdentifier(value);
  return systemSid &&
    systemSid.length <= 16 &&
    /^[A-Za-z0-9_-]+$/u.test(systemSid)
    ? systemSid
    : undefined;
}

function requiredComponentIdentifier(value: unknown): string | undefined {
  return requiredString(value, { maxLength: MAX_COMPONENT_IDENTIFIER_LENGTH });
}

function requiredConfigurationIdentifier(value: unknown, name: string): string {
  const identifier = requiredIdentifier(value);
  if (!identifier) {
    throw new Error(`MCP invocation verifier requires a valid ${name}`);
  }
  return identifier;
}

function extractBearerCredential(
  authorizationHeader: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(authorizationHeader)) return undefined;
  if (typeof authorizationHeader !== 'string') return undefined;
  const header = authorizationHeader.trim();
  if (header.length < 8 || header.slice(0, 7).toLowerCase() !== 'bearer ') {
    return undefined;
  }
  const credential = header.slice(7).trim();
  return credential.length > 0 ? credential : undefined;
}

function isTrustedOperationClass(
  value: unknown,
): value is McpTrustedOperationClass {
  return typeof value === 'string' && trustedOperationClasses.has(value);
}

function cloneTrustedClasses(
  value: unknown,
): readonly McpTrustedOperationClass[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const classes: McpTrustedOperationClass[] = [];
  for (const item of value) {
    if (!isTrustedOperationClass(item) || classes.includes(item)) {
      return undefined;
    }
    classes.push(item);
  }
  return Object.freeze(classes);
}

function cloneDestinationKeys(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const destinationKeys: string[] = [];
  for (const item of value) {
    if (
      typeof item !== 'string' ||
      !destinationKeyPattern.test(item) ||
      destinationKeys.includes(item)
    ) {
      return undefined;
    }
    destinationKeys.push(item);
  }
  return Object.freeze(destinationKeys);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJsonScalar(value: unknown): McpInvocationJsonValue | undefined {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

function cloneJsonArray(
  value: unknown[],
  depth: number,
): readonly McpInvocationJsonValue[] | undefined {
  const cloned: McpInvocationJsonValue[] = [];
  for (const item of value) {
    const clonedItem = cloneJsonValue(item, depth + 1);
    if (clonedItem === undefined) return undefined;
    cloned.push(clonedItem);
  }
  return Object.freeze(cloned);
}

function cloneJsonObject(
  value: Record<string, unknown>,
  depth: number,
): Readonly<Record<string, McpInvocationJsonValue>> | undefined {
  const cloned = Object.create(null) as Record<string, McpInvocationJsonValue>;
  for (const [key, item] of Object.entries(value)) {
    const clonedItem = cloneJsonValue(item, depth + 1);
    if (clonedItem === undefined) return undefined;
    cloned[key] = clonedItem;
  }
  return Object.freeze(cloned);
}

function cloneJsonValue(
  value: unknown,
  depth = 0,
): McpInvocationJsonValue | undefined {
  if (depth > MAX_JSON_DEPTH) return undefined;
  const scalar = cloneJsonScalar(value);
  if (scalar !== undefined) return scalar;
  if (Array.isArray(value)) return cloneJsonArray(value, depth);
  if (isPlainObject(value)) return cloneJsonObject(value, depth);
  return undefined;
}

function cloneJsonRecord(
  value: unknown,
): Readonly<Record<string, McpInvocationJsonValue>> | undefined {
  const cloned = cloneJsonValue(value);
  return cloned !== null && !Array.isArray(cloned) && typeof cloned === 'object'
    ? (cloned as Readonly<Record<string, McpInvocationJsonValue>>)
    : undefined;
}

function isUnixTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isValidTokenTimestamps(record: Record<string, unknown>): boolean {
  if (!isUnixTimestamp(record.iat)) return false;
  if (!isUnixTimestamp(record.nbf)) return false;
  if (!isUnixTimestamp(record.exp)) return false;
  if (record.nbf < record.iat) return false;
  if (record.exp < record.nbf) return false;
  if (record.exp - record.iat > MAX_TOKEN_LIFETIME_SECONDS) return false;
  return true;
}

function isValidTokenHeader(
  record: Record<string, unknown>,
  expectedKeyId: string,
  expectedIssuer: string,
  expectedAudience: string,
): boolean {
  if (record.v !== INVOCATION_VERSION) return false;
  if (record.kid !== expectedKeyId) return false;
  if (record.iss !== expectedIssuer) return false;
  if (record.aud !== expectedAudience) return false;
  return isValidTokenTimestamps(record);
}

function isValidTokenAgent(
  agentId: unknown,
): agentId is TrustedMcpInvocationClaims['agentId'] {
  return typeof agentId === 'string' && trustedAgentIds.has(agentId);
}

function parseInvocationActors(record: Record<string, unknown>):
  | {
      tokenId: string;
      principal: string;
      agentId: TrustedMcpInvocationClaims['agentId'];
      correlationId: string;
    }
  | undefined {
  const tokenId = requiredIdentifier(record.jti);
  const principal = requiredIdentifier(record.principal);
  const correlationId = requiredIdentifier(record.correlationId);
  const agentId = record.agentId;
  if (!tokenId || !principal || !correlationId || !isValidTokenAgent(agentId)) {
    return undefined;
  }
  return Object.freeze({ tokenId, principal, agentId, correlationId });
}

function buildInvocationClaims(
  record: Record<string, unknown>,
): TrustedMcpInvocationClaims | undefined {
  const actors = parseInvocationActors(record);
  if (!actors) return undefined;

  const classes = cloneTrustedClasses(record.classes);
  const destinationKeys = cloneDestinationKeys(record.destinationKeys);
  const constraint = cloneJsonRecord(record.constraint);
  const limits = cloneJsonRecord(record.limits);
  if (!classes) return undefined;
  if (!destinationKeys) return undefined;
  if (!constraint) return undefined;
  if (!limits) return undefined;

  return Object.freeze({
    tokenId: actors.tokenId,
    principal: actors.principal,
    agentId: actors.agentId,
    classes,
    destinationKeys,
    correlationId: actors.correlationId,
    constraint,
    limits,
  });
}

function claimsFromPayload(
  payload: JWTPayload,
  expectedKeyId: string,
  expectedIssuer: string,
  expectedAudience: string,
): TrustedMcpInvocationClaims | undefined {
  const record = payload as Record<string, unknown>;
  if (
    !isValidTokenHeader(record, expectedKeyId, expectedIssuer, expectedAudience)
  ) {
    return undefined;
  }
  return buildInvocationClaims(record);
}

function currentDate(now: (() => Date | number) | undefined): Date {
  const value = now?.() ?? new Date();
  return value instanceof Date ? value : new Date(value);
}

/**
 * Build a fail-closed verifier for the one ADT-Server invocation key.
 * Configuration failures throw before serving traffic; credential failures
 * always resolve to `undefined` without logging token-derived information.
 */
export function createMcpInvocationVerifier(
  options: McpInvocationVerifierOptions,
): McpInvocationVerifier {
  if (!options?.publicKey) {
    throw new Error('MCP invocation verifier requires an ES256 public key');
  }
  const publicKey = options.publicKey;
  const keyId = requiredConfigurationIdentifier(options.keyId, 'key id');
  const issuer = requiredConfigurationIdentifier(options.issuer, 'issuer');
  const audience = requiredConfigurationIdentifier(
    options.audience,
    'audience',
  );
  const now = options.now;

  return {
    async verify(authorizationHeader) {
      const credential = extractBearerCredential(authorizationHeader);
      if (!credential) return undefined;

      try {
        const verified = await jwtVerify(credential, publicKey, {
          algorithms: ['ES256'],
          issuer,
          audience,
          currentDate: currentDate(now),
        });
        const protectedHeader = verified.protectedHeader;
        if (
          protectedHeader.alg !== 'ES256' ||
          protectedHeader.kid !== keyId ||
          protectedHeader.typ !== 'JWT'
        ) {
          return undefined;
        }
        return claimsFromPayload(verified.payload, keyId, issuer, audience);
      } catch {
        return undefined;
      }
    },
  };
}
