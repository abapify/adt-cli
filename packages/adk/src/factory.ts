/**
 * ADK v2 - Generic Factory
 *
 * Single entry point for creating ADK objects.
 * Resolves ADT types to correct ADK object implementations.
 *
 * Resolution methods:
 * - get(name, adtType) - By name and ADT type (unique identifier)
 * - byKind(kind, name) - By ADK kind (type-safe)
 * - fromXml(xml) - Parse from XML response
 * - create(adtType) - Create new object (deferred)
 */

import type { AdkContext } from './base/context';
import type { AdkObject } from './base/model';
import type { AdkKind, AdkObjectForKind } from './base/kinds';
import { resolveType, resolveKind, parseAdtType } from './base/registry';

// ============================================
// XML Parsing Utilities
// ============================================

/** Pattern to extract adtcore:type from XML */
const TYPE_PATTERN = /adtcore:type="([^"]+)"/;

/** Pattern to extract adtcore:name from XML */
const NAME_PATTERN = /adtcore:name="([^"]+)"/;

/**
 * Extract ADT type and name from XML
 *
 * Relies on adtcore:type and adtcore:name attributes which are
 * the standard identifiers in ADT XML responses.
 *
 * @param xml - XML string from ADT response
 * @returns Extracted type and name, or undefined if not found
 */
export function parseXmlIdentity(
  xml: string,
): { type: string; name: string } | undefined {
  const typeMatch = xml.match(TYPE_PATTERN);
  const nameMatch = xml.match(NAME_PATTERN);

  if (typeMatch && nameMatch) {
    return {
      type: typeMatch[1],
      name: nameMatch[1],
    };
  }

  return undefined;
}

// ============================================
// Generic Object (Fallback)
// ============================================

/**
 * Generic ADK object for unregistered types
 *
 * Provides core functionality (adtcore attributes, links)
 * without type-specific features.
 */
export class AdkGenericObject {
  readonly adtType: string;
  readonly adtMainType: string;
  readonly adtSubType?: string;

  protected readonly ctx: AdkContext;
  protected _name: string;
  protected _data?: unknown;

  constructor(ctx: AdkContext, name: string, adtType: string) {
    this.ctx = ctx;
    this._name = name;

    const parsed = parseAdtType(adtType);
    this.adtType = parsed.full;
    this.adtMainType = parsed.main;
    this.adtSubType = parsed.sub;
  }

  get name(): string {
    return this._name;
  }
  get type(): string {
    return this.adtType;
  }

  /** Check if data is loaded */
  get isLoaded(): boolean {
    return this._data !== undefined;
  }

  /** Get raw data (if loaded) */
  get data(): unknown {
    return this._data;
  }

  /** Set data (for manual population) */
  setData(data: unknown): void {
    this._data = data;
  }
}

// ============================================
// Factory Interface
// ============================================

/**
 * ADK Factory - Generic object creation
 */
export interface AdkFactory {
  /** Context used by this factory */
  readonly ctx: AdkContext;

  /**
   * Get object by name and ADT type
   *
   * Supports both full types (DEVC/K) and main types (DEVC).
   * Returns deferred object - call load() to fetch data.
   *
   * @example
   * const pkg = factory.get('ZPACKAGE', 'DEVC/K');
   * await pkg.load();
   *
   * const cls = factory.get('ZCL_TEST', 'CLAS');
   * await cls.load();
   */
  get(name: string, adtType: string): AdkObject | AdkGenericObject;

  /**
   * Get object with initial data (for deserialization)
   *
   * Creates object pre-populated with data - no load() needed.
   * Used when deserializing from files rather than loading from SAP.
   *
   * @example
   * const cls = factory.getWithData({ name: 'ZCL_TEST', description: 'Test' }, 'CLAS');
   * // cls.isLoaded is true, no need to call load()
   */
  getWithData(
    data: Record<string, unknown>,
    adtType: string,
  ): AdkObject | AdkGenericObject;

  /**
   * Get object by ADK kind (type-safe)
   *
   * Returns correctly typed object based on kind.
   * TypeScript infers the concrete return type from the kind parameter.
   *
   * @example
   * import { Class, Interface } from '@abapify/adk';
   * const cls = factory.byKind(Class, 'ZCL_TEST');     // → AdkClass
   * const intf = factory.byKind(Interface, 'ZIF_TEST'); // → AdkInterface
   */
  byKind<K extends AdkKind>(kind: K, name: string): AdkObjectForKind<K>;

  /**
   * Create object from XML response
   *
   * Parses XML to extract type and name, then constructs
   * the correct object type.
   *
   * @example
   * const xml = await client.fetch('/sap/bc/adt/oo/classes/ZCL_TEST');
   * const cls = factory.fromXml(xml);
   */
  fromXml(xml: string): AdkObject | AdkGenericObject | undefined;

  /**
   * Create new object (for creation workflows)
   *
   * Returns deferred object without name - used when
   * creating new objects in SAP.
   */
  create(adtType: string): AdkObject | AdkGenericObject;
}

// ============================================
// Factory Implementation
// ============================================

/**
 * Create ADK factory
 *
 * @param ctx - ADK context with services
 * @returns Factory instance
 */
export function createAdkFactory(ctx: AdkContext): AdkFactory {
  return {
    ctx,

    get(name: string, adtType: string): AdkObject | AdkGenericObject {
      const entry = resolveType(adtType);

      if (entry) {
        return new entry.constructor(ctx, name);
      }

      // Fallback to generic object
      return new AdkGenericObject(ctx, name, adtType);
    },

    getWithData(
      data: Record<string, unknown>,
      adtType: string,
    ): AdkObject | AdkGenericObject {
      const entry = resolveType(adtType);

      if (entry) {
        // Pass data directly to constructor - it will extract name from data.name
        return new entry.constructor(ctx, data);
      }

      // Fallback to generic object with name from data
      const obj = new AdkGenericObject(
        ctx,
        (data as { name?: string }).name ?? '',
        adtType,
      );
      obj.setData(data);
      return obj;
    },

    byKind<K extends AdkKind>(kind: K, name: string): AdkObjectForKind<K> {
      const entry = resolveKind(kind);

      if (!entry) {
        throw new Error(`No constructor registered for kind: ${kind}`);
      }

      // Type assertion: registry guarantees correct constructor for kind
      return new entry.constructor(ctx, name) as AdkObjectForKind<K>;
    },

    fromXml(xml: string): AdkObject | AdkGenericObject | undefined {
      const identity = parseXmlIdentity(xml);

      if (!identity) {
        return undefined;
      }

      return this.get(identity.name, identity.type);
    },

    create(adtType: string): AdkObject | AdkGenericObject {
      // Create with empty name - will be set during creation workflow
      return this.get('', adtType);
    },
  };
}

// ============================================
// Convenience: Create factory from ADT client
// ============================================

// Factory is the boundary - imports AdtClient directly from adt-client
import type { AdtClient } from '@abapify/adt-client';

/**
 * Create ADK factory from ADT client
 *
 * Builds context from client and returns factory.
 * This is the main entry point for most users.
 *
 * @example
 * import { createAdtClient } from '@abapify/adt-client';
 * import { createAdk } from '@abapify/adk';
 *
 * const client = createAdtClient({ ... });
 * const adk = createAdk(client);
 *
 * const cls = adk.get('ZCL_TEST', 'CLAS');
 * await cls.load();
 */
export function createAdk(client: AdtClient): AdkFactory {
  // Build context with client reference
  // Objects access client via ctx.client
  const ctx: AdkContext = {
    client,
  };

  return createAdkFactory(ctx);
}
