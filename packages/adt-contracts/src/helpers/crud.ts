/**
 * CRUD Contract Helper
 *
 * Generates full CRUD contracts for ADT repository objects following the
 * standard SAP ADT URL template pattern:
 *
 *   {basePath}/{object_name}{?corrNr,lockHandle,version,accessMode,_action}
 *
 * @example
 * ```ts
 * import { crud } from '../helpers/crud';
 * import { classes } from '../schemas';
 *
 * export const classesContract = crud({
 *   basePath: '/sap/bc/adt/oo/classes',
 *   schema: classes,
 *   contentType: 'application/vnd.sap.adt.oo.classes.v4+xml',
 * });
 *
 * // Usage:
 * // classesContract.get('zcl_my_class')
 * // classesContract.post({ corrNr: 'DEVK900001' })
 * // classesContract.put('zcl_my_class', { lockHandle: '...' })
 * // classesContract.delete('zcl_my_class')
 * ```
 */

import { http } from '@abapify/speci/rest';
import type { Serializable, RestEndpointDescriptor } from '@abapify/speci/rest';

/**
 * Common ADT query parameters for CRUD operations
 */
export interface CrudQueryParams {
  /** Transport/correction number */
  corrNr?: string;
  /** Lock handle from LOCK action */
  lockHandle?: string;
  /** Object version (active/inactive) */
  version?: string;
  /** Access mode (MODIFY, SOURCE, etc.) */
  accessMode?: string;
  /** Action (LOCK, UNLOCK, ACTIVATE, etc.) */
  _action?: string;
}

// NOTE: SourceType and IncludeType are intentionally generic strings.
// The specific valid values are defined by the caller (e.g., classes.ts)
// based on the SAP XSD schema for each object type.

/**
 * Query options for source/include PUT operations
 */
export interface SourcePutOptions {
  /** Lock handle from previous LOCK action */
  lockHandle?: string;
  /** Transport/correction number */
  corrNr?: string;
}

/**
 * Source operations contract
 */
export interface SourceContract {
  get: (
    name: string,
  ) => RestEndpointDescriptor<'GET', string, never, { 200: string }>;
  put: (
    name: string,
    options?: SourcePutOptions,
  ) => RestEndpointDescriptor<'PUT', string, string, { 200: string }>;
}

/**
 * Options for creating a CRUD contract
 */
export interface CrudOptions<S extends Serializable<unknown>> {
  /** Base path for the resource (e.g., '/sap/bc/adt/oo/classes') */
  basePath: string;
  /** Schema for parsing/building XML */
  schema: S;
  /** Content-Type header for POST/PUT (single specific version, e.g., 'application/vnd.sap.adt.oo.classes.v4+xml') */
  contentType: string;
  /** Accept header for GET (multi-version, newest first). Falls back to contentType if not provided. */
  accept?: string;
  /** Optional: Transform object name for URL (default: lowercase) */
  nameTransform?: (name: string) => string;
  /** Optional: Source endpoints to generate (e.g., ['main']) */
  sources?: readonly string[];
  /** Optional: Include endpoints to generate (e.g., ['definitions', 'implementations', 'testclasses']) */
  includes?: readonly string[];
}

/**
 * Options for lock operation
 */
export interface LockOptions {
  /** Transport/correction number */
  corrNr?: string;
  /** Access mode (default: MODIFY) */
  accessMode?: 'MODIFY' | 'SOURCE';
}

/**
 * Options for unlock operation
 */
export interface UnlockOptions {
  /** Lock handle from previous LOCK action */
  lockHandle: string;
}

/**
 * Options for objectstructure operation
 */
export interface ObjectStructureOptions {
  /** Object version (active/inactive) */
  version?: 'active' | 'inactive';
  /** Include short descriptions */
  withShortDescriptions?: boolean;
}

/**
 * Base CRUD contract type (always present)
 */
export interface CrudContractBase<S extends Serializable<unknown>> {
  /** The schema used for XML serialization/deserialization */
  readonly bodySchema: S;

  /** GET {basePath}/{name} - Retrieve object metadata */
  get: (
    name: string,
    options?: Pick<CrudQueryParams, 'version'>,
  ) => RestEndpointDescriptor<'GET', string, never, { 200: S }>;

  /** POST {basePath} - Create new object */
  post: (
    options?: Pick<CrudQueryParams, 'corrNr'>,
  ) => RestEndpointDescriptor<'POST', string, S, { 200: S }>;

  /** PUT {basePath}/{name} - Update object */
  put: (
    name: string,
    options?: Pick<CrudQueryParams, 'corrNr' | 'lockHandle'>,
  ) => RestEndpointDescriptor<'PUT', string, S, { 200: S }>;

  /** DELETE {basePath}/{name} - Delete object */
  delete: (
    name: string,
    options?: Pick<CrudQueryParams, 'corrNr' | 'lockHandle'>,
  ) => RestEndpointDescriptor<'DELETE', string, never, { 204: undefined }>;

  /** POST {basePath}/{name}?_action=LOCK - Lock object for modification */
  lock: (
    name: string,
    options?: LockOptions,
  ) => RestEndpointDescriptor<'POST', string, never, { 200: undefined }>;

  /** POST {basePath}/{name}?_action=UNLOCK - Unlock object */
  unlock: (
    name: string,
    options: UnlockOptions,
  ) => RestEndpointDescriptor<'POST', string, never, { 200: undefined }>;

  /** GET {basePath}/{name}/objectstructure - Get object structure (includes, methods, etc.) */
  objectstructure: (
    name: string,
    options?: ObjectStructureOptions,
  ) => RestEndpointDescriptor<'GET', string, never, { 200: undefined }>;
}

/**
 * Source operations (get/put for source code)
 */
export interface SourceOperations {
  get: (
    name: string,
  ) => RestEndpointDescriptor<'GET', string, never, { 200: string }>;
  put: (
    name: string,
    options?: SourcePutOptions,
  ) => RestEndpointDescriptor<'PUT', string, string, { 200: string }>;
}

/**
 * Source contract - nested under 'source' property
 * Generated when sources option is provided
 */
export type SourcesContract<Sources extends readonly string[]> = {
  [K in Sources[number]]: SourceOperations;
};

/**
 * Includes contract - nested under 'includes' property
 * Generated when includes option is provided
 */
export type IncludesContract<Includes extends readonly string[]> = {
  /** Generic get/put for any include type */
  get: (
    name: string,
    includeType: Includes[number],
  ) => RestEndpointDescriptor<'GET', string, never, { 200: string }>;
  put: (
    name: string,
    includeType: Includes[number],
    options?: SourcePutOptions,
  ) => RestEndpointDescriptor<'PUT', string, string, { 200: string }>;
} & {
  /** Shorthand accessors for specific includes */
  [K in Includes[number]]: SourceOperations;
};

/**
 * Full CRUD contract type with optional source and includes
 */
export type CrudContract<
  S extends Serializable<unknown>,
  Sources extends readonly string[] | undefined = undefined,
  Includes extends readonly string[] | undefined = undefined,
> = CrudContractBase<S> &
  (Sources extends readonly string[]
    ? { source: SourcesContract<Sources> }
    : object) &
  (Includes extends readonly string[]
    ? { includes: IncludesContract<Includes> }
    : object);

/**
 * Create source operations for a given source type
 */
function createSourceOperations(
  basePath: string,
  sourceType: string,
  nameTransform: (n: string) => string,
): SourceOperations {
  return {
    get: (name: string) =>
      http.get(`${basePath}/${nameTransform(name)}/source/${sourceType}`, {
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'text/plain' },
      }),
    put: (name: string, options?: SourcePutOptions) =>
      http.put(`${basePath}/${nameTransform(name)}/source/${sourceType}`, {
        body: undefined as unknown as string,
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
        query: {
          ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
          ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
        },
      }),
  };
}

/**
 * Create include operations for a given include type
 */
function createIncludeOperations(
  basePath: string,
  includeType: string,
  nameTransform: (n: string) => string,
): SourceOperations {
  return {
    get: (name: string) =>
      http.get(`${basePath}/${nameTransform(name)}/includes/${includeType}`, {
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'text/plain' },
      }),
    put: (name: string, options?: SourcePutOptions) =>
      http.put(`${basePath}/${nameTransform(name)}/includes/${includeType}`, {
        body: undefined as unknown as string,
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
        query: {
          ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
          ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
        },
      }),
  };
}

/**
 * Create a full CRUD contract for an ADT repository object
 *
 * Follows the standard SAP ADT URL template pattern:
 *   {basePath}/{object_name}{?corrNr,lockHandle,version,accessMode,_action}
 *
 * @example Basic CRUD
 * ```ts
 * const packagesContract = crud({
 *   basePath: '/sap/bc/adt/packages',
 *   schema: packages,
 *   contentType: 'application/vnd.sap.adt.packages.v1+xml',
 * });
 * ```
 *
 * @example With source code support
 * ```ts
 * const interfacesContract = crud({
 *   basePath: '/sap/bc/adt/oo/interfaces',
 *   schema: interfaces,
 *   contentType: 'application/vnd.sap.adt.oo.interfaces.v5+xml',
 *   sources: ['main'],
 * });
 * // interfacesContract.source.main.get('zif_my_interface')
 * ```
 *
 * @example With includes support (classes)
 * ```ts
 * const classesContract = crud({
 *   basePath: '/sap/bc/adt/oo/classes',
 *   schema: classes,
 *   contentType: 'application/vnd.sap.adt.oo.classes.v4+xml',
 *   sources: ['main'],
 *   includes: ['definitions', 'implementations', 'macros'],
 * });
 * // classesContract.source.main.get('zcl_my_class')
 * // classesContract.includes.definitions.get('zcl_my_class')
 * // classesContract.includes.get('zcl_my_class', 'implementations')
 * ```
 */
export function crud<
  S extends Serializable<unknown>,
  const Sources extends readonly string[] | undefined = undefined,
  const Includes extends readonly string[] | undefined = undefined,
>(
  options: CrudOptions<S> & { sources?: Sources; includes?: Includes },
): CrudContract<S, Sources, Includes> {
  const {
    basePath,
    schema,
    contentType,
    accept = contentType,
    nameTransform = (n) => n.toLowerCase(),
    sources,
    includes,
  } = options;

  return {
    /** Schema for XML serialization/deserialization */
    bodySchema: schema,

    /**
     * GET {basePath}/{name}
     * Retrieve object metadata
     */
    get: (name: string, queryOptions?: Pick<CrudQueryParams, 'version'>) =>
      http.get(`${basePath}/${nameTransform(name)}`, {
        responses: { 200: schema },
        headers: { Accept: accept },
        query: queryOptions?.version
          ? { version: queryOptions.version }
          : undefined,
      }),

    /**
     * POST {basePath}
     * Create a new object
     */
    post: (queryOptions?: Pick<CrudQueryParams, 'corrNr'>) =>
      http.post(basePath, {
        body: schema,
        responses: { 200: schema },
        headers: {
          Accept: accept,
          'Content-Type': contentType,
        },
        query: queryOptions?.corrNr
          ? { corrNr: queryOptions.corrNr }
          : undefined,
      }),

    /**
     * PUT {basePath}/{name}
     * Update object metadata
     */
    put: (
      name: string,
      queryOptions?: Pick<CrudQueryParams, 'corrNr' | 'lockHandle'>,
    ) =>
      http.put(`${basePath}/${nameTransform(name)}`, {
        body: schema,
        responses: { 200: schema },
        headers: {
          Accept: accept,
          'Content-Type': contentType,
        },
        query: {
          ...(queryOptions?.corrNr ? { corrNr: queryOptions.corrNr } : {}),
          ...(queryOptions?.lockHandle
            ? { lockHandle: queryOptions.lockHandle }
            : {}),
        },
      }),

    /**
     * DELETE {basePath}/{name}
     * Delete object
     */
    delete: (
      name: string,
      queryOptions?: Pick<CrudQueryParams, 'corrNr' | 'lockHandle'>,
    ) =>
      http.delete(`${basePath}/${nameTransform(name)}`, {
        responses: { 204: undefined },
        query: {
          ...(queryOptions?.corrNr ? { corrNr: queryOptions.corrNr } : {}),
          ...(queryOptions?.lockHandle
            ? { lockHandle: queryOptions.lockHandle }
            : {}),
        },
      }),

    /**
     * POST {basePath}/{name}?_action=LOCK
     * Lock object for modification
     *
     * Response contains lock handle in XML format:
     * <asx:abap>...<DATA><LOCK_HANDLE>xxx</LOCK_HANDLE><CORRNR>yyy</CORRNR>...</DATA>...</asx:abap>
     */
    lock: (name: string, lockOptions?: LockOptions) =>
      http.post(`${basePath}/${nameTransform(name)}`, {
        responses: { 200: undefined },
        headers: {
          'X-sap-adt-sessiontype': 'stateful',
          'x-sap-security-session': 'use',
          Accept:
            'application/*,application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result',
        },
        query: {
          _action: 'LOCK',
          accessMode: lockOptions?.accessMode ?? 'MODIFY',
          ...(lockOptions?.corrNr ? { corrNr: lockOptions.corrNr } : {}),
        },
      }),

    /**
     * POST {basePath}/{name}?_action=UNLOCK
     * Unlock object
     */
    unlock: (name: string, unlockOptions: UnlockOptions) =>
      http.post(`${basePath}/${nameTransform(name)}`, {
        responses: { 200: undefined },
        headers: {
          'X-sap-adt-sessiontype': 'stateful',
          'x-sap-security-session': 'use',
        },
        query: {
          _action: 'UNLOCK',
          accessMode: 'MODIFY',
          lockHandle: unlockOptions.lockHandle,
        },
      }),

    /**
     * GET {basePath}/{name}/objectstructure
     * Get object structure (includes, methods, attributes, etc.)
     */
    objectstructure: (
      name: string,
      structureOptions?: ObjectStructureOptions,
    ) =>
      http.get(`${basePath}/${nameTransform(name)}/objectstructure`, {
        responses: { 200: undefined },
        query: {
          ...(structureOptions?.version
            ? { version: structureOptions.version }
            : {}),
          ...(structureOptions?.withShortDescriptions !== undefined
            ? {
                withShortDescriptions: String(
                  structureOptions.withShortDescriptions,
                ),
              }
            : {}),
        },
      }),

    // Conditionally add source operations
    ...(sources
      ? {
          source: Object.fromEntries(
            sources.map((sourceType) => [
              sourceType,
              createSourceOperations(basePath, sourceType, nameTransform),
            ]),
          ),
        }
      : {}),

    // Conditionally add includes operations
    ...(includes
      ? {
          includes: {
            // Generic get/put for any include type
            get: (name: string, includeType: string) =>
              http.get(
                `${basePath}/${nameTransform(name)}/includes/${includeType}`,
                {
                  responses: { 200: undefined as unknown as string },
                  headers: { Accept: 'text/plain' },
                },
              ),
            put: (
              name: string,
              includeType: string,
              options?: SourcePutOptions,
            ) =>
              http.put(
                `${basePath}/${nameTransform(name)}/includes/${includeType}`,
                {
                  body: undefined as unknown as string,
                  responses: { 200: undefined as unknown as string },
                  headers: {
                    Accept: 'text/plain',
                    'Content-Type': 'text/plain',
                  },
                  query: {
                    ...(options?.lockHandle
                      ? { lockHandle: options.lockHandle }
                      : {}),
                    ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
                  },
                },
              ),
            // Shorthand accessors for each include type
            ...Object.fromEntries(
              includes.map((includeType) => [
                includeType,
                createIncludeOperations(basePath, includeType, nameTransform),
              ]),
            ),
          },
        }
      : {}),
  } as CrudContract<S, Sources, Includes>;
}

/**
 * Shorthand alias for crud()
 *
 * @example
 * ```ts
 * export const classesContract = repo('/sap/bc/adt/oo/classes', classes, 'application/vnd.sap.adt.oo.classes.v4+xml');
 * ```
 */
export function repo<S extends Serializable<unknown>>(
  basePath: string,
  schema: S,
  contentType: string,
  nameTransform?: (name: string) => string,
  accept?: string,
): CrudContract<S> {
  return crud({ basePath, schema, contentType, accept, nameTransform });
}
